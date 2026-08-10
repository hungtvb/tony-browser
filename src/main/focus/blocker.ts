// Focus Blocker — pure functions deciding whether to block web requests when Focus Mode is on.
// Kept free of Electron so it can be tested (issue #12 — wire Focus into real web blocking).
import { createFocusEngine, type FocusEngine } from './engine'

export interface BlockDecision {
  cancel: boolean
  reason?: 'focus'
}

export interface FocusBlocker {
  setEnabled(on: boolean): void
  setBlocklist(domains: string[]): void
  setWhitelist(patterns: string[]): void
  /** true if the url is blocked by focus (so the adblock counter is skipped) */
  isFocusBlocked(url: string): boolean
  /** block decision for onBeforeRequest */
  blockUrl(url: string): BlockDecision
  /** number of requests blocked by focus (separate counter) */
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