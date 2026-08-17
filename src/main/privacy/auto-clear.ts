// Issue #124 — auto-clear cookies/cache on quit, honoring the site exception list.
// Session-level logic: iterate every session (default + container partitions), remove
// cookies whose domain is NOT whitelisted (per-cookie removal keeps whitelisted logins
// alive), then wipe cache storage + HTTP cache.
import { session } from 'electron'
import type { ClearPolicy } from './clear-policy'

/** Minimal session surface used by the clearer (Electron.Session satisfies it). */
export interface SessionLike {
  cookies: {
    flushStore: () => Promise<void>
    get: (filter: unknown) => Promise<Array<{ domain?: string; name: string; path?: string }>>
    remove: (url: string, name: string) => Promise<void>
  }
  clearStorageData: (opts: { storages: string[] }) => Promise<void>
  clearCache: () => Promise<void>
}

// ─── partition registry ───
// createTabView creates `persist:container-*` partitions lazily — there is no Electron
// API to enumerate them, so window.ts registers each partition here when a container
// tab is created. On quit we clear defaultSession + every registered partition.
const usedPartitions = new Set<string>()

export function trackPartition(partition: string) {
  if (partition) usedPartitions.add(partition)
}

export function trackedPartitions(): string[] {
  return [...usedPartitions]
}

/** Test-only: clear the registry between tests. */
export function resetTrackedPartitions() {
  usedPartitions.clear()
}

function cookieUrl(c: { domain?: string; path?: string }): string {
  const domain = (c.domain ?? '').replace(/^\./, '')
  const p = c.path ?? '/'
  return `https://${domain}${p}`
}

/**
 * Clear non-whitelisted cookies + cache from every given session.
 * `isKept(domain)` decides which cookie domains survive (the whitelist).
 * Never throws — a failing session must not block app quit.
 */
export async function clearCookiesForSessions(
  sessions: SessionLike[],
  isKept: (domain: string) => boolean,
): Promise<{ sessions: number; removed: number }> {
  let removed = 0
  for (const ses of sessions) {
    try { await ses.cookies.flushStore() } catch { /* session mid-teardown */ }
    let cookies: Array<{ domain?: string; name: string; path?: string }> = []
    try { cookies = await ses.cookies.get({}) } catch { /* ignore */ }
    for (const c of cookies) {
      const domain = (c.domain ?? '').replace(/^\./, '')
      if (!domain || isKept(domain)) continue
      try {
        await ses.cookies.remove(cookieUrl(c), c.name)
        removed++
      } catch { /* cookie already gone — fine */ }
    }
    // cache is not domain-specific — wipe it entirely (Cache Storage API + HTTP cache)
    try { await ses.clearStorageData({ storages: ['cachestorage'] }) } catch { /* ignore */ }
    try { await ses.clearCache() } catch { /* ignore */ }
  }
  return { sessions: sessions.length, removed }
}

/**
 * Quit-time entry point: when the policy is enabled, clear cookies (minus the
 * whitelist) + cache from the default session and every tracked container partition.
 * `getSessions` is injectable for tests; the default walks real Electron sessions.
 */
export async function clearCookiesOnQuit(
  policy: ClearPolicy,
  getSessions?: () => SessionLike[],
): Promise<{ sessions: number; removed: number }> {
  if (!policy.getState().enabled) return { sessions: 0, removed: 0 }
  // Electron's Session is a superset of SessionLike (get(filter) accepts {} and the
  // cookie shape matches) — cast to keep the default path type-clean.
  const sessions: SessionLike[] = getSessions
    ? getSessions()
    : ([session.defaultSession, ...trackedPartitions().map((p) => session.fromPartition(p))] as SessionLike[])
  const isKept = (domain: string) => policy.isWhitelisted(domain)
  return clearCookiesForSessions(sessions, isKept)
}
