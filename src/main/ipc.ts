// Register IPC handlers between renderer ↔ main
import { ipcMain, BrowserWindow, WebContentsView, app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { attachView, detachView, TOOLBAR_HEIGHT, createTabView } from './window'
import { createBlocklist } from './privacy/blocklist'
import { createUrlFilter, createCosmeticFilter } from './privacy/filters'
import { sanitizeHeaders } from './privacy/headers'
import { isYouTubeAdRequest, stripPlayerResponse } from './privacy/youtube'
import { createTabStacker, searchTabs } from './tabs/stacker'
import { computeSplitBounds } from './tabs/split'
import { createSessionStore, createSessionPersist, type SessionTab } from './save/session-store'
import { createCollection } from './save/collection'
import blocklistDomains from './privacy/blocklist.json'
import type { TabState, PrivacyStats, AIConfig, AIStatus, AIRequestParams, TabSessionInfo } from '../shared/types'
import type { createTabManager } from './tabs/TabManager'
import { AIController } from './ai/controller'
import { FocusController } from './focus/controller'
import { createFocusBlocker, type FocusBlocker } from './focus/blocker'
import { SmartTabController } from './smarttab/controller'
import { SleeperController } from './perf/controller'
import { DEFAULT_HEAVY_MEMORY_MB } from './perf/sleeper'
// Issue #121 — hidden-window perf: skip per-tab memory sampling (getAppMetrics walk)
// while the window is hidden/minimized — wasted work the user isn't looking at.
import { isWindowHidden } from '../shared/perf-visibility'

export interface IpcDeps {
  getWindow: () => BrowserWindow | null
  getTabManager: () => ReturnType<typeof createTabManager>
  trackView: (tabId: string, view: WebContentsView | null) => void
  getActiveView: (tabId: string) => WebContentsView | undefined
  createRealView: (url: string, container?: string) => WebContentsView
  /** re-layout every view per the window size + current split state (index.ts) */
  layoutViews: () => void
  /** read/write split state (index.ts owns the source state; ipc is the only writer) */
  getSplitIds: () => string[]
  setSplitIds: (ids: string[]) => void
  /** Shared FocusController — attachPrivacy blocking requests + registerIpc exposing IPC must use the same instance */
  getFocus: () => FocusController
}

// Privacy filter state — shared by EVERY session (default + container)
let privacyFilterOn = true
let blockedCount = 0
let listSize = 0

// Issue #120 — event-driven privacy stats: instead of the renderer polling
// `privacy:stats` every 3s (IPC round-trip even when nothing was blocked),
// main pushes a throttled 'privacy:stats' event only when a request is blocked.
const STATS_THROTTLE_MS = 1000
let statsBroadcast: (() => void) | undefined
let statsTimer: ReturnType<typeof setTimeout> | undefined
let lastStatsEmit = 0

function pushPrivacyStats() {
  lastStatsEmit = Date.now()
  statsBroadcast?.()
}

/** Fire (or schedule, throttled to 1/s) a privacy:stats push after a block. */
export function schedulePrivacyStats() {
  const wait = STATS_THROTTLE_MS - (Date.now() - lastStatsEmit)
  if (wait <= 0) {
    if (statsTimer) { clearTimeout(statsTimer); statsTimer = undefined }
    pushPrivacyStats()
  } else if (!statsTimer) {
    statsTimer = setTimeout(() => {
      statsTimer = undefined
      pushPrivacyStats()
    }, wait)
  }
}

/** Test-only: clear broadcast wiring + throttle state between tests. */
export function resetPrivacyStatsBroadcast() {
  if (statsTimer) { clearTimeout(statsTimer); statsTimer = undefined }
  statsBroadcast = undefined
  lastStatsEmit = 0
}

/** sessions that already have a webRequest filter — avoid attaching twice (defaultSession goes through both attachPrivacy and createTabView) */
const attachedSessions = new Set<Electron.Session>()

/** shared FocusController source — registered by attachPrivacy so createTabView (container) can also block Focus Mode */
let focusProvider: (() => FocusController | null) | undefined

type TM = ReturnType<typeof createTabManager>

function tabToState(t: any): TabState {
  return { id: t.id, url: t.url, title: t.title, loading: t.loading, container: t.container ?? 'default', favicon: t.favicon }
}

/**
 * Attach a webRequest filter (adblock + urlFilter + YouTube ad-strip + Focus Mode) to any session.
 * Shared by defaultSession (attachPrivacy) and container-partitioned sessions (createTabView).
 * The guard Set ensures each session is attached exactly once.
 */
export function attachWebRequestFilters(ses: Electron.Session, getFocus?: () => FocusController | null) {
  if (attachedSessions.has(ses)) return
  attachedSessions.add(ses)

  const provider = getFocus ?? focusProvider
  const bl = createBlocklist(blocklistDomains)
  const urlFilter = createUrlFilter()

  // Focus Mode — separate block decision (own counter, not mixed with adblock)
  const focusBlocker: FocusBlocker = createFocusBlocker({ blocklist: provider?.()?.getState().blocklist ?? [] })

  ses.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, callback) => {
    let blocked = false
    if (privacyFilterOn && (bl.shouldBlock(details.url) || urlFilter.shouldBlock(details.url) || isYouTubeAdRequest(details.url))) {
      blockedCount++
      blocked = true
      // Issue #120 — event-driven stats: push a throttled update on every block
      // (renderer no longer polls privacy:stats every 3s).
      schedulePrivacyStats()
    }
    // Focus Mode — block distracting sites (state synced with the shared controller)
    const focus = provider?.()
    if (focus) {
      focusBlocker.setEnabled(focus.enabled)
      focusBlocker.setBlocklist(focus.getState().blocklist)
      focusBlocker.setWhitelist(focus.getState().whitelist)
      if (!blocked && focusBlocker.isFocusBlocked(details.url)) {
        focus.incrementBlocked()
        callback({ cancel: true })
        return
      }
    }
    if (blocked) {
      callback({ cancel: true })
    } else {
      callback({})
    }
  })

  // Fingerprinting protection (issue #123): strip/replace high-entropy request headers
  // (User-Agent platform, Sec-CH-UA client hints, Accept-Language) on every request.
  // Gated by the same privacy toggle as adblock — off → original headers pass through.
  ses.webRequest.onBeforeSendHeaders({ urls: ['*://*/*'] }, (details, callback) => {
    if (!privacyFilterOn) {
      callback({ requestHeaders: details.requestHeaders })
      return
    }
    callback({ requestHeaders: sanitizeHeaders(details.requestHeaders) })
  })

  // Strip ads from the YouTube player response (filterResponseData rewrites the body)
  ses.webRequest.onBeforeRequest(
    { urls: ['*://*.youtube.com/youtubei/v1/player*', '*://*.youtube.com/youtubei/v1/next*'] },
    (details, callback) => {
      if (!privacyFilterOn) { callback({}); return }
      const filter = ses.webRequest.filterResponseData(details.id)
      const chunks: Buffer[] = []
      filter.on('data', (chunk: Buffer | Uint8Array) => chunks.push(Buffer.from(chunk)))
      filter.on('end', () => {
        try {
          const body = Buffer.concat(chunks).toString('utf-8')
          const stripped = stripPlayerResponse(body)
          filter.write(stripped ?? body)
        } catch { /* keep the original body on error */ }
        filter.end()
      })
      filter.on('error', () => { try { filter.end() } catch { /* ignore */ } })
      callback({})
    },
  )
}

export function attachPrivacy(win: BrowserWindow, _deps: IpcDeps, getFocus?: () => FocusController | null) {
  const { session } = win.webContents
  listSize = createBlocklist(blocklistDomains).size
  // Issue #120 — register the privacy:stats broadcast target (the main window).
  // Container-session blocks share the same counter and reach the same window.
  statsBroadcast = () => {
    if (!win.webContents.isDestroyed()) {
      win.webContents.send('privacy:stats', { blocked: blockedCount, listSize })
    }
  }
  // register the shared FocusController source — createTabView's attach for containers uses it too
  focusProvider = getFocus
  attachWebRequestFilters(session, getFocus)
}

// Injectable cosmetic filter used in trackView (each new tab)
export function createCosmeticInjector() {
  const cosmetic = createCosmeticFilter()
  return function attachToWebContents(wc: any) {
    if (!privacyFilterOn) return
    wc.on('dom-ready', () => {
      try { wc.executeJavaScript(cosmetic.injectScript()).catch(() => {}) } catch { /* ignore */ }
    })
  }
}

export function registerIpc(deps: IpcDeps, opts?: { smartPersistFile?: string; undoPersistFile?: string }) {
  const tm = deps.getTabManager()
  const win = deps.getWindow

  // ─── smarttab persist (disk) ───
  const smartPersist = opts?.smartPersistFile
    ? createSessionPersist<TabSessionInfo>(opts.smartPersistFile)
    : undefined

  // ─── undo-close persist (disk) — closed-tab stack survives restarts ───
  const undoPersist = opts?.undoPersistFile
    ? createSessionPersist<SessionTab>(opts.undoPersistFile)
    : undefined

  // ─── tabs ───
  ipcMain.handle('tabs:list', () => tm.list().map(tabToState))

  ipcMain.handle('tabs:open', (_e, url: string, container?: string, favicon?: string) => {
    const tab = tm.open(url, container ?? 'default', favicon)
    // create the real view
    const view = deps.createRealView(tab.url, tab.container)
    deps.trackView(tab.id, view)
    const w = win()
    if (w) {
      attachView(w, view)
      layoutAfterChange()
    }
    broadcastTabs()
    return tabToState(tab)
  })

  ipcMain.handle('tabs:openContainer', (_e, url: string, container: string) => {
    const tab = tm.open(url, container)
    const view = deps.createRealView(tab.url, tab.container)
    deps.trackView(tab.id, view)
    const w = win()
    if (w) {
      attachView(w, view)
      layoutAfterChange()
    }
    broadcastTabs()
    return tabToState(tab)
  })

  // ─── reader ───
  ipcMain.handle('reader:extract', async (_e, tabId?: string) => {
    const view = tabId ? deps.getActiveView(tabId) : undefined
    if (!view) return { ok: false, error: 'No tab' }
    try {
      // In-page extraction (issue #55): run the extractor inside the page and
      // return only the article payload — no full-page HTML over IPC.
      const { buildExtractScript } = await import('./reader/inject')
      const json = (await view.webContents.executeJavaScript(buildExtractScript())) as string
      const article = JSON.parse(json) as { title: string; content: string; length: number }
      return { ok: true, article }
    } catch (e: any) {
      return { ok: false, error: e?.message ?? 'Extraction error' }
    }
  })

  ipcMain.handle('tabs:close', (_e, id: string) => {
    const view = deps.getActiveView(id)
    const tabBefore = tm.get(id)
    if (view) {
      const w = win()
      if (w) detachView(w, view)
      if (!view.webContents.isDestroyed()) view.webContents.close()
      deps.trackView(id, null)
    }
    tm.close(id)
    // exit split if one of the two split tabs is closed — prevent layoutViews from computing a split with a dead id
    const cur = deps.getSplitIds()
    if (cur.includes(id)) {
      deps.setSplitIds(cur.filter(x => x !== id))
    }
    if (tabBefore) {
      try {
        session.recordClosed({
          id: tabBefore.id, url: tabBefore.url, title: tabBefore.title,
          container: tabBefore.container, favicon: tabBefore.favicon,
        })
      } catch {}
    }
    deps.layoutViews()
    broadcastTabs()
    return true
  })

  // ─── pip ───
  ipcMain.handle('pip:start', async (_e, tabId?: string) => {
    const view = tabId ? deps.getActiveView(tabId) : undefined
    if (!view) return { ok: false, error: 'No tab' }
    try {
      const res = (await view.webContents.executeJavaScript(`
        (() => {
          const v = document.querySelector('video');
          if (!v) return { ok: false, error: 'Video not found' };
          if (!('requestPictureInPicture' in v)) return { ok: false, error: 'Browser does not support PiP' };
          v.requestPictureInPicture().then(() => {
            // remove the attribute when the video exits PiP so it does not stay hidden
            v.removeAttribute('webkit-playsinline');
          }).catch(e => {});
          return { ok: true };
        })()
      `)) as { ok: boolean; error?: string }
      return res
    } catch (e: any) {
      return { ok: false, error: e?.message ?? 'PiP error' }
    }
  })

  ipcMain.handle('pip:stop', async (_e, tabId?: string) => {
    const view = tabId ? deps.getActiveView(tabId) : undefined
    if (!view) return { ok: false, error: 'No tab' }
    try {
      const res = (await view.webContents.executeJavaScript(`
        (() => {
          if (document.pictureInPictureElement) {
            document.exitPictureInPicture().catch(e => {});
            return { ok: true };
          }
          return { ok: false, error: 'No PiP video' };
        })()
      `)) as { ok: boolean; error?: string }
      return res
    } catch (e: any) {
      return { ok: false, error: e?.message ?? 'Exit PiP error' }
    }
  })

  ipcMain.handle('tabs:reorder', (_e, fromId: string, toId: string) => {
    // Issue #125 — sidebar drag & drop reorder. No-op for unknown/equal ids;
    // keep view z-order in sync with the new tab order + broadcast once.
    const ok = tm.reorder(fromId, toId)
    if (ok) {
      deps.layoutViews()
      broadcastTabs()
    }
    return ok
  })

  ipcMain.handle('tabs:activate', (_e, id: string) => {
    tm.activate(id)
    // Issue #82: a restored tab (2..N) already has a live view in viewByTab that was never
    // added as a child of the window (the restore path only attached the first tab's view) —
    // defensively re-attach it so the tab displays instead of a blank content area.
    // Also covers any future lazy-attach path where a tracked view is not a window child.
    const activeView = deps.getActiveView(id)
    const winNow = win()
    if (activeView && !activeView.webContents.isDestroyed() && winNow && !winNow.isDestroyed()) {
      const children = winNow.contentView.children as readonly unknown[]
      if (!children.includes(activeView)) attachView(winNow, activeView)
    }
    // wake the tab if sleeping (TabSleeper). Tier-2 tabs had their view closed on sleep →
    // rebuild + reload original url. Tier-1 tabs kept a throttled renderer alive → just
    // restore it (unmute, normal fps, throttling off) — instant wake, no reload.
    // Also wake while teardown is still pending: the activation must not be silently dropped (race guard).
    if (sleeper.isSleeping(id) || sleeper.isPendingSleep(id)) {
      sleeper.wake(id, (wid) => {
        const wv = deps.getActiveView(wid)
        if (wv && !wv.webContents.isDestroyed()) {
          // Tier-1 wake — restore the throttled renderer (muted + 1 fps from sleep)
          try { wv.webContents.setBackgroundThrottling(false) } catch {}
          try { wv.webContents.setAudioMuted(false) } catch {}
          try { wv.webContents.setFrameRate(60) } catch {}
        } else {
          // view was closed on sleep (RAM freed) → rebuild from the original url
          const tab = tm.get(wid)
          if (tab) {
            try {
              // pass the container through intact — waking a container tab must rebuild the view in the
              // SAME partition (persist:container-*) not defaultSession (review warning 1)
              const view = deps.createRealView(tab.url, tab.container)
              deps.trackView(wid, view)
              const w = win()
              if (w && !w.isDestroyed()) attachView(w, view)
            } catch (err) {
              // recreate failed (e.g. webContents not ready) — layoutViews cannot recover a tab with no
              // view in viewByTab; log + requeue so the next tabs:activate retries the recreate
              console.warn('[sleeper] recreate view failed for tab', wid, err)
              sleeper.requeueSleep(wid)
            }
          }
        }
      })
    }
    // show/hide views by active tab — the centralized layout also updates bounds/visibility
    deps.layoutViews()
    broadcastTabs()
    return true
  })

  // ─── navigation controls (issue #41) ───
  // act on the ACTIVE tab view; navState lets the renderer disable buttons at history edges
  ipcMain.handle('tabs:goBack', () => {
    const view = deps.getActiveView(tm.activeId)
    if (!view || view.webContents.isDestroyed()) return false
    if (!view.webContents.canGoBack()) return false
    view.webContents.goBack()
    return true
  })

  ipcMain.handle('tabs:goForward', () => {
    const view = deps.getActiveView(tm.activeId)
    if (!view || view.webContents.isDestroyed()) return false
    if (!view.webContents.canGoForward()) return false
    view.webContents.goForward()
    return true
  })

  ipcMain.handle('tabs:reload', () => {
    const view = deps.getActiveView(tm.activeId)
    if (!view || view.webContents.isDestroyed()) return false
    view.webContents.reload()
    return true
  })

  ipcMain.handle('tabs:navState', () => {
    const view = deps.getActiveView(tm.activeId)
    if (!view || view.webContents.isDestroyed()) {
      return { canGoBack: false, canGoForward: false, isLoading: false }
    }
    return {
      canGoBack: view.webContents.canGoBack(),
      canGoForward: view.webContents.canGoForward(),
      isLoading: view.webContents.isLoading(),
    }
  })

  // ─── stacker/search ───
  ipcMain.handle('tabs:stacks', () => {
    return createTabStacker().group(tm.list())
  })
  ipcMain.handle('tabs:search', (_e, query: string) => {
    return searchTabs(tm.list(), query)
  })

  // ─── split view ───
  // split state owned by index.ts (what layoutViews reads) — ipc only changes it via the setter
  const setSplit = (ids: string[]) => deps.setSplitIds(ids)
  ipcMain.handle('tabs:split', (_e, aId: string, bId: string | null) => {
    const w = win()
    if (!w) return { ok: false }
    if (!bId) {
      // exit split — re-layout the active view full
      setSplit([])
      deps.layoutViews()
      return { ok: true }
    }
    setSplit([aId, bId])
    deps.layoutViews()
    return { ok: true }
  })
  ipcMain.handle('tabs:splitState', () => deps.getSplitIds())

  // ─── save page + tts ───
  ipcMain.handle('tts:speak', async (_e, tabId?: string) => {
    const view = tabId ? deps.getActiveView(tabId) : undefined
    if (!view) return { ok: false, error: 'No tab' }
    try {
      const text = (await view.webContents.executeJavaScript(`
        (() => { const s = document.body ? document.body.innerText.slice(0, 4000) : ''; return s })()
      `)) as string
      if (!text.trim()) return { ok: false, error: 'Page has no readable content' }
      return { ok: true, text: text.trim() }
    } catch (e: any) {
      return { ok: false, error: e?.message ?? 'TTS error' }
    }
  })
  ipcMain.handle('tts:stop', () => ({ ok: true }))

  // ─── session restore ───
  const session = createSessionStore(undoPersist)

  // record the closed tab for undo
  ipcMain.handle('tabs:undoClose', () => session.popClosed())
  ipcMain.handle('tabs:closedCount', () => session.closedCount())

  // ─── save page collection (fix #57) ───
  // the "Save page" button used to only toast success — nothing was persisted.
  // collection.ts existed with tests but was never imported; wire it now: module
  // instance + JSON file in userData (same pattern as saveSessionToDisk in index.ts),
  // loaded at boot so previously saved pages survive restarts.
  const collection = createCollection()
  function collectionFile() {
    return path.join(app.getPath('userData'), 'collection.json')
  }
  function loadCollectionFromDisk() {
    try {
      const json = fs.readFileSync(collectionFile(), 'utf-8')
      collection.load(json)
    } catch { /* no collection file yet — start empty */ }
  }
  function persistCollection() {
    try {
      fs.mkdirSync(path.dirname(collectionFile()), { recursive: true })
      fs.writeFileSync(collectionFile(), collection.save(), 'utf-8')
    } catch { /* disk write failed — keep in-memory copy */ }
  }
  loadCollectionFromDisk()
  ipcMain.handle('save:page', (_e, url: string, title: string, container?: string) => {
    const saved = collection.add(url, title, container ?? 'default')
    persistCollection()
    return saved
  })
  ipcMain.handle('save:list', () => collection.list())
  ipcMain.handle('save:remove', (_e, id: string) => {
    collection.remove(id)
    persistCollection()
    return true
  })

  // ─── privacy ───
  ipcMain.handle('privacy:stats', (): PrivacyStats => ({ blocked: blockedCount, listSize }))
  ipcMain.handle('privacy:toggle', (_e, on: boolean) => { privacyFilterOn = on; return on })

  // ─── ai ───
  const ai = new AIController(deps)
  ipcMain.handle('ai:config', () => ai.getConfig())
  ipcMain.handle('ai:saveConfig', (_e, cfg: AIConfig) => ai.saveConfig(cfg))
  ipcMain.handle('ai:status', (): AIStatus => ai.status())
  ipcMain.handle('ai:ask', async (_e, params: AIRequestParams) => {
    const text = await ai.ask(params)
    return { text }
  })

  // ─── focus ───
  const focus = deps.getFocus()
  ipcMain.handle('focus:state', () => ({ ...focus.getState(), blocked: focus.getBlockedCount() }))
  ipcMain.handle('focus:toggle', (_e, on: boolean) => { focus.setEnabled(on); return { ...focus.getState(), blocked: focus.getBlockedCount() } })
  ipcMain.handle('focus:setBlocklist', (_e, list: string[]) => { focus.setBlocklist(list); return { ...focus.getState(), blocked: focus.getBlockedCount() } })
  ipcMain.handle('focus:setWhitelist', (_e, list: string[]) => { focus.setWhitelist(list); return { ...focus.getState(), blocked: focus.getBlockedCount() } })

  // ─── smarttab ───
  const smart = new SmartTabController(smartPersist)
  ipcMain.handle('smarttab:groups', (_e, mode: 'domain' | 'theme') => {
    const tabs = tm.list()
    return mode === 'theme' ? smart.groupByTheme(tabs) : smart.groupByDomain(tabs)
  })
  ipcMain.handle('smarttab:saveSession', (_e, name?: string) => smart.saveSession(tm.list(), name))
  ipcMain.handle('smarttab:sessions', () => smart.listSessions())
  ipcMain.handle('smarttab:restoreSession', (_e, name: string) => smart.restoreSession(name))

  // ─── sleeper ───
  const sleeper = new SleeperController()
  // Issue #72 — track the warned-tab id set across evaluate runs; when it CHANGES
  // (empty → non-empty, set changes, non-empty → empty) push a proactive
  // 'sleeper:warnings' event so the renderer can highlight heavy tabs + toast
  // instead of relying on polling-only. No event when the set is unchanged.
  let warnedIds = new Set<string>()
  ipcMain.handle('sleeper:evaluate', async () => {
    // Issue #121 — hidden-window guard: while the window exists but is
    // hidden/minimized, skip the per-tab memory sampling (getAppMetrics) walk
    // entirely — wasted work the user isn't looking at, and the heavy-tab
    // warning only matters while visible (the renderer also polls 3x slower
    // while hidden). No window at all → run the normal path.
    const hiddenWin = deps.getWindow()
    if (hiddenWin && isWindowHidden(hiddenWin)) {
      return { sleeping: sleeper.sleepingCount(), warnings: [] }
    }
    // feed real per-tab memory into the controller so the heavy-tab RAM warning can fire (fix #68)
    const tabs = tm.list()
    const views = await Promise.all(tabs.map(async (t) => {
      const v = deps.getActiveView(t.id)
      let memoryMB = 0
      if (v && !v.webContents.isDestroyed()) {
        try {
          // Electron 31: WebContents has no per-content getProcessMemoryInfo; use the OS pid
          // of the renderer against app.getAppMetrics() (pid → memory.workingSetSize, KB of RAM)
          const pid = v.webContents.getOSProcessId()
          const metric = app.getAppMetrics().find(m => m.pid === pid)
          memoryMB = metric ? Math.round(metric.memory.workingSetSize / 1024) : 0
        } catch {
          // view mid-teardown — treat as 0 (no warning)
        }
      }
      return { id: t.id, memoryMB }
    }))
    // pass a live getter for activeId so the controller re-validates after the async
    // onSleep (a tab activated mid-teardown must not be marked sleeping — race guard)
    // Issue #119 — tiered sleep: LIGHT idle tabs get Tier 1 (throttle: muted + 1 fps,
    // renderer kept alive → wake is instant, no reload); HEAVY tabs (> heavyMemoryMB)
    // get Tier 2 (close() the renderer to really free RAM — wake rebuilds from URL).
    const memoryByTab = new Map(views.map(v => [v.id, v.memoryMB]))
    const result = await sleeper.evaluate(tabs, () => tm.activeId, [], views, async (id) => {
      // race guard: never close the view of the tab that just became active
      if (id === tm.activeId) return
      const view = deps.getActiveView(id)
      if (view && !view.webContents.isDestroyed()) {
        if ((memoryByTab.get(id) ?? 0) <= DEFAULT_HEAVY_MEMORY_MB) {
          // Tier 1 — cheap throttle: stop rendering/audio work but keep the renderer
          // alive, so waking the tab is instant and keeps URL/scroll/JS state.
          try { view.webContents.setBackgroundThrottling(true) } catch { /* mid-teardown — ignore */ }
          try { view.webContents.setAudioMuted(true) } catch { /* ignore */ }
          try { view.webContents.setFrameRate(1) } catch { /* ignore */ }
          return
        }
        // Tier 2 — heavy tab: Electron 31 has no webContents.discard() → close() the
        // renderer to really free RAM, untrack the view (wake rebuilds it from the
        // original url). detach BEFORE close — like tabs:close, so a destroyed view is
        // never left as a contentView child (review warning 2)
        const w = win()
        if (w) detachView(w, view)
        let closed = false
        try { view.webContents.close({ waitForBeforeUnload: false }); closed = true } catch {
          try { view.webContents.close(); closed = true } catch { /* both close attempts failed */ }
        }
        if (closed) {
          deps.trackView(id, null)
        } else if (w && !w.isDestroyed()) {
          // close failed on both attempts — the view is detached but alive: re-attach it so
          // the tab stays visible instead of lingering as an invisible detached view (review suggestion)
          attachView(w, view)
        }
      }
    })
    // Issue #72 — emit only on warned-set transitions (dedupe identical runs)
    const warned = new Set(result.warnings)
    const changed = warned.size !== warnedIds.size
      || [...warned].some((id) => !warnedIds.has(id))
      || [...warnedIds].some((id) => !warned.has(id))
    if (changed) {
      warnedIds = warned
      const w = win()
      if (w && !w.webContents.isDestroyed()) w.webContents.send('sleeper:warnings', [...warned])
    }
    return result
  })
  ipcMain.handle('sleeper:activity', (_e, id: string) => sleeper.recordActivity(id))

  // broadcast helper — uses the window's webContents.send
  function broadcastTabs() {
    const w = win()
    if (w && !w.webContents.isDestroyed()) {
      w.webContents.send('tabs:changed', tm.list().map(tabToState))
    }
  }
  // layout after the view count changed (tab opened) — attachView already set bounds once,
  // call again so every view (including split) gets consistent bounds from the centralized layout
  function layoutAfterChange() {
    try { deps.layoutViews() } catch { /* view not ready yet — ignore */ }
  }
  tm.on('changed', broadcastTabs)

  return { broadcastTabs }
}

export { blocklistDomains, TOOLBAR_HEIGHT }