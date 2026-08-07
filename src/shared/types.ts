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
}