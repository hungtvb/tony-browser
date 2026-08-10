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

describe('SleeperController — wake (waking a sleeping tab)', () => {
  let controller: SleeperController

  beforeEach(() => {
    controller = new SleeperController()
  })

  async function sleepTab(id: string) {
    const old = Date.now() - 11 * 60 * 1000
    const views: ViewInfo[] = [{ id, memoryMB: 50 }]
    await controller.evaluate([makeTab(id, old)], '', [], views)
  }

  it('wake(id) removes the tab from sleepingIds — isSleeping(id) = false', async () => {
    await sleepTab('a')
    expect(controller.isSleeping('a')).toBe(true)

    controller.wake('a')
    expect(controller.isSleeping('a')).toBe(false)
  })

  it('wake does NOT reset the deadline tracker — lastActive stays old → next evaluate sleeps again (no "forever awake")', async () => {
    const old = Date.now() - 11 * 60 * 1000
    await sleepTab('a')
    controller.wake('a')
    // wake must not silently recordActivity → the 10-min deadline is computed from the real lastActive;
    // the tab is still idle → the next evaluate must sleep it again (tabs:activate sets a new lastActive on real use)
    const r = await controller.evaluate([makeTab('a', old)], 'b', [], [{ id: 'a', memoryMB: 50 }])
    expect(r.sleeping).toBe(1)
  })

  it('wake calls the onWake callback with the right id (IPC restores the view from it)', async () => {
    await sleepTab('b')
    const woken: string[] = []
    controller.wake('b', (id) => woken.push(id))
    expect(woken).toEqual(['b'])
    expect(controller.isSleeping('b')).toBe(false)
  })

  it('wake of a non-sleeping id → no error, callback not called', () => {
    const woken: string[] = []
    controller.wake('nope', (id) => woken.push(id))
    expect(woken).toEqual([])
    expect(controller.isSleeping('nope')).toBe(false)
  })
})
