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
    privacy: { stats, toggle },
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
  return { stats, toggle }
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
