// Tony Browser — Electron main process
import { app, BrowserWindow, WebContentsView } from 'electron'
import { createMainWindow, ensureSession, createTabView } from './window'
import { createTabManager } from './tabs/TabManager'
import { registerIpc, attachPrivacy, type IpcDeps } from './ipc'

let mainWindow: BrowserWindow | null = null
const viewByTab = new Map<string, WebContentsView>()

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
    view.webContents.on('page-title-updated', (_e, title) => {
      const t = tm.get(tabId)
      if (t) { t.title = title; tm.broadcast() }
    })
  },
  getActiveView: (tabId: string) => viewByTab.get(tabId),
  createRealView: (url: string) => createTabView(url),
}

app.whenReady().then(() => {
  ensureSession()
  mainWindow = createMainWindow()
  attachPrivacy(mainWindow, deps)
  registerIpc(deps)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) mainWindow = createMainWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
