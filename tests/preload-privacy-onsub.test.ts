// Issue #120 — preload privacy.onStats must follow the same pattern as
// tabs.onChange / sleeper.onWarnings: subscribe to 'privacy:stats' and return
// an unsubscribe fn so the renderer can remove the listener on unmount
// (no listener leak, no polling).
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'

// --- mock electron (preload uses contextBridge + ipcRenderer) ---
const ipcState = vi.hoisted(() => {
  const listeners = new Map<string, Set<(...args: any[]) => any>>()
  const exposed: { name: string; api: any }[] = []
  const ipcRenderer = {
    on: (ch: string, cb: (...args: any[]) => any) => {
      if (!listeners.has(ch)) listeners.set(ch, new Set())
      listeners.get(ch)!.add(cb)
    },
    removeListener: (ch: string, cb: (...args: any[]) => any) => {
      listeners.get(ch)?.delete(cb)
    },
    invoke: vi.fn(),
  }
  return { listeners, exposed, ipcRenderer }
})

vi.mock('electron', () => ({
  contextBridge: { exposeInMainWorld: (name: string, api: any) => ipcState.exposed.push({ name, api }) },
  ipcRenderer: ipcState.ipcRenderer,
}))

import '../src/preload/index'

function tonyApi() {
  return ipcState.exposed.find(e => e.name === 'tony')?.api
}

function dispatch(channel: string, ...args: any[]) {
  ipcState.listeners.get(channel)?.forEach(cb => cb({}, ...args))
}

afterEach(() => {
  ipcState.listeners.clear()
})

describe('Issue #120 — preload privacy.onStats', () => {
  it('onStats returns an unsubscribe function', () => {
    const off = tonyApi().privacy.onStats(vi.fn())
    expect(typeof off).toBe('function')
  })

  it('delivers privacy:stats payloads to the callback', () => {
    const cb = vi.fn()
    tonyApi().privacy.onStats(cb)
    dispatch('privacy:stats', { blocked: 7, listSize: 42 })
    expect(cb).toHaveBeenCalledWith({ blocked: 7, listSize: 42 })
  })

  it('calling the returned fn removes the listener (no callback after unsubscribe)', () => {
    const cb = vi.fn()
    const off = tonyApi().privacy.onStats(cb)
    dispatch('privacy:stats', { blocked: 1, listSize: 1 })
    expect(cb).toHaveBeenCalledTimes(1)
    off()
    dispatch('privacy:stats', { blocked: 2, listSize: 1 })
    expect(cb).toHaveBeenCalledTimes(1) // still 1 — listener removed
  })
})
