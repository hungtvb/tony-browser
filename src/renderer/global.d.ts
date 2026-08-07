declare global {
  interface Window {
    tony?: {
      version: string
      platform: string
      getAppInfo: () => { electron: string; chrome: string }
    }
  }
}
export {}
