// Tony Browser — Preload script (contextBridge)
import { contextBridge, ipcRenderer } from 'electron'
import type { TabState, PrivacyStats, TonyAPI } from '../shared/types'

const api: TonyAPI = {
  version: '0.2.0',
  platform: process.platform,
  getAppInfo: () => ({
    electron: process.versions.electron,
    chrome: process.versions.chrome,
  }),
  tabs: {
    open: (url: string) => ipcRenderer.invoke('tabs:open', url),
    close: (id: string) => ipcRenderer.invoke('tabs:close', id),
    activate: (id: string) => ipcRenderer.invoke('tabs:activate', id),
    list: () => ipcRenderer.invoke('tabs:list'),
    onChange: (cb: (tabs: TabState[]) => void) => {
      ipcRenderer.on('tabs:changed', (_e, tabs: TabState[]) => cb(tabs))
    },
  },
  privacy: {
    stats: () => ipcRenderer.invoke('privacy:stats') as Promise<PrivacyStats>,
    toggle: (on: boolean) => ipcRenderer.invoke('privacy:toggle', on),
  },
}

contextBridge.exposeInMainWorld('tony', api)
