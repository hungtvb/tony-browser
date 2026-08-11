// @vitest-environment jsdom
// Issue #90 — tabs.onChange leaks ipcRenderer listeners.
// The preload subscription must return an unsubscribe fn (removeListener), and
// useTabs must call it in its effect cleanup so remounts don't stack listeners.
import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act, cleanup } from '@testing-library/react'

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

import { useTabs } from '../src/renderer/hooks/useTabs'
// Importing the preload script executes its side effect: contextBridge.exposeInMainWorld('tony', api)
import '../src/preload/index'

function tonyApi() {
  return ipcState.exposed.find(e => e.name === 'tony')?.api
}

function dispatch(channel: string, ...args: any[]) {
  ipcState.listeners.get(channel)?.forEach(cb => cb({}, ...args))
}

afterEach(() => {
  cleanup()
  ipcState.listeners.clear()
  vi.unstubAllGlobals()
})

describe('Issue #90 — preload tabs.onChange returns an unsubscribe fn', () => {
  it('onChange returns a function', () => {
    const off = tonyApi().tabs.onChange(vi.fn())
    expect(typeof off).toBe('function')
  })

  it('calling the returned fn removes the listener (no callback after unsubscribe)', () => {
    const cb = vi.fn()
    const off = tonyApi().tabs.onChange(cb)
    dispatch('tabs:changed', [])
    expect(cb).toHaveBeenCalledTimes(1)
    off()
    dispatch('tabs:changed', [])
    expect(cb).toHaveBeenCalledTimes(1) // still 1 — listener removed
  })

  it('subscribing twice creates two independent listeners, both removable', () => {
    const cbA = vi.fn()
    const cbB = vi.fn()
    const offA = tonyApi().tabs.onChange(cbA)
    const offB = tonyApi().tabs.onChange(cbB)
    dispatch('tabs:changed', [])
    expect(cbA).toHaveBeenCalledTimes(1)
    expect(cbB).toHaveBeenCalledTimes(1)
    offA()
    dispatch('tabs:changed', [])
    expect(cbA).toHaveBeenCalledTimes(1)
    expect(cbB).toHaveBeenCalledTimes(2)
    offB()
    dispatch('tabs:changed', [])
    expect(cbB).toHaveBeenCalledTimes(2)
  })
})

describe('Issue #90 — useTabs cleans up its tabs.onChange subscription', () => {
  it('calls the returned unsubscribe fn on unmount (no listener leak across remounts)', async () => {
    const unsubscribe = vi.fn()
    vi.stubGlobal('tony', {
      tabs: {
        list: vi.fn(() => Promise.resolve([])),
        onChange: vi.fn(() => unsubscribe),
        open: vi.fn(),
        openContainer: vi.fn(),
        close: vi.fn(),
        activate: vi.fn(),
      },
      sleeper: { activity: vi.fn() },
    })
    const { unmount } = renderHook(() => useTabs())
    await act(async () => {})
    unmount()
    expect(unsubscribe).toHaveBeenCalledTimes(1)
  })

  it('subscribes once per mount and still reacts to tabs:changed while mounted', async () => {
    let capturedCb: ((tabs: any[]) => void) | null = null
    const unsubscribe = vi.fn()
    vi.stubGlobal('tony', {
      tabs: {
        list: vi.fn(() => Promise.resolve([{ id: 'a' }])),
        onChange: vi.fn((cb: (tabs: any[]) => void) => { capturedCb = cb; return unsubscribe }),
        open: vi.fn(),
        openContainer: vi.fn(),
        close: vi.fn(),
        activate: vi.fn(),
      },
      sleeper: { activity: vi.fn() },
    })
    const { result, unmount } = renderHook(() => useTabs())
    await act(async () => {})
    expect(result.current.tabs).toHaveLength(1)
    await act(async () => {
      capturedCb!([{ id: 'a' }, { id: 'b' }])
    })
    expect(result.current.tabs).toHaveLength(2)
    unmount()
    expect(unsubscribe).toHaveBeenCalledTimes(1)
  })
})
