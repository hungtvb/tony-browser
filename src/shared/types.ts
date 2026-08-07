// Shared types — IPC contract giữa main/preload/renderer

export interface TabState {
  id: string
  url: string
  title: string
  loading: boolean
}

export interface AIConfig {
  baseUrl: string
  apiKey: string
  model: string
}

export interface AIRequest {
  text: string
  pageText?: string
}

export interface AIResponse {
  text: string
}

export interface PrivacyStats {
  blocked: number
  listSize: number
}

export interface AIConfig {
  baseUrl: string
  apiKey: string
  model: string
}

export interface AIAskParams {
  text: string
  tabId?: string // nếu có → đọc nội dung tab đó
  mode: 'chat' | 'summarizePage' | 'summarizeAll'
}

export interface AIStatus {
  configured: boolean
  busy: boolean
}

export type AIRequestParams = AIAskParams

export interface FocusState {
  enabled: boolean
  blocklist: string[]
  whitelist: string[]
}

export interface GroupedTabInfo {
  label: string
  tabs: TabState[]
}

export interface TabSessionInfo {
  name: string
  createdAt: number
  tabs: { url: string; title: string }[]
}

export interface SleeperStats {
  sleeping: number
  warnings: string[]
}

export interface TonyAPI {
  version: string
  platform: string
  getAppInfo: () => { electron: string; chrome: string }
  tabs: {
    open: (url: string) => Promise<TabState>
    close: (id: string) => Promise<boolean>
    activate: (id: string) => Promise<boolean>
    list: () => Promise<TabState[]>
    onChange: (cb: (tabs: TabState[]) => void) => void
  }
  privacy: {
    stats: () => Promise<PrivacyStats>
    toggle: (on: boolean) => Promise<boolean>
  }
  ai: {
    config: () => Promise<AIConfig | null>
    saveConfig: (c: AIConfig) => Promise<boolean>
    ask: (params: AIRequestParams) => Promise<{ text: string }>
    status: () => Promise<AIStatus>
  }
  focus: {
    state: () => Promise<FocusState>
    toggle: (on: boolean) => Promise<FocusState>
    setBlocklist: (list: string[]) => Promise<FocusState>
    setWhitelist: (list: string[]) => Promise<FocusState>
  }
  smarttab: {
    groups: (mode: 'domain' | 'theme') => Promise<GroupedTabInfo[]>
    saveSession: (name?: string) => Promise<TabSessionInfo>
    sessions: () => Promise<TabSessionInfo[]>
    restoreSession: (name: string) => Promise<{ url: string; title: string }[]>
  }
  sleeper: {
    evaluate: () => Promise<SleeperStats>
    activity: (id: string) => Promise<void>
  }
}