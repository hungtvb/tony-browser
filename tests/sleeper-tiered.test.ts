// Issue #119 — tiered sleep: light idle tabs get Tier-1 throttle (keep renderer alive,
// muted + 1 fps — no reload on wake); heavy tabs (> 500MB) get Tier-2 close (real RAM
// freed, view rebuilt on wake from the original URL).
// These tests drive the real IPC handler through registerIpc (same pattern as sleeper-memory.test.ts).
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
    getPath: () => '/tmp/kenzo-tiered-sleep-test',
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
      setBackgroundThrottling: vi.fn(),
      setAudioMuted: vi.fn(),
      setFrameRate: vi.fn(),
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
  const createRealView = vi.fn(() => ({ webContents: {} }))
  const deps: IpcDeps = {
    getWindow: () => null,
    getTabManager: () => tm,
    trackView: (id, v) => { if (!v) views.delete(id); else views.set(id, v) },
    getActiveView: (id) => views.get(id),
    createRealView: createRealView as any,
    layoutViews: () => {},
    getSplitIds: () => [],
    setSplitIds: () => {},
    getFocus: () => focusStub as any,
  }
  registerIpc(deps)
  return { tm, views, createRealView }
}

const IDLE_MS = 11 * 60 * 1000 // 11 min — past the 10-min idle threshold

async function openIdlePair() {
  const s = setupIpc()
  const idle = s.tm.open('https://idle.com')
  const act = s.tm.open('https://active.com')
  idle.lastActive = Date.now() - IDLE_MS
  s.tm.activate(act.id)
  return { s, idle, act }
}

describe('Issue #119 — tiered sleep (Tier 1 throttle vs Tier 2 close)', () => {
  it('Tier 1: a LIGHT idle tab is throttled (muted + 1 fps + background throttling), NOT closed, view retained', async () => {
    const { s, idle, act } = await openIdlePair()
    s.views.set(idle.id, makeView(60 * 1024)) // 60 MB — below the 500 MB heavy threshold
    s.views.set(act.id, makeView(80 * 1024))

    const res = await handlers.get('sleeper:evaluate')!()

    expect(res.sleeping).toBe(1)
    const lv = s.views.get(idle.id)
    expect(lv).toBeDefined() // still tracked — no reload on wake
    expect(lv.webContents.close).not.toHaveBeenCalled()
    expect(lv.webContents.setAudioMuted).toHaveBeenCalledWith(true)
    expect(lv.webContents.setFrameRate).toHaveBeenCalledWith(1)
    expect(lv.webContents.setBackgroundThrottling).toHaveBeenCalledWith(true)
  })

  it('Tier 2: a HEAVY idle tab (>500MB) is closed — real RAM freed, view untracked', async () => {
    const { s, idle, act } = await openIdlePair()
    s.views.set(idle.id, makeView(900 * 1024)) // 900 MB — above the heavy threshold
    s.views.set(act.id, makeView(80 * 1024))
    const hv = s.views.get(idle.id) // capture before evaluate — Tier 2 untracks the view

    const res = await handlers.get('sleeper:evaluate')!()

    expect(res.sleeping).toBe(1)
    expect(hv.webContents.close).toHaveBeenCalled()
    expect(s.views.has(idle.id)).toBe(false) // untracked → wake rebuilds from URL
  })

  it('waking a Tier-1 tab restores the renderer (unmute + 60 fps + throttling off) WITHOUT recreating the view', async () => {
    const { s, idle, act } = await openIdlePair()
    s.views.set(idle.id, makeView(60 * 1024))
    s.views.set(act.id, makeView(80 * 1024))
    await handlers.get('sleeper:evaluate')!()
    expect(s.views.has(idle.id)).toBe(true) // Tier-1: view alive

    handlers.get('tabs:activate')!(null, idle.id)

    const lv = s.views.get(idle.id)
    expect(lv.webContents.setAudioMuted).toHaveBeenCalledWith(false)
    expect(lv.webContents.setFrameRate).toHaveBeenCalledWith(60)
    expect(lv.webContents.setBackgroundThrottling).toHaveBeenCalledWith(false)
    expect(s.createRealView).not.toHaveBeenCalled()
  })

  it('waking a Tier-2 tab (view was closed) rebuilds a fresh view from the original URL', async () => {
    const { s, idle, act } = await openIdlePair()
    s.views.set(idle.id, makeView(900 * 1024))
    s.views.set(act.id, makeView(80 * 1024))
    await handlers.get('sleeper:evaluate')!()
    expect(s.views.has(idle.id)).toBe(false) // Tier-2: view gone

    handlers.get('tabs:activate')!(null, idle.id)

    expect(s.createRealView).toHaveBeenCalled()
    expect(s.views.has(idle.id)).toBe(true)
  })
})
