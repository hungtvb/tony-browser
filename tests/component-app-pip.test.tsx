// Issue #113 — App-level proof that pip.stop is reachable from real UI: the
// AddressBar pip button and the command palette entry both toggle — calling
// pip.stop when a PiP session is believed active, pip.start otherwise.
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react'
import App from '../src/renderer/App'
import type { TonyAPI } from '../src/shared/types'

function mockTony() {
  const pipStart = vi.fn().mockResolvedValue({ ok: true })
  const pipStop = vi.fn().mockResolvedValue({ ok: true })
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
    pip: { start: pipStart, stop: pipStop },
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
  return { pipStart, pipStop }
}

describe('App PiP toggle wiring (issue #113)', () => {
  beforeEach(() => {
    window.tony = undefined as unknown as TonyAPI
  })

  afterEach(() => cleanup())

  it('AddressBar pip button calls pip.start when inactive, then pip.stop when active', async () => {
    const { pipStart, pipStop } = mockTony()
    render(<App />)
    await act(async () => { await Promise.resolve() })
    const btn = screen.getByTitle('Picture-in-Picture')
    fireEvent.click(btn)
    await act(async () => { await Promise.resolve(); await Promise.resolve() })
    expect(pipStart).toHaveBeenCalled()
    expect(pipStop).not.toHaveBeenCalled()
    // second click — PiP is believed active → stop
    const stopBtn = screen.getByTitle('Stop PiP')
    fireEvent.click(stopBtn)
    await act(async () => { await Promise.resolve(); await Promise.resolve() })
    expect(pipStop).toHaveBeenCalled()
  })

  it('command palette PiP entry calls pip.start when inactive, then pip.stop when active', async () => {
    const { pipStart, pipStop } = mockTony()
    render(<App />)
    await act(async () => { await Promise.resolve() })
    // open palette (Ctrl+K)
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    await act(async () => { await Promise.resolve() })
    const item = screen.getByText('Picture-in-Picture')
    fireEvent.click(item)
    await act(async () => { await Promise.resolve(); await Promise.resolve() })
    expect(pipStart).toHaveBeenCalled()
    expect(pipStop).not.toHaveBeenCalled()
    // reopen palette — the same command now shows "Stop PiP" and stops PiP
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    await act(async () => { await Promise.resolve() })
    const item2 = screen.getByText('Stop PiP')
    fireEvent.click(item2)
    await act(async () => { await Promise.resolve(); await Promise.resolve() })
    expect(pipStop).toHaveBeenCalled()
  })
})