// Issue #124 — auto-clear cookies/cache on quit, honoring the whitelist.
// Session-level tests with fake Electron sessions (no real Electron needed).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  clearCookiesForSessions,
  clearCookiesOnQuit,
  trackPartition,
  trackedPartitions,
  resetTrackedPartitions,
  type SessionLike,
} from '../src/main/privacy/auto-clear'
import { createClearPolicy } from '../src/main/privacy/clear-policy'

// ─── fake session (mirrors Electron.Session's cookie/cache surface) ───
function makeFakeSession(cookies: Array<{ domain?: string; name: string; path?: string }> = []): SessionLike & { calls: string[] } {
  const calls: string[] = []
  return {
    calls,
    cookies: {
      flushStore: async () => { calls.push('flushStore') },
      get: async () => {
        calls.push('get')
        return cookies
      },
      remove: async (url: string, name: string) => {
        calls.push(`remove:${name}@${url}`)
        cookies.splice(cookies.findIndex(c => c.name === name), 1)
      },
    },
    clearStorageData: async () => { calls.push('clearStorageData') },
    clearCache: async () => { calls.push('clearCache') },
  }
}

describe('clearCookiesForSessions', () => {
  it('removes cookies of non-whitelisted domains, keeps whitelisted ones', async () => {
    const ses = makeFakeSession([
      { domain: '.example.com', name: 'session', path: '/' },
      { domain: 'keep.com', name: 'login', path: '/' },
      { domain: 'example.com', name: 'other', path: '/' },
    ])
    const kept = (d: string) => d === 'keep.com'
    const res = await clearCookiesForSessions([ses], kept)
    expect(res.removed).toBe(2)
    // only the two example.com cookies were removed — keep.com survived
    expect(ses.cookies.get).toBeDefined()
    const remaining = (await (ses.cookies.get as any)()).map((c: any) => c.name)
    expect(remaining.sort()).toEqual(['login'])
    // flush → get → removes → storage/cache clear
    expect(ses.calls[0]).toBe('flushStore')
    expect(ses.calls).toContain('clearStorageData')
    expect(ses.calls).toContain('clearCache')
  })

  it('leading-dot cookie domains are matched after stripping the dot', async () => {
    const ses = makeFakeSession([{ domain: '.example.com', name: 'sid', path: '/' }])
    const kept = (d: string) => d === 'example.com'
    const res = await clearCookiesForSessions([ses], kept)
    expect(res.removed).toBe(0) // whitelisted → kept
  })

  it('cookie without a domain is skipped (cannot build a remove URL)', async () => {
    const ses = makeFakeSession([{ name: 'no-domain', path: '/' }])
    const res = await clearCookiesForSessions([ses], () => false)
    expect(res.removed).toBe(0)
  })

  it('cookie.remove failure → does not throw, continues with the rest', async () => {
    const ses = makeFakeSession([
      { domain: 'a.com', name: 'x', path: '/' },
      { domain: 'b.com', name: 'y', path: '/' },
    ])
    ses.cookies.remove = async () => { throw new Error('boom') }
    const res = await clearCookiesForSessions([ses], () => false)
    expect(res.removed).toBe(0)
  })

  it('cookies.get failure → still clears storage/cache, does not throw', async () => {
    const ses = makeFakeSession()
    ses.cookies.get = async () => { throw new Error('boom') }
    const res = await clearCookiesForSessions([ses], () => false)
    expect(res.removed).toBe(0)
    expect(ses.calls).toContain('clearStorageData')
    expect(ses.calls).toContain('clearCache')
  })

  it('clears every session passed', async () => {
    const s1 = makeFakeSession()
    const s2 = makeFakeSession()
    const res = await clearCookiesForSessions([s1, s2], () => false)
    expect(res.sessions).toBe(2)
    expect(s1.calls).toContain('clearCache')
    expect(s2.calls).toContain('clearCache')
  })
})

describe('clearCookiesOnQuit', () => {
  it('policy disabled → returns early, no session touched', async () => {
    const policy = createClearPolicy()
    policy.setEnabled(false)
    const ses = makeFakeSession([{ domain: 'example.com', name: 'x', path: '/' }])
    await clearCookiesOnQuit(policy, () => [ses])
    expect(ses.calls).toEqual([])
  })

  it('policy enabled → clears non-whitelisted cookies across provided sessions', async () => {
    const policy = createClearPolicy()
    policy.addWhitelist('keep.com')
    const ses = makeFakeSession([
      { domain: 'example.com', name: 'x', path: '/' },
      { domain: 'keep.com', name: 'login', path: '/' },
    ])
    const res = await clearCookiesOnQuit(policy, () => [ses])
    expect(res.removed).toBe(1)
    expect(ses.calls[0]).toBe('flushStore')
  })
})

describe('partition tracking', () => {
  beforeEach(() => resetTrackedPartitions())

  it('trackPartition records unique partitions; reset clears them', () => {
    trackPartition('persist:container-work')
    trackPartition('persist:container-work')
    trackPartition('persist:container-personal')
    expect(trackedPartitions().sort()).toEqual(['persist:container-personal', 'persist:container-work'])
    resetTrackedPartitions()
    expect(trackedPartitions()).toEqual([])
  })
})
