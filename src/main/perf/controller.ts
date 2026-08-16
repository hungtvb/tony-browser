// TabSleeper — controller: manages background tab sleeping + RAM warnings
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
  // ids whose onSleep teardown is still in flight (async) — not yet confirmed sleeping
  private pendingIds = new Set<string>()
  // ids woken (via wake()) while teardown was pending → evaluate loop must skip marking them
  private wokenPendingIds = new Set<string>()

  async evaluate(
    tabs: Tab[],
    activeId: string | (() => string),
    whitelist: string[] = [],
    views?: ViewInfo[],
    onSleep?: (id: string) => void | Promise<void>,
  ): Promise<SleeperStats> {
    const resolveActive = () => (typeof activeId === 'function' ? activeId() : activeId)
    const infos = tabs.map(t => ({
      id: t.id,
      url: t.url,
      lastActive: t.lastActive,
      memoryMB: views?.find(v => v.id === t.id)?.memoryMB ?? 0,
    }))
    const result = this.sleeper.evaluate(infos, resolveActive(), whitelist)
    // invoke the sleep callback — await until the view is really discarded/closed before marking sleeping
    for (const id of result.toSleep) {
      this.pendingIds.add(id)
      try {
        await onSleep?.(id)
      } catch (err) {
        // a rejected onSleep must not abort the loop — tabs after it still need to sleep
        console.warn(`[sleeper] onSleep failed for tab ${id}:`, err)
        continue
      } finally {
        this.pendingIds.delete(id)
      }
      // race guard: the tab was activated while teardown was pending → wake() handled it,
      // do not mark it sleeping (would leave an active tab flagged as sleeping)
      if (this.wokenPendingIds.has(id)) {
        this.wokenPendingIds.delete(id)
        continue
      }
      // re-validate after await: activeId may have changed while onSleep was running
      if (id === resolveActive()) continue
      this.sleepingIds.add(id)
    }
    // drop ids no longer present in tabs
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

  // Issue #121 — cheap count for hidden-window evaluate fast-path (no memory sampling)
  sleepingCount(): number {
    return this.sleepingIds.size
  }

  isPendingSleep(id: string): boolean {
    return this.pendingIds.has(id)
  }

  /**
   * Wake a sleeping tab: remove from sleepingIds + call the wake callback
   * (IPC uses it to reload the URL if it was unloaded / setBackgroundThrottling(false)).
   * Does NOT call recordActivity — resetting the deadline here makes the tab "forever awake":
   * the 10-minute deadline must be computed from the real lastActive (tabs:activate → tm.activate updates it).
   */
  wake(id: string, onWake?: (id: string) => void) {
    if (this.pendingIds.has(id)) {
      // activation landed while teardown was still pending — do not drop it silently:
      // remember the wake so the evaluate loop skips marking this id as sleeping
      this.wokenPendingIds.add(id)
      onWake?.(id)
      return
    }
    if (!this.sleepingIds.has(id)) return
    this.sleepingIds.delete(id)
    onWake?.(id)
  }

  /**
   * Re-flag a tab as sleeping after a failed wake-recreate, so the next tabs:activate
   * retries building its view (layoutViews cannot recover a tab that has no view).
   */
  requeueSleep(id: string) {
    this.sleepingIds.add(id)
  }
}
