// Quản lý cửa sổ chính + attach WebContentsView cho tab
import { BrowserWindow, WebContentsView, session } from 'electron'
import path from 'path'

export const TOOLBAR_HEIGHT = 92 // TabBar (42) + AddressBar (50)

export function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'Tony Browser',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  // electron-vite: dev dùng ELECTRON_RENDERER_URL, prod load file
  const devUrl = process.env['ELECTRON_RENDERER_URL']
  if (devUrl) {
    win.loadURL(devUrl)
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  return win
}

export function attachView(win: BrowserWindow, view: WebContentsView) {
  if (view.webContents.isDestroyed()) return
  win.contentView.addChildView(view)
  const [w, h] = win.getContentSize()
  view.setBounds({ x: 0, y: TOOLBAR_HEIGHT, width: w, height: Math.max(h - TOOLBAR_HEIGHT, 0) })
  view.setVisible(true)
}

export function detachView(win: BrowserWindow, view: WebContentsView) {
  if (view.webContents.isDestroyed()) return
  win.contentView.removeChildView(view)
}

export function createTabView(url: string): WebContentsView {
  const view = new WebContentsView({
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })
  view.setVisible(false)
  view.webContents.loadURL(url).catch(() => {
    view.webContents.loadURL('data:text/html,<h1 style="font-family:sans-serif">Không tải được trang</h1>')
  })
  return view
}

/** Đảm bảo session dùng chung có các quyền hạn hợp lý cho browser */
export function ensureSession() {
  const ses = session.defaultSession
  // Chặn thông báo spam + popup quyền
  ses.setPermissionRequestHandler((_wc, permission, callback) => {
    const allow = ['clipboard-read', 'clipboard-sanitized-write', 'fullscreen', 'media', 'geolocation', 'notifications', 'pointerLock']
    callback(allow.includes(permission))
  })
  return ses
}
