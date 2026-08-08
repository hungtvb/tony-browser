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

  evaluate(tabs: Tab[], activeId: string, whitelist: string[] = [], views?: ViewInfo[], onSleep?: (id: string) => void): SleeperStats {
    const infos = tabs.map(t => ({
      id: t.id,
      url: t.url,
      lastActive: t.lastActive,
      memoryMB: views?.find(v => v.id === t.id)?.memoryMB ?? 0,
    }))
    const result = this.sleeper.evaluate(infos, activeId, whitelist)
    // gọi callback ngủ
    for (const id of result.toSleep) {
      this.sleepingIds.add(id)
      onSleep?.(id)
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
}