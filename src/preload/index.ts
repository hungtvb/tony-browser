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
    open: (url: string, container?: string) => ipcRenderer.invoke('tabs:open', url, container),
    openContainer: (url: string, container: string) => ipcRenderer.invoke('tabs:openContainer', url, container),
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
  focus: {
    state: () => ipcRenderer.invoke('focus:state') as Promise<any>,
    toggle: (on: boolean) => ipcRenderer.invoke('focus:toggle', on) as Promise<any>,
    setBlocklist: (list: string[]) => ipcRenderer.invoke('focus:setBlocklist', list) as Promise<any>,
    setWhitelist: (list: string[]) => ipcRenderer.invoke('focus:setWhitelist', list) as Promise<any>,
  },
  smarttab: {
    groups: (mode: 'domain' | 'theme') => ipcRenderer.invoke('smarttab:groups', mode) as Promise<any[]>,
    saveSession: (name?: string) => ipcRenderer.invoke('smarttab:saveSession', name) as Promise<any>,
    sessions: () => ipcRenderer.invoke('smarttab:sessions') as Promise<any[]>,
    restoreSession: (name: string) => ipcRenderer.invoke('smarttab:restoreSession', name) as Promise<any[]>,
  },
  sleeper: {
    evaluate: () => ipcRenderer.invoke('sleeper:evaluate') as Promise<any>,
    activity: (id: string) => ipcRenderer.invoke('sleeper:activity', id) as Promise<void>,
  },
  reader: {
    extract: (tabId?: string) => ipcRenderer.invoke('reader:extract', tabId) as Promise<any>,
  },
  pip: {
    start: (tabId?: string) => ipcRenderer.invoke('pip:start', tabId) as Promise<any>,
    stop: (tabId?: string) => ipcRenderer.invoke('pip:stop', tabId) as Promise<any>,
  },
}

contextBridge.exposeInMainWorld('tony', api)
