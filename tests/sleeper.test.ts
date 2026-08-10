import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTabSleeper } from '../src/main/perf/sleeper'

function makeTab(id: string, lastActive = Date.now()) {
  return { id, url: `https://site${id}.com`, lastActive }
}

describe('TabSleeper', () => {
  let sleeper: ReturnType<typeof createTabSleeper>

  beforeEach(() => {
    vi.useFakeTimers()
    sleeper = createTabSleeper({ idleMs: 10 * 60 * 1000 }) // 10 minutes
  })

  it('reports sleeping tabs after idle threshold', () => {
    const old = Date.now() - 11 * 60 * 1000
    const tabs = [makeTab('a', old), makeTab('b', Date.now())]
    const result = sleeper.evaluate(tabs as any)
    expect(result.toSleep).toContain('a')
    expect(result.toSleep).not.toContain('b')
  })

  it('does not sleep the active tab', () => {
    const old = Date.now() - 30 * 60 * 1000
    const tabs = [makeTab('a', old), makeTab('b', Date.now())]
    const result = sleeper.evaluate(tabs as any, 'a')
    expect(result.toSleep).not.toContain('a')
  })

  it('flags heavy memory tabs as warning', () => {
    const heavy = makeTab('h')
    ;(heavy as any).memoryMB = 800
    const light = makeTab('l')
    ;(light as any).memoryMB = 100
    const result = sleeper.evaluate([heavy, light] as any)
    expect(result.warnings).toContain('h')
    expect(result.warnings).not.toContain('l')
  })

  it('excludes whitelisted tab ids from sleep', () => {
    const old = Date.now() - 20 * 60 * 1000
    const tabs = [makeTab('keep', old), makeTab('drop', old)]
    const result = sleeper.evaluate(tabs as any, undefined, ['keep'])
    expect(result.toSleep).not.toContain('keep')
    expect(result.toSleep).toContain('drop')
  })

  it('resets lastActive on activity', () => {
    const old = Date.now() - 20 * 60 * 1000
    const tab = makeTab('a', old)
    sleeper.evaluate([tab] as any)
    sleeper.recordActivity('a')
    const next = sleeper.evaluate([{ ...tab, lastActive: old }] as any)
    expect(next.toSleep).not.toContain('a')
  })
})