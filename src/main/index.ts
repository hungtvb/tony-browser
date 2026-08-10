// Tony Browser — Electron main process
import { app, BrowserWindow, WebContentsView } from 'electron'
import { createMainWindow, ensureSession, createTabView, attachView, TOOLBAR_HEIGHT } from './window'
import { planLayout } from './tabs/layout'
import { attachFaviconEvents } from './tabs/faviconEvents'
import { attachViewEvents } from './tabs/viewEvents'
import { createTabManager } from './tabs/TabManager'
import { registerIpc, attachPrivacy, createCosmeticInjector, type IpcDeps } from './ipc'
import { FocusController } from './focus/controller'
import { loadFocusState } from './focus/store'
import { openRestoredTabs } from './save/session-restore'
import * as fs from 'fs'
import * as path from 'path'

let mainWindow: BrowserWindow | null = null
const viewByTab = new Map<string, WebContentsView>()
const attachCosmetic = createCosmeticInjector()
// current split state — registerIpc updates it via the setter (not exported directly)
let splitIds: string[] = []
export function setSplitIds(ids: string[]) {
  splitIds = ids
}
export function getSplitIds(): string[] {
  return splitIds
}

// Re-layout every visible view according to the current window size
// (used on resize + after entering/exiting split + opening/closing tabs)
export function layoutViews() {
  const win = mainWindow
  if (!win || win.isDestroyed()) return
  const [w, h] = win.getContentSize()
  const plan = planLayout(
    tm.list().map(t => t.id),
    splitIds,
    tm.activeId,
    w,
    h,
    TOOLBAR_HEIGHT,
  )
  for (const item of plan) {
    const v = viewByTab.get(item.id)
    if (!v || v.webContents.isDestroyed()) continue
    v.setBounds(item.bounds)
    v.setVisible(item.visible)
  }
}

// session file path (hand-written JSON store, avoids ESM-only deps)
function sessionFile() {
  return path.join(app.getPath('userData'), 'session.json')
}

function smartTabSessionsFile() {
  return path.join(app.getPath('userData'), 'smarttab-sessions.json')
}

function saveSessionToDisk(tabs: { url: string; title: string; container?: string; favicon?: string }[]) {
  try {
    fs.writeFileSync(sessionFile(), JSON.stringify(tabs), 'utf-8')
  } catch { /* ignore */ }
}

function loadSessionFromDisk() {
  try {
    return JSON.parse(fs.readFileSync(sessionFile(), 'utf-8')) as { url: string; title: string; container?: string; favicon?: string }[]
  } catch { return [] }
}

const tm = createTabManager(() => ({
  id: '',
  loadURL: () => {},
  destroy: () => {},
}))

// Track a tab view: keep viewByTab fresh + sync url/loading state from webContents events
// (issues #42/#43) — did-navigate updates the tab url, start/stop-loading updates isLoading.
function trackTabView(tabId: string, view: WebContentsView) {
  viewByTab.set(tabId, view)
  attachCosmetic(view.webContents)
  attachViewEvents(view, {
    onNavigated: (url) => {
      const t = tm.get(tabId)
      if (!t) return
      t.url = url
      tm.broadcast()
    },
    onLoading: (isLoading) => {
      const t = tm.get(tabId)
      if (!t) return
      t.loading = isLoading
      tm.broadcast()
    },
  })
  view.webContents.on('page-title-updated', (_e, title) => {
    const t = tm.get(tabId)
    if (t) { t.title = title; tm.broadcast() }
  })
  attachFaviconEvents(view.webContents, (favicon) => {
    const t = tm.get(tabId)
    if (!t) return
    t.favicon = favicon
    tm.broadcast()
  })
}

const deps: IpcDeps = {
  getWindow: () => mainWindow,
  getTabManager: () => tm,
  trackView: (tabId: string, view: WebContentsView | null) => {
    if (!view) { viewByTab.delete(tabId); return }
    trackTabView(tabId, view)
  },
  getActiveView: (tabId: string) => viewByTab.get(tabId),
  createRealView: (url: string, container?: string) => createTabView(url, container),
  layoutViews,
  getSplitIds,
  setSplitIds,
  getFocus: () => focusController,
}

// Shared FocusController: attachPrivacy really blocks requests + registerIpc exposes IPC
// (created at module scope so both reference the same instance — state seeded from disk)
const focusController = new FocusController(loadFocusState() ?? undefined)

app.whenReady().then(() => {
  ensureSession()
  // window.open/target=_blank from the UI → open a new tab via TabManager (no raw Electron window)
  function openTabInMain(url: string) {
    const tab = tm.open(url, 'default')
    const view = createTabView(url, 'default')
    trackTabView(tab.id, view)
    if (mainWindow) {
      attachView(mainWindow, view)
      layoutViews()
    }
    tm.broadcast()
  }
  mainWindow = createMainWindow(openTabInMain)
  attachPrivacy(mainWindow, deps, () => focusController)
  registerIpc(deps, {
    smartPersistFile: smartTabSessionsFile(),
    undoPersistFile: path.join(app.getPath('userData'), 'undo-close.json'),
  })

  // window resize → re-layout every view (full + split) to the new size
  mainWindow.on('resize', () => layoutViews())

  // restore the session from the previous run — reopen ALL saved tabs (no magic number cutoff)
  const saved = loadSessionFromDisk()
  if (saved.length > 0) {
    openRestoredTabs(saved, (s) => {
      const tab = tm.open(s.url, s.container ?? 'default', s.favicon)
      const view = createTabView(s.url, s.container ?? 'default')
      trackTabView(tab.id, view)
    })
    const w = BrowserWindow.getAllWindows()[0]
    if (w) {
      const first = tm.list()[0]
      if (first) {
        const v = viewByTab.get(first.id)
        if (v) {
          w.contentView.addChildView(v)
          layoutViews()
        }
      }
    }
    tm.broadcast()
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) mainWindow = createMainWindow(openTabInMain)
  })

  // UI screenshot hook for CI: set CAPTURE_UI_PATH=/path/out.png to capture the
  // window after render and exit (used by .github/workflows/ui-screenshot.yml)
  const capturePath = process.env['CAPTURE_UI_PATH']
  if (capturePath) {
    setTimeout(async () => {
      try {
        const win = BrowserWindow.getAllWindows()[0]
        if (!win) { app.exit(1); return }
        const image = await win.webContents.capturePage()
        const fs = await import('fs')
        fs.writeFileSync(capturePath, image.toPNG())
        console.log('[capture] saved', capturePath)
        app.exit(0)
      } catch (e) {
        console.error('[capture] failed', e)
        app.exit(1)
      }
    }, 4500)
  }
})

// auto-save the session on quit
app.on('before-quit', () => {
  saveSessionToDisk(tm.list().map(t => ({ url: t.url, title: t.title, container: t.container, favicon: t.favicon })))
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
