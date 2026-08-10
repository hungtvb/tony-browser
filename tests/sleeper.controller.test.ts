import { describe, it, expect, beforeEach } from 'vitest'
import { SleeperController, type ViewInfo } from '../src/main/perf/controller'
import type { Tab } from '../src/main/tabs/TabManager'

const IDLE_MS = 10 * 60 * 1000 // 10 min, same idleMs as the controller

function makeTab(id: string, lastActive?: number): Tab {
  return {
    id,
    url: `https://site${id}.com`,
    title: `Site ${id}`,
    loading: false,
    view: { id, loadURL: () => {}, destroy: () => {} },
    container: 'default',
    lastActive,
  }
}

describe('SleeperController (real path through the controller)', () => {
  let controller: SleeperController

  beforeEach(() => {
    controller = new SleeperController()
  })

  async function evaluateWithSleepLog(tabs: Tab[], activeId?: string, whitelist: string[] = [], views?: ViewInfo[]) {
    const slept: string[] = []
    await controller.evaluate(tabs, activeId ?? '', whitelist, views, (id) => { slept.push(id) })
    return slept
  }

  it('sleeps a background tab idle for more than 10 min — via SleeperController.evaluate()', async () => {
    const old = Date.now() - 11 * 60 * 1000
    const tabs = [makeTab('a', old), makeTab('b', Date.now())]
    const views: ViewInfo[] = [
      { id: 'a', memoryMB: 50 },
      { id: 'b', memoryMB: 50 },
    ]
    const slept = await evaluateWithSleepLog(tabs, 'b', [], views)
    expect(slept).toContain('a')
    expect(slept).not.toContain('b')
  })

  it('does not sleep the active tab even when idle for a long time', async () => {
    const old = Date.now() - 30 * 60 * 1000
    const tabs = [makeTab('a', old)]
    const slept = await evaluateWithSleepLog(tabs, 'a')
    expect(slept).not.toContain('a')
  })

  it('does not sleep whitelisted tabs', async () => {
    const old = Date.now() - 20 * 60 * 1000
    const tabs = [makeTab('keep', old), makeTab('drop', old)]
    const slept = await evaluateWithSleepLog(tabs, undefined, ['keep'])
    expect(slept).not.toContain('keep')
    expect(slept).toContain('drop')
  })

  it('reports a heavy-RAM warning when view info is above heavyMemoryMB', async () => {
    const views: ViewInfo[] = [{ id: 'h', memoryMB: 800 }]
    const result = await controller.evaluate([makeTab('h')], 'h', [], views)
    expect(result.warnings).toContain('h')
  })

  it('tracks the sleeping count across evaluates + forgets closed tabs', async () => {
    const old = Date.now() - 11 * 60 * 1000
    const views: ViewInfo[] = [
      { id: 'a', memoryMB: 50 },
      { id: 'b', memoryMB: 50 },
    ]
    const r1 = await controller.evaluate([makeTab('a', old), makeTab('b', Date.now())], 'b', [], views)
    expect(r1.sleeping).toBe(1)
    // b closed → only a (sleeping) remains → still counts 1
    const r2 = await controller.evaluate([makeTab('a', old)], 'a', [], [{ id: 'a', memoryMB: 50 }])
    expect(r2.sleeping).toBe(1)
  })
})
