// Focus Blocker — hàm thuần quyết định chặn request web khi Focus Mode bật.
// Tách khỏi Electron để test được (issue #12 — wire Focus vào chặn web thật).
import { createFocusEngine, type FocusEngine } from './engine'

export interface BlockDecision {
  cancel: boolean
  reason?: 'focus'
}

export interface FocusBlocker {
  setEnabled(on: boolean): void
  setBlocklist(domains: string[]): void
  setWhitelist(patterns: string[]): void
  /** true nếu url bị chặn do focus (để bỏ qua adblock counter) */
  isFocusBlocked(url: string): boolean
  /** quyết định chặn cho onBeforeRequest */
  blockUrl(url: string): BlockDecision
  /** số request bị chặn do focus (counter riêng) */
  blockedCount(): number
}

export interface FocusBlockerOptions {
  blocklist?: string[]
  whitelist?: string[]
}

export function createFocusBlocker(opts: FocusBlockerOptions = {}): FocusBlocker {
  const engine: FocusEngine = createFocusEngine({
    blocklist: opts.blocklist ?? [],
    whitelist: opts.whitelist ?? [],
  })
  let count = 0

  function isFocusBlocked(url: string): boolean {
    return engine.check(url).blocked
  }

  function blockUrl(url: string): BlockDecision {
    if (!isFocusBlocked(url)) return { cancel: false }
    count++
    return { cancel: true, reason: 'focus' }
  }

  return {
    setEnabled: (on) => engine.setEnabled(on),
    setBlocklist: (list) => engine.setBlocklist(list),
    setWhitelist: (list) => engine.setWhitelist(list),
    isFocusBlocked,
    blockUrl,
    blockedCount: () => count,
  }
}