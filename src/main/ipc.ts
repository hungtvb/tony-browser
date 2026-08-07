// Đăng ký các IPC handler giữa renderer ↔ main
import { ipcMain, BrowserWindow, WebContentsView } from 'electron'
import { attachView, detachView, TOOLBAR_HEIGHT, createTabView } from './window'
import { createBlocklist } from './privacy/blocklist'
import { createUrlFilter, createCosmeticFilter } from './privacy/filters'
import { isYouTubeAdRequest, stripPlayerResponse } from './privacy/youtube'
import { createTabStacker, searchTabs } from './tabs/stacker'
import { computeSplitBounds } from './tabs/split'
import { createSessionStore } from './save/session-store'
import blocklistDomains from './privacy/blocklist.json'
import type { TabState, PrivacyStats, AIConfig, AIStatus, AIRequestParams } from '../shared/types'
import type { createTabManager } from './tabs/TabManager'
import { AIController } from './ai/controller'
import { FocusController } from './focus/controller'
import { SmartTabController } from './smarttab/controller'
import { SleeperController } from './perf/controller'

export interface IpcDeps {
  getWindow: () => BrowserWindow | null
  getTabManager: () => ReturnType<typeof createTabManager>
  trackView: (tabId: string, view: WebContentsView | null) => void
  getActiveView: (tabId: string) => WebContentsView | undefined
  createRealView: (url: string) => WebContentsView
}

// Privacy filter state
let privacyFilterOn = true
let blockedCount = 0
let listSize = 0

type TM = ReturnType<typeof createTabManager>

function tabToState(t: any): TabState {
  return { id: t.id, url: t.url, title: t.title, loading: t.loading, container: t.container ?? 'default' }
}

export function attachPrivacy(win: BrowserWindow, _deps: IpcDeps) {
  const { session } = win.webContents
  const bl = createBlocklist(blocklistDomains)
  const urlFilter = createUrlFilter()
  listSize = bl.size

  session.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, callback) => {
    if (privacyFilterOn && (bl.shouldBlock(details.url) || urlFilter.shouldBlock(details.url) || isYouTubeAdRequest(details.url))) {
      blockedCount++
      callback({ cancel: true })
    } else {
      callback({})
    }
  })

  // Bóc ads khỏi YouTube player response (filterResponseData sửa nội dung)
  session.webRequest.onBeforeRequest(
    { urls: ['*://*.youtube.com/youtubei/v1/player*', '*://*.youtube.com/youtubei/v1/next*'] },
    (details, callback) => {
      if (!privacyFilterOn) { callback({}); return }
      const filter = session.webRequest.filterResponseData(details.id)
      const chunks: Buffer[] = []
      filter.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
      filter.on('end', () => {
        try {
          const body = Buffer.concat(chunks).toString('utf-8')
          const stripped = stripPlayerResponse(body)
          filter.write(stripped ?? body)
        } catch { /* nếu lỗi giữ nguyên */ }
        filter.end()
      })
      filter.on('error', () => { try { filter.end() } catch { /* ignore */ } })
      callback({})
    },
  )
}

// Injectable cosmetic filter dùng trong trackView (mỗi tab mới)
export function createCosmeticInjector() {
  const cosmetic = createCosmeticFilter()
  return function attachToWebContents(wc: any) {
    if (!privacyFilterOn) return
    wc.on('dom-ready', () => {
      try { wc.executeJavaScript(cosmetic.injectScript()).catch(() => {}) } catch { /* ignore */ }
    })
  }
}

export function registerIpc(deps: IpcDeps) {
  const tm = deps.getTabManager()
  const win = deps.getWindow

  // ─── tabs ───
  ipcMain.handle('tabs:list', () => tm.list().map(tabToState))

  ipcMain.handle('tabs:open', (_e, url: string, container?: string) => {
    const tab = tm.open(url, container ?? 'default')
    // tạo view thật
    const view = deps.createRealView(tab.url)
    deps.trackView(tab.id, view)
    const w = win()
    if (w) attachView(w, view)
    broadcastTabs()
    return tabToState(tab)
  })

  ipcMain.handle('tabs:openContainer', (_e, url: string, container: string) => {
    const tab = tm.open(url, container)
    const view = deps.createRealView(tab.url)
    deps.trackView(tab.id, view)
    const w = win()
    if (w) attachView(w, view)
    broadcastTabs()
    return tabToState(tab)
  })

  // ─── reader ───
  ipcMain.handle('reader:extract', async (_e, tabId?: string) => {
    const view = tabId ? deps.getActiveView(tabId) : undefined
    if (!view) return { ok: false, error: 'Không có tab' }
    try {
      const html = (await view.webContents.executeJavaScript('document.documentElement.outerHTML')) as string
      const { extractArticle } = await import('./reader/extract')
      const article = extractArticle(html)
      return { ok: true, article }
    } catch (e: any) {
      return { ok: false, error: e?.message ?? 'Lỗi trích xuất' }
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
    if (tabBefore) {
      try { session.recordClosed({ id: tabBefore.id, url: tabBefore.url, title: tabBefore.title, container: tabBefore.container }) } catch {}
    }
    broadcastTabs()
    return true
  })

  // ─── pip ───
  ipcMain.handle('pip:start', async (_e, tabId?: string) => {
    const view = tabId ? deps.getActiveView(tabId) : undefined
    if (!view) return { ok: false, error: 'Không có tab' }
    try {
      const res = (await view.webContents.executeJavaScript(`
        (() => {
          const v = document.querySelector('video');
          if (!v) return { ok: false, error: 'Không tìm thấy video' };
          if (!('requestPictureInPicture' in v)) return { ok: false, error: 'Trình duyệt không hỗ trợ PiP' };
          v.requestPictureInPicture().then(() => {
            // xoá class khi video thoát PiP để tránh video ẩn
            v.removeAttribute('webkit-playsinline');
          }).catch(e => {});
          return { ok: true };
        })()
      `)) as { ok: boolean; error?: string }
      return res
    } catch (e: any) {
      return { ok: false, error: e?.message ?? 'Lỗi PiP' }
    }
  })

  ipcMain.handle('pip:stop', async (_e, tabId?: string) => {
    const view = tabId ? deps.getActiveView(tabId) : undefined
    if (!view) return { ok: false, error: 'Không có tab' }
    try {
      await view.webContents.executeJavaScript(`
        (() => {
          if (document.pictureInPictureElement) {
            document.exitPictureInPicture().catch(e => {});
            return { ok: true };
          }
          return { ok: false, error: 'Không có video PiP' };
        })()
      `)
      return { ok: true }
    } catch (e: any) {
      return { ok: false, error: e?.message ?? 'Lỗi thoát PiP' }
    }
  })

  ipcMain.handle('tabs:activate', (_e, id: string) => {
    tm.activate(id)
    // ẩn/hiện view theo active
    const w = win()
    if (w) {
      for (const tab of tm.list()) {
        const v = deps.getActiveView(tab.id)
        if (v) v.setVisible(tab.id === id)
      }
    }
    broadcastTabs()
    return true
  })

  // ─── stacker/search ───
  ipcMain.handle('tabs:stacks', () => {
    return createTabStacker().group(tm.list())
  })
  ipcMain.handle('tabs:search', (_e, query: string) => {
    return searchTabs(tm.list(), query)
  })

  // ─── split view ───
  let splitIds: string[] = []
  ipcMain.handle('tabs:split', (_e, aId: string, bId: string | null) => {
    const w = win()
    if (!w) return { ok: false }
    if (!bId) {
      // thoát split — hiện lại full view active
      splitIds = []
      const a = deps.getActiveView(aId)
      if (a) a.setBounds({ x: 0, y: TOOLBAR_HEIGHT, width: w.getContentSize()[0], height: Math.max(w.getContentSize()[1] - TOOLBAR_HEIGHT, 0) })
      return { ok: true }
    }
    splitIds = [aId, bId]
    const [wB, hB] = w.getContentSize()
    const [ba, bb] = computeSplitBounds(wB, hB, TOOLBAR_HEIGHT)
    const va = deps.getActiveView(aId)
    const vb = deps.getActiveView(bId)
    if (va) va.setBounds(ba)
    if (vb) { vb.setBounds(bb!); vb.setVisible(true) }
    return { ok: true }
  })
  ipcMain.handle('tabs:splitState', () => splitIds)

  // ─── save page + tts ───
  ipcMain.handle('tts:speak', async (_e, tabId?: string) => {
    const view = tabId ? deps.getActiveView(tabId) : undefined
    if (!view) return { ok: false, error: 'Không có tab' }
    try {
      const text = (await view.webContents.executeJavaScript(`
        (() => { const s = document.body ? document.body.innerText.slice(0, 4000) : ''; return s })()
      `)) as string
      if (!text.trim()) return { ok: false, error: 'Trang không có nội dung đọc' }
      return { ok: true, text: text.trim() }
    } catch (e: any) {
      return { ok: false, error: e?.message ?? 'Lỗi TTS' }
    }
  })
  ipcMain.handle('tts:stop', () => ({ ok: true }))

  // ─── session restore ───
  const session = createSessionStore()

  // record tab bị đóng để undo
  ipcMain.handle('tabs:recordClosed', (_e, tab: any) => {
    session.recordClosed({ id: tab.id, url: tab.url, title: tab.title, container: tab.container })
    return session.closedCount()
  })
  ipcMain.handle('tabs:undoClose', () => session.popClosed())
  ipcMain.handle('tabs:closedCount', () => session.closedCount())
  // snapshot session hiện tại
  ipcMain.handle('session:save', () => {
    session.saveSession(tm.list().map(t => ({ id: t.id, url: t.url, title: t.title, container: t.container })))
    return true
  })
  ipcMain.handle('session:restore', () => session.restoreSession())

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
  const focus = new FocusController()
  ipcMain.handle('focus:state', () => focus.getState())
  ipcMain.handle('focus:toggle', (_e, on: boolean) => { focus.setEnabled(on); return focus.getState() })
  ipcMain.handle('focus:setBlocklist', (_e, list: string[]) => { focus.setBlocklist(list); return focus.getState() })
  ipcMain.handle('focus:setWhitelist', (_e, list: string[]) => { focus.setWhitelist(list); return focus.getState() })

  // ─── smarttab ───
  const smart = new SmartTabController()
  ipcMain.handle('smarttab:groups', (_e, mode: 'domain' | 'theme') => {
    const tabs = tm.list()
    return mode === 'theme' ? smart.groupByTheme(tabs) : smart.groupByDomain(tabs)
  })
  ipcMain.handle('smarttab:saveSession', (_e, name?: string) => smart.saveSession(tm.list(), name))
  ipcMain.handle('smarttab:sessions', () => smart.listSessions())
  ipcMain.handle('smarttab:restoreSession', (_e, name: string) => smart.restoreSession(name))

  // ─── sleeper ───
  const sleeper = new SleeperController()
  ipcMain.handle('sleeper:evaluate', () => {
    return sleeper.evaluate(tm.list(), tm.activeId, [], undefined, (id) => {
      const view = deps.getActiveView(id)
      if (view && !view.webContents.isDestroyed()) {
        try { view.webContents.setBackgroundThrottling(true) } catch {}
      }
    })
  })
  ipcMain.handle('sleeper:activity', (_e, id: string) => sleeper.recordActivity(id))

  // helper broadcast — dùng webContents send của window
  function broadcastTabs() {
    const w = win()
    if (w && !w.webContents.isDestroyed()) {
      w.webContents.send('tabs:changed', tm.list().map(tabToState))
    }
  }
  tm.on('changed', broadcastTabs)

  return { broadcastTabs }
}

export { blocklistDomains, TOOLBAR_HEIGHT }