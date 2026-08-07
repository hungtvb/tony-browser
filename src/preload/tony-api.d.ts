// Global type declarations for the preload API (window.tony)
// Giúp renderer/src biết kiểu của window.tony.* → hết lỗi TS2339/TS7006 trong tsc --noEmit
import type { TonyAPI } from '../shared/types'

declare global {
  interface Window {
    tony?: TonyAPI
  }
}

export {}

// Electron 31 thiếu type cho filterResponseData (có ở runtime nhưng chưa có trong .d.ts)
// → khai báo bổ sung để dùng trong webRequest để bóc ads YouTube
declare global {
  namespace Electron {
    interface WebRequest {
      filterResponseData(requestId: number): {
        on(event: 'data', listener: (chunk: Buffer | Uint8Array) => void): void
        on(event: 'end' | 'error', listener: () => void): void
        write(data: string | Buffer | Uint8Array): void
        end(): void
      }
    }
  }
}