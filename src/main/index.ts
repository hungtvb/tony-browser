// Tony Browser — Electron main process
import { app, BrowserWindow, WebContentsView } from 'electron'
import { createMainWindow, ensureSession, createTabView } from './window'
import { createTabManager } from './tabs/TabManager'
import { registerIpc, attachPrivacy, createCosmeticInjector, type IpcDeps } from './ipc'
import { FocusController } from './focus/controller'
import * as fs from 'fs'
import * as path from 'path'

let mainWindow: BrowserWindow | null = null
const viewByTab = new Map<string, WebContentsView>()
const attachCosmetic = createCosmeticInjector()

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
  createRealView: (url: string) => createTabView(url),
}

// FocusController dùng chung: attachPrivacy chặn request thật + registerIpc expose IPC
// (khởi tạo ở module scope để cả hai cùng tham chiếu một instance)
const focusController = new FocusController()

app.whenReady().then(() => {
  ensureSession()
  mainWindow = createMainWindow()
  attachPrivacy(mainWindow, deps, () => focusController)
  registerIpc(deps, { smartPersistFile: smartTabSessionsFile() })

  // khôi phục session từ lần chạy trước
  const saved = loadSessionFromDisk()
  if (saved.length > 0) {
    for (const s of saved.slice(0, 10)) {
      const tab = tm.open(s.url, s.container ?? 'default')
      const view = createTabView(s.url, s.container ?? 'default')
      viewByTab.set(tab.id, view)
      attachCosmetic(view.webContents)
      view.webContents.on('page-title-updated', (_e, title) => {
        const t = tm.get(tab.id)
        if (t) { t.title = title; tm.broadcast() }
      })
    }
    const w = BrowserWindow.getAllWindows()[0]
    if (w) {
      const first = tm.list()[0]
      if (first) {
        const v = viewByTab.get(first.id)
        if (v) {
          const [cw, ch] = w.getContentSize()
          v.setBounds({ x: 0, y: 92, width: cw, height: Math.max(ch - 92, 0) })
          w.contentView.addChildView(v)
        }
      }
    }
    tm.broadcast()
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) mainWindow = createMainWindow()
  })
})

// lưu session tự động khi thoát
app.on('before-quit', () => {
  saveSessionToDisk(tm.list().map(t => ({ url: t.url, title: t.title, container: t.container })))
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
