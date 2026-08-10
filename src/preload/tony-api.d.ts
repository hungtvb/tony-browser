// Global type declarations for the preload API (window.tony)
// Helps renderer/src know the types of window.tony.* → no more TS2339/TS7006 errors in tsc --noEmit
import type { TonyAPI } from '../shared/types'

declare global {
  interface Window {
    tony?: TonyAPI
  }
}

export {}

// Electron 31 lacks a type for filterResponseData (present at runtime but missing from .d.ts)
// → additional declaration so webRequest can strip YouTube ads
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