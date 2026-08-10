// Tony Browser — Preload script (contextBridge)
import { contextBridge, ipcRenderer } from 'electron'
import { readAppVersionArg } from '../shared/app-version'
import type { TabState, PrivacyStats, TonyAPI, AIConfig, AIStatus, AIRequestParams } from '../shared/types'

// Issue #69 — real app version injected by main via additionalArguments
// (--tony-app-version=<v>); falls back to '' if absent. Never a hardcoded literal.
const apiVersion = readAppVersionArg(process.argv)

const api: TonyAPI = {
  version: apiVersion,
  platform: process.platform,
  getAppInfo: () => ({
    version: apiVersion,
    electron: process.versions.electron,
    chrome: process.versions.chrome,
  }),
  tabs: {
    open: (url: string, container?: string, favicon?: string) => ipcRenderer.invoke('tabs:open', url, container, favicon),
    openContainer: (url: string, container: string) => ipcRenderer.invoke('tabs:openContainer', url, container),
    close: (id: string) => ipcRenderer.invoke('tabs:close', id),
    activate: (id: string) => ipcRenderer.invoke('tabs:activate', id),
    list: () => ipcRenderer.invoke('tabs:list'),
    stacks: () => ipcRenderer.invoke('tabs:stacks'),
    search: (q: string) => ipcRenderer.invoke('tabs:search', q),
    split: (aId: string, bId: string | null) => ipcRenderer.invoke('tabs:split', aId, bId),
    splitState: () => ipcRenderer.invoke('tabs:splitState'),
    undoClose: () => ipcRenderer.invoke('tabs:undoClose'),
    closedCount: () => ipcRenderer.invoke('tabs:closedCount'),
    nav: {
      back: () => ipcRenderer.invoke('tabs:goBack') as Promise<boolean>,
      forward: () => ipcRenderer.invoke('tabs:goForward') as Promise<boolean>,
      reload: () => ipcRenderer.invoke('tabs:reload') as Promise<boolean>,
      state: () => ipcRenderer.invoke('tabs:navState') as Promise<{ canGoBack: boolean; canGoForward: boolean; isLoading: boolean }>,
    },
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
  tts: {
    speak: (tabId?: string) => ipcRenderer.invoke('tts:speak', tabId) as Promise<any>,
    stop: () => ipcRenderer.invoke('tts:stop') as Promise<any>,
  },
  save: {
    page: (url: string, title: string, container?: string) => ipcRenderer.invoke('save:page', url, title, container) as Promise<any>,
    list: () => ipcRenderer.invoke('save:list') as Promise<any[]>,
    remove: (id: string) => ipcRenderer.invoke('save:remove', id) as Promise<boolean>,
  },
}

contextBridge.exposeInMainWorld('tony', api)
