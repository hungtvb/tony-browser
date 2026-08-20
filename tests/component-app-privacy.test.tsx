// Issue #91 — App-level proof that privacy.toggle is reachable from a real UI
// interaction: the StatusBar Adblock chip is rendered by App and clicking it
// calls window.tony.privacy.toggle(!on), then refreshes privacy.stats().
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react'
import App from '../src/renderer/App'
import type { TonyAPI } from '../src/shared/types'

function mockTony() {
  const stats = vi.fn().mockResolvedValue({ blocked: 3, listSize: 42 })
  const toggle = vi.fn().mockResolvedValue(false)
  const onStats = vi.fn<(cb: (s: { blocked: number; listSize: number }) => void) => () => void>(() => () => {})
  window.tony = {
    tabs: {
      list: vi.fn().mockResolvedValue([]),
      onChange: vi.fn(() => () => {}),
      open: vi.fn().mockResolvedValue({ id: 't1' }),
      close: vi.fn(),
      activate: vi.fn(),
      undoClose: vi.fn().mockResolvedValue(null),
      closedCount: vi.fn().mockResolvedValue(0),
      nav: {
        state: vi.fn().mockResolvedValue({ canGoBack: false, canGoForward: false, isLoading: false }),
        back: vi.fn(), forward: vi.fn(), reload: vi.fn(),
      },
    },
    privacy: { stats, toggle, onStats },
    focus: {
      state: vi.fn().mockResolvedValue({ blocklist: [], whitelist: [], enabled: false, blocked: 0 }),
      toggle: vi.fn(),
    },
    sleeper: {
      evaluate: vi.fn().mockResolvedValue({ sleeping: 0, warnings: [] }),
      onWarnings: vi.fn(() => () => {}),
      activity: vi.fn(),
    },
  } as unknown as TonyAPI
  return { stats, toggle, onStats }
}

describe('App privacy toggle wiring (issue #91)', () => {
  beforeEach(() => {
    window.tony = undefined as unknown as TonyAPI
  })

  afterEach(() => cleanup())

  it('clicking the Adblock chip calls window.tony.privacy.toggle(!on) and refreshes stats', async () => {
    const { stats, toggle } = mockTony()
    render(<App />)
    // initial stats load
    await act(async () => { await Promise.resolve() })
    expect(stats).toHaveBeenCalled()
    const chip = screen.getByText('Adblock On')
    fireEvent.click(chip)
    await act(async () => { await Promise.resolve(); await Promise.resolve() })
    expect(toggle).toHaveBeenCalledWith(false)
    // stats are re-fetched after the toggle so the UI reflects the new state
    expect(stats.mock.calls.length).toBeGreaterThan(1)
    // chip reflects the value returned by main
    expect(await screen.findByText('Adblock Off')).toBeInTheDocument()
  })
})

// Issue #120 — event-driven stats: App must subscribe to privacy.onStats once
// (no 3s polling) and update the StatusBar counter from pushed events.
describe('App event-driven privacy stats (issue #120)', () => {
  beforeEach(() => {
    window.tony = undefined as unknown as TonyAPI
  })

  afterEach(() => cleanup())

  it('subscribes via privacy.onStats on mount and updates the counter from pushed events', async () => {
    const { stats, onStats } = mockTony()
    let push: ((s: { blocked: number; listSize: number }) => void) | null = null
    onStats.mockImplementation((cb: (s: { blocked: number; listSize: number }) => void) => { push = cb; return () => {} })
    render(<App />)
    await act(async () => { await Promise.resolve() })
    // initial fetch still happens (instant data on mount)
    expect(stats).toHaveBeenCalledTimes(1)
    // one subscription, no polling
    expect(onStats).toHaveBeenCalledTimes(1)
    // a blocked request pushes stats → StatusBar counter updates immediately
    await act(async () => { push!({ blocked: 9, listSize: 42 }) })
    expect(screen.getByText(/Blocked 9 requests/)).toBeInTheDocument()
  })
})
