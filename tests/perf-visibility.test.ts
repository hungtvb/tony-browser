// Issue #121 — guard multi-window/hidden-window perf: pure visibility helpers
// consumed by the renderer (poll cadence) and main (skip heavy memory sampling).
import { describe, it, expect } from 'vitest'
import {
  isDocumentHidden,
  isWindowHidden,
  sleeperPollMs,
  HIDDEN_SLEEPER_POLL_MS,
  VISIBLE_SLEEPER_POLL_MS,
} from '../src/shared/perf-visibility'

describe('isWindowHidden (issue #121)', () => {
  it('true when the window is minimized', () => {
    expect(isWindowHidden({ isDestroyed: () => false, isMinimized: () => true, isVisible: () => true })).toBe(true)
  })

  it('true when the window is not visible', () => {
    expect(isWindowHidden({ isDestroyed: () => false, isMinimized: () => false, isVisible: () => false })).toBe(true)
  })

  it('true when destroyed or gone', () => {
    expect(isWindowHidden(null)).toBe(true)
    expect(isWindowHidden(undefined)).toBe(true)
    expect(isWindowHidden({ isDestroyed: () => true, isMinimized: () => false, isVisible: () => true })).toBe(true)
  })

  it('false when visible and not minimized', () => {
    expect(isWindowHidden({ isDestroyed: () => false, isMinimized: () => false, isVisible: () => true })).toBe(false)
  })
})

describe('isDocumentHidden (issue #121)', () => {
  it('reflects document.hidden', () => {
    expect(isDocumentHidden({ hidden: true })).toBe(true)
    expect(isDocumentHidden({ hidden: false })).toBe(false)
  })
})

describe('sleeperPollMs (issue #121)', () => {
  it('slows the sleeper poll 3x while the window is hidden (10s -> 30s)', () => {
    expect(VISIBLE_SLEEPER_POLL_MS).toBe(10_000)
    expect(HIDDEN_SLEEPER_POLL_MS).toBe(30_000)
    expect(sleeperPollMs(false)).toBe(VISIBLE_SLEEPER_POLL_MS)
    expect(sleeperPollMs(true)).toBe(HIDDEN_SLEEPER_POLL_MS)
  })
})