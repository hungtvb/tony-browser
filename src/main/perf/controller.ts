// TabSleeper — controller: quản lý ngủ tab nền + RAM warning
import { createTabSleeper } from '../perf/sleeper'
import type { SleeperStats } from '../../shared/types'
import type { Tab } from '../tabs/TabManager'

export interface ViewInfo {
  id: string
  memoryMB: number
}

export class SleeperController {
  private sleeper = createTabSleeper({ idleMs: 10 * 60 * 1000 })
  private sleepingIds = new Set<string>()

  async evaluate(tabs: Tab[], activeId: string, whitelist: string[] = [], views?: ViewInfo[], onSleep?: (id: string) => void | Promise<void>): Promise<SleeperStats> {
    const infos = tabs.map(t => ({
      id: t.id,
      url: t.url,
      lastActive: t.lastActive,
      memoryMB: views?.find(v => v.id === t.id)?.memoryMB ?? 0,
    }))
    const result = this.sleeper.evaluate(infos, activeId, whitelist)
    // gọi callback ngủ — await cho tới khi view đã discard/đóng xong mới đánh dấu sleeping
    for (const id of result.toSleep) {
      await onSleep?.(id)
      this.sleepingIds.add(id)
    }
    // bỏ id đã ngủ không còn trong tabs
    const ids = new Set(tabs.map(t => t.id))
    for (const id of [...this.sleepingIds]) {
      if (!ids.has(id)) this.sleepingIds.delete(id)
    }
    return { sleeping: this.sleepingIds.size, warnings: result.warnings }
  }

  recordActivity(id: string) {
    this.sleeper.recordActivity(id)
  }

  isSleeping(id: string): boolean {
    return this.sleepingIds.has(id)
  }

  /**
   * Đánh thức tab đang ngủ: xoá khỏi sleepingIds + gọi callback wake
   * (IPC dùng để loadURL lại nếu đã unload / setBackgroundThrottling(false)).
   * KHÔNG gọi recordActivity — reset deadline ở đây khiến tab "vĩnh viễn thức":
   * deadline 10 phút phải tính từ lastActive thật (tabs:activate → tm.activate cập nhật).
   */
  wake(id: string, onWake?: (id: string) => void) {
    if (!this.sleepingIds.has(id)) return
    this.sleepingIds.delete(id)
    onWake?.(id)
  }
}