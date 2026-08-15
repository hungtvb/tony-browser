// Manage the main window + attach WebContentsView for tabs
import { app, BrowserWindow, WebContentsView, session } from 'electron'
import { attachWebRequestFilters } from './ipc'
import { appVersionArg } from '../shared/app-version'
import { trackPartition } from './privacy/auto-clear'
import path from 'path'

export const TOOLBAR_HEIGHT = 92 // TabBar (42) + AddressBar (50)

/** Only allow navigating/opening http/https URLs — block file://, javascript:, ... */
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
      // Issue #69: hand the real app version (app.getVersion()) to the preload so
      // window.tony.version stops reporting the stale hardcoded literal.
      additionalArguments: [appVersionArg(app.getVersion())],
    },
  })

  // Native glass: acrylic/mica on Windows 11, vibrancy on macOS (Linux falls back)
  try {
    if (typeof win.setBackgroundMaterial === 'function') {
      win.setBackgroundMaterial('acrylic' as never)
    }
  } catch { /* unsupported platform — keep solid dark */ }

  // window.open / target=_blank → do not open a raw Electron window; open a new tab if http(s)
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedUrl(url) && onOpenExternal) onOpenExternal(url)
    return { action: 'deny' }
  })

  // protect the main UI: block navigation to schemes other than http/https
  win.webContents.on('will-navigate', (e, url) => {
    if (!isAllowedUrl(url)) e.preventDefault()
  })

  // grant permissions to the main window session up front (previously only via ensureSession() after startup)
  applyPermissions(win.webContents.session)

  // electron-vite: dev uses ELECTRON_RENDERER_URL, prod loads the file
  const devUrl = process.env['ELECTRON_RENDERER_URL']
  if (devUrl) {
    win.loadURL(devUrl)
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'), process.env['CAPTURE_PALETTE'] ? { query: { CAPTURE_PALETTE: '1' } } : undefined)
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
  // Each container has its own session → cookies/history stay separate
  const ses = container === 'default'
    ? session.defaultSession
    : session.fromPartition(`persist:container-${container}`)
  // Issue #124 — remember every container partition so quit-time auto-clear
  // can wipe its cookies/cache too (no Electron API to enumerate partitions).
  if (container !== 'default') trackPartition(`persist:container-${container}`)
  const view = new WebContentsView({
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      partition: container === 'default' ? undefined : `persist:container-${container}`,
    },
  })
  applyPermissions(ses)
  // Fix #37 — container tabs no longer bypass the privacy filter + Focus Mode:
  // attach a webRequest filter to the partitioned session (the guard Set in attachWebRequestFilters
  // ensures a defaultSession already handled by attachPrivacy is not attached again)
  attachWebRequestFilters(ses)
  view.setVisible(false)
  view.webContents.loadURL(url).catch(() => {
    view.webContents.loadURL('data:text/html,<h1 style="font-family:sans-serif">Page failed to load</h1>')
  })
  return view
}

/** Sessions that already registered a permission handler are skipped — prevents registering a new closure on every tab open (WeakSet: does not hold the session, avoids leaks) */
const permissionHandled = new WeakSet<Electron.Session>()

/** Apply permissions to a session (shared by default + container) */
function applyPermissions(ses: Electron.Session) {
  if (permissionHandled.has(ses)) return
  permissionHandled.add(ses)
  ses.setPermissionRequestHandler((_wc, permission, callback) => {
    const allow = ['clipboard-read', 'clipboard-sanitized-write', 'fullscreen', 'media', 'geolocation', 'notifications', 'pointerLock']
    callback(allow.includes(permission))
  })
}

/** Ensure the shared session has proper browser permissions */
export function ensureSession() {
  const ses = session.defaultSession
  applyPermissions(ses)
  return ses
}
