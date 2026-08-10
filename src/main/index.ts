// Tony Browser — Electron main process
import { app, BrowserWindow, WebContentsView } from 'electron'
import { createMainWindow, ensureSession, createTabView, attachView, TOOLBAR_HEIGHT } from './window'
import { planLayout } from './tabs/layout'
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
// trạng thái split hiện tại — registerIpc cập nhật qua setter (không export trực tiếp)
let splitIds: string[] = []
export function setSplitIds(ids: string[]) {
  splitIds = ids
}
export function getSplitIds(): string[] {
  return splitIds
}

// Layout lại mọi view đang hiển thị theo kích thước cửa sổ hiện tại
// (dùng cho resize + sau khi vào/thoát split + mở/đóng tab)
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

// path lưu session (JSON store tự viết, tránh ESM-only dep)
function sessionFile() {
  return path.join(app.getPath('userData'), 'session.json')
}

function smartTabSessionsFile() {
  return path.join(app.getPath('userData'), 'smarttab-sessions.json')
}

function saveSessionToDisk(tabs: { url: string; title: string; container?: string }[]) {
  try {
    fs.writeFileSync(sessionFile(), JSON.stringify(tabs), 'utf-8')
  } catch { /* ignore */ }
}

function loadSessionFromDisk() {
  try {
    return JSON.parse(fs.readFileSync(sessionFile(), 'utf-8')) as { url: string; title: string; container?: string }[]
  } catch { return [] }
}

const tm = createTabManager(() => ({
  id: '',
  loadURL: () => {},
  destroy: () => {},
}))

const deps: IpcDeps = {
  getWindow: () => mainWindow,
  getTabManager: () => tm,
  trackView: (tabId: string, view: WebContentsView | null) => {
    if (!view) { viewByTab.delete(tabId); return }
    viewByTab.set(tabId, view)
    attachCosmetic(view.webContents)
    view.webContents.on('page-title-updated', (_e, title) => {
      const t = tm.get(tabId)
      if (t) { t.title = title; tm.broadcast() }
    })
  },
  getActiveView: (tabId: string) => viewByTab.get(tabId),
  createRealView: (url: string, container?: string) => createTabView(url, container),
  layoutViews,
  getSplitIds,
  setSplitIds,
  getFocus: () => focusController,
}

// FocusController dùng chung: attachPrivacy chặn request thật + registerIpc expose IPC
// (khởi tạo ở module scope để cả hai cùng tham chiếu một instance — seed state persisted từ disk)
const focusController = new FocusController(loadFocusState() ?? undefined)

app.whenReady().then(() => {
  ensureSession()
  // window.open/target=_blank từ UI → mở tab mới qua TabManager (không mở cửa sổ Electron raw)
  function openTabInMain(url: string) {
    const tab = tm.open(url, 'default')
    const view = createTabView(url, 'default')
    viewByTab.set(tab.id, view)
    attachCosmetic(view.webContents)
    view.webContents.on('page-title-updated', (_e, title) => {
      const t = tm.get(tab.id)
      if (t) { t.title = title; tm.broadcast() }
    })
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

  // resize cửa sổ → layout lại mọi view (full + split) theo kích thước mới
  mainWindow.on('resize', () => layoutViews())

  // khôi phục session từ lần chạy trước — mở lại TOÀN BỘ tab đã lưu (không cắt magic number)
  const saved = loadSessionFromDisk()
  if (saved.length > 0) {
    openRestoredTabs(saved, (s) => {
      const tab = tm.open(s.url, s.container ?? 'default')
      const view = createTabView(s.url, s.container ?? 'default')
      viewByTab.set(tab.id, view)
      attachCosmetic(view.webContents)
      view.webContents.on('page-title-updated', (_e, title) => {
        const t = tm.get(tab.id)
        if (t) { t.title = title; tm.broadcast() }
      })
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

// lưu session tự động khi thoát
app.on('before-quit', () => {
  saveSessionToDisk(tm.list().map(t => ({ url: t.url, title: t.title, container: t.container })))
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
