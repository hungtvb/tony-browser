// Tony Browser — Preload script (contextBridge)
import { contextBridge, ipcRenderer } from 'electron'
import type { TabState, PrivacyStats, TonyAPI, AIConfig, AIStatus, AIRequestParams } from '../shared/types'

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
  ai: {
    config: () => ipcRenderer.invoke('ai:config'),
    saveConfig: (cfg: AIConfig) => ipcRenderer.invoke('ai:saveConfig', cfg),
    ask: (params: AIRequestParams) => ipcRenderer.invoke('ai:ask', params) as Promise<{ text: string }>,
    status: () => ipcRenderer.invoke('ai:status') as Promise<AIStatus>,
  },
}

contextBridge.exposeInMainWorld('tony', api)
