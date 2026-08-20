// Issue #115 — Ctrl+W closes the active tab (standard browser shortcut), but
// must be ignored when focus is in an input/textarea (address bar, palette,
// AI panel) so typing Ctrl+W there never closes a tab.
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react'
import App from '../src/renderer/App'
import type { TonyAPI } from '../src/shared/types'

function mockTony() {
  const close = vi.fn()
  const activate = vi.fn()
  window.tony = {
    tabs: {
      list: vi.fn().mockResolvedValue([
        { id: 't1', url: 'https://a.dev', title: 'Tab A', loading: false, container: 'default' },
        { id: 't2', url: 'https://b.dev', title: 'Tab B', loading: false, container: 'default' },
      ]),
      onChange: vi.fn(() => () => {}),
      open: vi.fn().mockResolvedValue({ id: 't3' }),
      close,
      activate,
      undoClose: vi.fn().mockResolvedValue(null),
      closedCount: vi.fn().mockResolvedValue(0),
      nav: {
        state: vi.fn().mockResolvedValue({ canGoBack: false, canGoForward: false, isLoading: false }),
        back: vi.fn(), forward: vi.fn(), reload: vi.fn(),
      },
    },
    pip: { start: vi.fn().mockResolvedValue({ ok: true }), stop: vi.fn().mockResolvedValue({ ok: true }) },
    privacy: { stats: vi.fn().mockResolvedValue({ blocked: 0, listSize: 0 }), toggle: vi.fn().mockResolvedValue(true), onStats: vi.fn(() => () => {}) },
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
  return { close }
}

describe('Ctrl+W close-tab shortcut (issue #115)', () => {
  beforeEach(() => {
    window.tony = undefined as unknown as TonyAPI
  })

  afterEach(() => cleanup())

  it('closes the active tab with Ctrl+W', async () => {
    const { close } = mockTony()
    render(<App />)
    await act(async () => { await Promise.resolve() })
    fireEvent.keyDown(window, { key: 'w', ctrlKey: true })
    expect(close).toHaveBeenCalledWith('t2')
  })

  it('does NOT close the tab when focus is inside an input (address bar)', async () => {
    const { close } = mockTony()
    render(<App />)
    await act(async () => { await Promise.resolve() })
    const input = screen.getByPlaceholderText(/web address or search/i)
    input.focus()
    fireEvent.keyDown(input, { key: 'w', ctrlKey: true })
    expect(close).not.toHaveBeenCalled()
  })

  it('does NOT close the tab when focus is inside a textarea (AI panel input)', async () => {
    const { close } = mockTony()
    render(<App />)
    await act(async () => { await Promise.resolve() })
    const ta = document.createElement('textarea')
    document.body.appendChild(ta)
    ta.focus()
    fireEvent.keyDown(ta, { key: 'w', ctrlKey: true })
    expect(close).not.toHaveBeenCalled()
    ta.remove()
  })
})
