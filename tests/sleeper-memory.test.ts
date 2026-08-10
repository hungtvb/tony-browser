// Issue #68 — sleeper:evaluate must feed real per-tab memory (from webContents.getProcessMemoryInfo)
// into the controller, so the heavy-tab RAM warning (memoryMB > heavyMemoryMB) can actually fire.
// Production call site (src/main/ipc.ts) used to pass views=undefined → every tab mapped to 0.
// These tests drive the real IPC handler through registerIpc (same pattern as reader-ipc.test.ts).
import { describe, it, expect, vi } from 'vitest'
import { createTabManager } from '../src/main/tabs/TabManager'

const handlers = vi.hoisted(() => new Map<string, (...args: any[]) => any>())
const metrics = vi.hoisted(() => new Map<number, number>()) // pid -> workingSetSize KB

vi.mock('electron', () => ({
  ipcMain: { handle: (ch: string, fn: (...a: any[]) => any) => { handlers.set(ch, fn) } },
  BrowserWindow: class {},
  WebContentsView: class { webContents: any },
  session: { defaultSession: {}, fromPartition: () => ({}) },
  app: {
    getPath: () => '/tmp/kenzo-sleeper-memory-test',
    getAppMetrics: () => Array.from(metrics.entries()).map(([pid, workingSetSize]) => ({ pid, memory: { workingSetSize } })),
  },
}))

import { registerIpc } from '../src/main/ipc'
import type { IpcDeps } from '../src/main/ipc'

let pidCounter = 1000

function makeView(memoryKB: number) {
  const pid = ++pidCounter
  metrics.set(pid, memoryKB)
  return {
    webContents: {
      isDestroyed: () => false,
      getOSProcessId: () => pid,
      // minimal extras used by ipc.ts during teardown paths (not exercised here)
      close: vi.fn(),
    },
  }
}

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
    createRealView: (() => ({ webContents: {} })) as any,
    layoutViews: () => {},
    getSplitIds: () => [],
    setSplitIds: () => {},
    getFocus: () => focusStub as any,
  }
  registerIpc(deps)
  return { tm, views }
}

describe('Issue #68 — sleeper:evaluate wires real per-tab memory', () => {
  it('warns for a tab whose view reports workingSetSize > 500MB (KB→MB conversion)', async () => {
    const s = setupIpc()
    const heavy = s.tm.open('https://heavy-site.com')
    const light = s.tm.open('https://light-site.com')
    s.views.set(heavy.id, makeView(900 * 1024)) // 900 MB
    s.views.set(light.id, makeView(60 * 1024)) // 60 MB
    s.tm.activate(light.id)

    const res = await handlers.get('sleeper:evaluate')!()

    expect(res.warnings).toContain(heavy.id)
    expect(res.warnings).not.toContain(light.id)
  })

  it('produces no warnings when every view is missing/destroyed (memory maps to 0 — no false positive)', async () => {
    const s = setupIpc()
    const a = s.tm.open('https://site-a.com')
    s.tm.activate(a.id)
    // no view registered for the tab → getActiveView returns undefined → 0 MB

    const res = await handlers.get('sleeper:evaluate')!()

    expect(res.warnings).toEqual([])
  })

  it('treats destroyed views as 0 MB (no warning)', async () => {
    const s = setupIpc()
    const a = s.tm.open('https://site-a.com')
    s.tm.activate(a.id)
    s.views.set(a.id, {
      webContents: {
        isDestroyed: () => true,
        getOSProcessId: () => 9999,
        close: vi.fn(),
      },
    } as any)

    const res = await handlers.get('sleeper:evaluate')!()

    expect(res.warnings).toEqual([])
  })
})