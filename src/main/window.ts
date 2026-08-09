// Quản lý cửa sổ chính + attach WebContentsView cho tab
import { BrowserWindow, WebContentsView, session } from 'electron'
import path from 'path'

export const TOOLBAR_HEIGHT = 92 // TabBar (42) + AddressBar (50)

/** Chỉ cho phép navigate/mở URL http/https — chặn file://, javascript:, ... */
export function isAllowedUrl(url: string): boolean {
  return /^https?:\/\//i.test(url)
}

export function createMainWindow(onOpenExternal?: (url: string) => void): BrowserWindow {
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

  // window.open / target=_blank → không mở cửa sổ Electron raw; mở tab mới nếu http(s)
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedUrl(url) && onOpenExternal) onOpenExternal(url)
    return { action: 'deny' }
  })

  // bảo vệ chính UI: chặn navigate sang scheme khác http/https
  win.webContents.on('will-navigate', (e, url) => {
    if (!isAllowedUrl(url)) e.preventDefault()
  })

  // quyền hạn cho session cửa sổ chính ngay từ đầu (trước đây chỉ qua ensureSession() sau khi khởi động)
  applyPermissions(win.webContents.session)

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

export function createTabView(url: string, container = 'default'): WebContentsView {
  // Mỗi container có session riêng → cookie/lịch sử tách biệt
  const ses = container === 'default'
    ? session.defaultSession
    : session.fromPartition(`persist:container-${container}`)
  const view = new WebContentsView({
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      partition: container === 'default' ? undefined : `persist:container-${container}`,
    },
  })
  applyPermissions(ses)
  view.setVisible(false)
  view.webContents.loadURL(url).catch(() => {
    view.webContents.loadURL('data:text/html,<h1 style="font-family:sans-serif">Không tải được trang</h1>')
  })
  return view
}

/** Áp quyền hạn cho session (dùng chung cho default + container) */
function applyPermissions(ses: Electron.Session) {
  ses.setPermissionRequestHandler((_wc, permission, callback) => {
    const allow = ['clipboard-read', 'clipboard-sanitized-write', 'fullscreen', 'media', 'geolocation', 'notifications', 'pointerLock']
    callback(allow.includes(permission))
  })
}

/** Đảm bảo session dùng chung có các quyền hạn hợp lý cho browser */
export function ensureSession() {
  const ses = session.defaultSession
  applyPermissions(ses)
  return ses
}
