import { describe, it, expect, beforeEach } from 'vitest'
import { SleeperController, type ViewInfo } from '../src/main/perf/controller'
import type { Tab } from '../src/main/tabs/TabManager'

const IDLE_MS = 10 * 60 * 1000 // 10 phút, cùng idleMs với controller

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

describe('SleeperController — wake (đánh thức tab đang ngủ)', () => {
  let controller: SleeperController

  beforeEach(() => {
    controller = new SleeperController()
  })

  async function sleepTab(id: string) {
    const old = Date.now() - 11 * 60 * 1000
    const views: ViewInfo[] = [{ id, memoryMB: 50 }]
    await controller.evaluate([makeTab(id, old)], '', [], views)
  }

  it('wake(id) xoá tab khỏi sleepingIds — isSleeping(id) = false', async () => {
    await sleepTab('a')
    expect(controller.isSleeping('a')).toBe(true)

    controller.wake('a')
    expect(controller.isSleeping('a')).toBe(false)
  })

  it('wake KHÔNG reset deadline tracker — lastActive vẫn cũ → evaluate tiếp ngủ lại (hết "vĩnh viễn thức")', async () => {
    const old = Date.now() - 11 * 60 * 1000
    await sleepTab('a')
    controller.wake('a')
    // wake không âm thầm recordActivity → deadline 10 phút tính từ lastActive thật,
    // tab vẫn idle → lần evaluate sau phải ngủ lại (tabs:activate sẽ set lastActive mới khi thực sự dùng)
    const r = await controller.evaluate([makeTab('a', old)], 'b', [], [{ id: 'a', memoryMB: 50 }])
    expect(r.sleeping).toBe(1)
  })

  it('wake gọi callback onWake đúng id (để IPC khôi phục view)', async () => {
    await sleepTab('b')
    const woken: string[] = []
    controller.wake('b', (id) => woken.push(id))
    expect(woken).toEqual(['b'])
    expect(controller.isSleeping('b')).toBe(false)
  })

  it('wake id không ngủ → không lỗi, không gọi callback', () => {
    const woken: string[] = []
    controller.wake('nope', (id) => woken.push(id))
    expect(woken).toEqual([])
    expect(controller.isSleeping('nope')).toBe(false)
  })
})
