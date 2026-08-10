// Issue #48 — Tab UX: middle-click close + wheel tab switching.
// Pure gesture logic, extracted so it's unit-testable in node env (TabBar.tsx wires it up).
import { describe, it, expect, vi } from 'vitest'
import {
  isMiddleClickClose,
  wheelDeltaToDirection,
  nextTabId,
  createWheelGate,
} from '../src/renderer/tabGestures'

describe('isMiddleClickClose — middle-click (button === 1) closes tab', () => {
  it('true for button 1 (middle)', () => {
    expect(isMiddleClickClose({ button: 1 })).toBe(true)
  })

  it('false for left click (0)', () => {
    expect(isMiddleClickClose({ button: 0 })).toBe(false)
  })

  it('false for right click (2) and other buttons', () => {
    expect(isMiddleClickClose({ button: 2 })).toBe(false)
    expect(isMiddleClickClose({ button: 3 })).toBe(false)
  })
})

describe('wheelDeltaToDirection — wheel over tab bar switches tabs', () => {
  it('deltaY > 0 → next tab', () => {
    expect(wheelDeltaToDirection({ deltaY: 12 })).toBe('next')
    expect(wheelDeltaToDirection({ deltaY: 0.5 })).toBe('next')
  })

  it('deltaY < 0 → previous tab', () => {
    expect(wheelDeltaToDirection({ deltaY: -12 })).toBe('prev')
  })

  it('deltaY === 0 → null (no switch)', () => {
    expect(wheelDeltaToDirection({ deltaY: 0 })).toBeNull()
  })

  it('falls back to deltaX when deltaY is 0 (horizontal trackpad scroll)', () => {
    expect(wheelDeltaToDirection({ deltaY: 0, deltaX: 8 })).toBe('next')
    expect(wheelDeltaToDirection({ deltaY: 0, deltaX: -8 })).toBe('prev')
  })

  it('null when both deltas are 0', () => {
    expect(wheelDeltaToDirection({ deltaY: 0, deltaX: 0 })).toBeNull()
  })
})

describe('nextTabId — circular next/prev over tab ids', () => {
  const ids = ['a', 'b', 'c']

  it('next wraps around at the end', () => {
    expect(nextTabId(ids, 'c', 'next')).toBe('a')
    expect(nextTabId(ids, 'a', 'next')).toBe('b')
  })

  it('prev wraps around at the start', () => {
    expect(nextTabId(ids, 'a', 'prev')).toBe('c')
    expect(nextTabId(ids, 'c', 'prev')).toBe('b')
  })

  it('single tab → stays on itself', () => {
    expect(nextTabId(['a'], 'a', 'next')).toBe('a')
    expect(nextTabId(['a'], 'a', 'prev')).toBe('a')
  })

  it('empty list → undefined', () => {
    expect(nextTabId([], 'a', 'next')).toBeUndefined()
  })

  it('active id not in list → falls back to first tab', () => {
    expect(nextTabId(ids, 'zzz', 'next')).toBe('a')
  })
})

describe('createWheelGate — throttle rapid wheel switches (150ms)', () => {
  it('allows first event immediately', () => {
    const gate = createWheelGate(150)
    expect(gate()).toBe(true)
  })

  it('blocks events within the interval', () => {
    vi.useFakeTimers()
    const gate = createWheelGate(150)
    expect(gate()).toBe(true)
    expect(gate()).toBe(false)
    expect(gate()).toBe(false)
    vi.advanceTimersByTime(149)
    expect(gate()).toBe(false)
    vi.advanceTimersByTime(1)
    expect(gate()).toBe(true)
    vi.useRealTimers()
  })

  it('only re-opens after the interval has passed since last event', () => {
    vi.useFakeTimers()
    const gate = createWheelGate(150)
    gate() // t=0 open
    vi.advanceTimersByTime(160) // t=160 open
    expect(gate()).toBe(true)
    vi.advanceTimersByTime(100) // t=260, only 100ms since last
    expect(gate()).toBe(false)
    vi.advanceTimersByTime(50) // t=310, 150ms since last
    expect(gate()).toBe(true)
    vi.useRealTimers()
  })
})
