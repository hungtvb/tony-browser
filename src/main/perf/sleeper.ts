// TabSleeper — ngủ tab nền để tiết kiệm RAM, cảnh báo tab nặng
interface SleepableTab {
  id: string
  url: string
  lastActive?: number
  memoryMB?: number
}

export interface SleeperResult {
  toSleep: string[]
  warnings: string[]
}

export interface SleeperOptions {
  idleMs?: number
  heavyMemoryMB?: number
}

export function createTabSleeper(opts: SleeperOptions = {}) {
  const idleMs = opts.idleMs ?? 10 * 60 * 1000
  const heavyMemoryMB = opts.heavyMemoryMB ?? 500
  const lastActiveMap = new Map<string, number>()

  function effectiveLastActive(tab: SleepableTab): number {
    const tracked = lastActiveMap.get(tab.id)
    // tracker là nguồn sự thật; lastActive trong tab chỉ là fallback nếu chưa có
    if (tracked !== undefined) return tracked
    return tab.lastActive ?? Date.now()
  }

  function evaluate(tabs: SleepableTab[], activeTabId?: string, whitelist: string[] = []): SleeperResult {
    const now = Date.now()
    const toSleep: string[] = []
    const warnings: string[] = []

    for (const tab of tabs) {
      // cảnh báo RAM nặng
      if ((tab.memoryMB ?? 0) > heavyMemoryMB) warnings.push(tab.id)

      // không sleep tab active hoặc whitelist
      if (tab.id === activeTabId) continue
      if (whitelist.includes(tab.id)) continue

      const last = effectiveLastActive(tab)
      if (now - last > idleMs) toSleep.push(tab.id)
    }
    return { toSleep, warnings }
  }

  function recordActivity(id: string) {
    lastActiveMap.set(id, Date.now())
  }

  return { evaluate, recordActivity }
}