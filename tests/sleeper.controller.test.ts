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

describe('SleeperController (đường thật qua controller)', () => {
  let controller: SleeperController

  beforeEach(() => {
    controller = new SleeperController()
  })

  function evaluateWithSleepLog(tabs: Tab[], activeId?: string, whitelist: string[] = [], views?: ViewInfo[]) {
    const slept: string[] = []
    controller.evaluate(tabs, activeId ?? '', whitelist, views, (id) => slept.push(id))
    return slept
  }

  it('sleep tab nền idle quá 10 phút — qua SleeperController.evaluate()', () => {
    const old = Date.now() - 11 * 60 * 1000
    const tabs = [makeTab('a', old), makeTab('b', Date.now())]
    const views: ViewInfo[] = [
      { id: 'a', memoryMB: 50 },
      { id: 'b', memoryMB: 50 },
    ]
    const slept = evaluateWithSleepLog(tabs, 'b', [], views)
    expect(slept).toContain('a')
    expect(slept).not.toContain('b')
  })

  it('không sleep tab active dù idle lâu', () => {
    const old = Date.now() - 30 * 60 * 1000
    const tabs = [makeTab('a', old)]
    const slept = evaluateWithSleepLog(tabs, 'a')
    expect(slept).not.toContain('a')
  })

  it('không sleep tab trong whitelist', () => {
    const old = Date.now() - 20 * 60 * 1000
    const tabs = [makeTab('keep', old), makeTab('drop', old)]
    const slept = evaluateWithSleepLog(tabs, undefined, ['keep'])
    expect(slept).not.toContain('keep')
    expect(slept).toContain('drop')
  })

  it('báo warning RAM nặng khi view info > heavyMemoryMB', () => {
    const views: ViewInfo[] = [{ id: 'h', memoryMB: 800 }]
    const result = controller.evaluate([makeTab('h')], 'h', [], views)
    expect(result.warnings).toContain('h')
  })

  it('theo dõi số tab đang ngủ qua các lần evaluate + quên tab đã đóng', () => {
    const old = Date.now() - 11 * 60 * 1000
    const views: ViewInfo[] = [
      { id: 'a', memoryMB: 50 },
      { id: 'b', memoryMB: 50 },
    ]
    const r1 = controller.evaluate([makeTab('a', old), makeTab('b', Date.now())], 'b', [], views)
    expect(r1.sleeping).toBe(1)
    // b đóng → chỉ còn a (đang ngủ) → vẫn đếm 1
    const r2 = controller.evaluate([makeTab('a', old)], 'a', [], [{ id: 'a', memoryMB: 50 }])
    expect(r2.sleeping).toBe(1)
  })
})
