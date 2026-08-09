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

  function sleepTab(id: string) {
    const old = Date.now() - 11 * 60 * 1000
    const views: ViewInfo[] = [{ id, memoryMB: 50 }]
    controller.evaluate([makeTab(id, old)], '', [], views)
  }

  it('wake(id) xoá tab khỏi sleepingIds — isSleeping(id) = false', () => {
    sleepTab('a')
    expect(controller.isSleeping('a')).toBe(true)

    controller.wake('a')
    expect(controller.isSleeping('a')).toBe(false)
  })

  it('sau wake, evaluate tiếp không ngủ lại tab vừa thức (lastActive đã reset)', () => {
    sleepTab('a')
    controller.wake('a')
    // tab vừa thức có lastActive mới (tabs:activate sẽ set) → không bị ngủ lại ngay
    const r = controller.evaluate([makeTab('a', Date.now())], 'a', [], [{ id: 'a', memoryMB: 50 }])
    expect(r.sleeping).toBe(0)
  })

  it('wake gọi callback onWake đúng id (để IPC khôi phục view)', () => {
    sleepTab('b')
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