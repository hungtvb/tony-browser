// Issue #58 — remove dead IPC handlers: session:save / session:restore / tabs:recordClosed.
// These channels have no preload exposure and no renderer caller; tabs:recordClosed is
// vestigial because tabs:close already persists closed tabs via session.recordClosed internally.
import { describe, it, expect, vi } from 'vitest'
import { createTabManager } from '../src/main/tabs/TabManager'
import type { IpcDeps } from '../src/main/ipc'

const handlers = vi.hoisted(() => new Map<string, (...args: any[]) => any>())

vi.mock('electron', () => ({
  ipcMain: { handle: (ch: string, fn: (...a: any[]) => any) => { handlers.set(ch, fn) } },
  BrowserWindow: class {},
  WebContentsView: class { webContents: any },
  session: { defaultSession: {}, fromPartition: () => ({}) },
  app: { getPath: () => '/tmp/kenzo-ipc-dead-channels' },
}))

import { registerIpc } from '../src/main/ipc'

function setupIpc() {
  handlers.clear()
  const views = new Map<string, any>()
  const tm = createTabManager(() => ({ id: '', loadURL: () => {}, destroy: () => {} }))
  const focusStub = {
    getState: () => ({ blocklist: [] as string[], whitelist: [] as string[], enabled: false }),
    setEnabled: () => {},
    setBlocklist: () => {},
    setWhitelist: () => {},
    getBlockedCount: () => 0,
  }
  const deps: IpcDeps = {
    getWindow: () => null,
    getTabManager: () => tm,
    trackView: (id, v) => { if (!v) views.delete(id); else views.set(id, v) },
    getActiveView: (id) => views.get(id),
    createRealView: (url: string) => ({ webContents: { loadURL: () => Promise.resolve(), isDestroyed: () => false } }) as any,
    layoutViews: () => {},
    getSplitIds: () => [],
    setSplitIds: () => {},
    getFocus: () => focusStub as any,
  }
  registerIpc(deps)
  return { tm, deps }
}

describe('Issue #58 — dead IPC channels are removed', () => {
  it('session:save / session:restore / tabs:recordClosed are NOT registered (no preload exposure, no caller)', () => {
    setupIpc()
    expect(handlers.has('session:save')).toBe(false)
    expect(handlers.has('session:restore')).toBe(false)
    expect(handlers.has('tabs:recordClosed')).toBe(false)
  })

  it('undo-close channels that DO have callers remain registered', () => {
    setupIpc()
    expect(handlers.has('tabs:undoClose')).toBe(true)
    expect(handlers.has('tabs:closedCount')).toBe(true)
    // tabs:close persists closed tabs internally — the live replacement for tabs:recordClosed
    expect(handlers.has('tabs:close')).toBe(true)
  })

  it('every registered channel has a preload exposure (no channel without a bridge)', () => {
    setupIpc()
    const fs = require('node:fs')
    const preload = fs.readFileSync('src/preload/index.ts', 'utf8')
    const invokes = [...preload.matchAll(/ipcRenderer\.invoke\('([^']+)'/g)].map(m => m[1])
    // channels the preload also emits via send / or handled main-internal consumers
    const mainInternal = new Set(['sleeper:evaluate', 'sleeper:activity'])
    for (const ch of handlers.keys()) {
      if (mainInternal.has(ch)) continue
      expect(invokes, `channel ${ch} has no preload exposure`).toContain(ch)
    }
  })
})
