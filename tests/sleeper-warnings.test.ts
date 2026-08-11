// Issue #72 — sleeper:evaluate must emit a proactive 'sleeper:warnings' event when the
// heavy-tab RAM warning set CHANGES (empty → non-empty → empty), so the renderer can
// highlight heavy tabs + toast without relying on polling-only.
// Production call site (src/main/ipc.ts) — same driver pattern as sleeper-memory.test.ts.
import { describe, it, expect, vi } from 'vitest'
import { createTabManager } from '../src/main/tabs/TabManager'

const handlers = vi.hoisted(() => new Map<string, (...args: any[]) => any>())
const metrics = vi.hoisted(() => new Map<number, number>()) // pid -> workingSetSize KB
const sends = vi.hoisted(() => vi.fn())

vi.mock('electron', () => ({
  ipcMain: { handle: (ch: string, fn: (...a: any[]) => any) => { handlers.set(ch, fn) } },
  BrowserWindow: class {},
  WebContentsView: class { webContents: any },
  session: { defaultSession: {}, fromPartition: () => ({}) },
  app: {
    getPath: () => '/tmp/kenzo-sleeper-warnings-test',
    getAppMetrics: () => Array.from(metrics.entries()).map(([pid, workingSetSize]) => ({ pid, memory: { workingSetSize } })),
  },
}))

import { registerIpc } from '../src/main/ipc'
import type { IpcDeps } from '../src/main/ipc'

let pidCounter = 2000

function makeView(memoryKB: number) {
  const pid = ++pidCounter
  metrics.set(pid, memoryKB)
  return {
    webContents: {
      isDestroyed: () => false,
      getOSProcessId: () => pid,
      close: vi.fn(),
    },
  }
}

const fakeWindow = {
  webContents: { isDestroyed: () => false, send: sends },
}

function setupIpc() {
  handlers.clear()
  sends.mockClear()
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
    getWindow: () => fakeWindow as any,
    getTabManager: () => tm,
    trackView: (id, v) => { if (!v) views.delete(id); else views.set(id, v) },
    getActiveView: (id) => views.get(id),
    createRealView: (() => ({ webContents: {} })) as any,
    layoutViews: () => {},
    getSplitIds: () => [],
    setSplitIds: () => {},
    getFocus: () => focusStub as any,
  }
  registerIpc(deps)
  return { tm, views }
}

describe('Issue #72 — proactive sleeper:warnings event', () => {
  // filter out unrelated broadcasts (tabs:changed etc.) — we only assert on sleeper:warnings
  const warningsCalls = () => sends.mock.calls.filter(c => c[0] === 'sleeper:warnings')

  it('emits sleeper:warnings with the heavy tab id on empty → non-empty transition', async () => {
    const s = setupIpc()
    const heavy = s.tm.open('https://heavy-site.com')
    const light = s.tm.open('https://light-site.com')
    s.views.set(heavy.id, makeView(900 * 1024)) // 900 MB
    s.views.set(light.id, makeView(60 * 1024)) // 60 MB
    s.tm.activate(light.id)

    await handlers.get('sleeper:evaluate')!()

    expect(warningsCalls()).toHaveLength(1)
    expect(warningsCalls()[0]).toEqual(['sleeper:warnings', [heavy.id]])
  })

  it('does NOT re-emit when the warned set is unchanged', async () => {
    const s = setupIpc()
    const heavy = s.tm.open('https://heavy-site.com')
    s.views.set(heavy.id, makeView(900 * 1024)) // 900 MB
    s.tm.activate(heavy.id)

    await handlers.get('sleeper:evaluate')!()
    await handlers.get('sleeper:evaluate')!()

    expect(warningsCalls()).toHaveLength(1)
  })

  it('emits an empty list when warnings clear (non-empty → empty)', async () => {
    const s = setupIpc()
    const heavy = s.tm.open('https://heavy-site.com')
    s.views.set(heavy.id, makeView(900 * 1024)) // 900 MB
    s.tm.activate(heavy.id)

    await handlers.get('sleeper:evaluate')!()
    // tab closes → no view → 0 MB → warning set empties
    s.views.delete(heavy.id)
    await handlers.get('sleeper:evaluate')!()

    expect(warningsCalls()).toHaveLength(2)
    expect(warningsCalls()[1]).toEqual(['sleeper:warnings', []])
  })

  it('does not throw when the window is missing (send skipped)', async () => {
    handlers.clear()
    sends.mockClear()
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
      createRealView: (() => ({ webContents: {} })) as any,
      layoutViews: () => {},
      getSplitIds: () => [],
      setSplitIds: () => {},
      getFocus: () => focusStub as any,
    }
    registerIpc(deps)
    const heavy = tm.open('https://heavy-site.com')
    views.set(heavy.id, makeView(900 * 1024))
    tm.activate(heavy.id)

    await expect(handlers.get('sleeper:evaluate')!()).resolves.toBeDefined()
    expect(sends).not.toHaveBeenCalled()
  })
})
