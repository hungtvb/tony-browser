// TabSleeper — sleeps background tabs to save RAM, warns about heavy tabs
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
    // the tracker is the source of truth; tab.lastActive is only a fallback when untracked
    if (tracked !== undefined) return tracked
    return tab.lastActive ?? Date.now()
  }

  function evaluate(tabs: SleepableTab[], activeTabId?: string, whitelist: string[] = []): SleeperResult {
    const now = Date.now()
    const toSleep: string[] = []
    const warnings: string[] = []

    for (const tab of tabs) {
      // warn about heavy RAM usage
      if ((tab.memoryMB ?? 0) > heavyMemoryMB) warnings.push(tab.id)

      // never sleep the active tab or whitelisted tabs
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