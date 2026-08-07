/// <reference types="vite/client" />

declare module '*.svg' {
  const content: string
  export default content
}

declare module '*.svg?raw' {
  const content: string
  export default content
}

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
