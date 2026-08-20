// Mock for the electron module — lets main-process tests run under node
// without a real Electron binary (CI installs with ELECTRON_SKIP_BINARY_DOWNLOAD=1).
export const app = {
  on: () => {},
  quit: () => {},
  getPath: () => '/tmp',
}
export const session = {
  defaultSession: {},
  fromPartition: () => ({
    cookies: { remove: async () => {}, flushStore: async () => {} },
    clearStorageData: async () => {},
    clearCache: async () => {},
  }),
}
export const BrowserWindow = class {
  static getAllWindows = () => []
  loadURL = async () => {}
  webContents = { on: () => {}, send: () => {} }
}
export const WebContentsView = class {}
export const ipcMain = { on: () => {}, handle: () => {} }
export const ipcRenderer = { on: () => {}, send: () => {}, invoke: async () => {} }
export const clipboard = { readText: () => '' }
export const shell = { openExternal: async () => {} }
export default { app, session, BrowserWindow, WebContentsView, ipcMain, ipcRenderer, clipboard, shell }