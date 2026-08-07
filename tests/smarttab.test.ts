import { describe, it, expect, beforeEach } from 'vitest'
import { createSmartTab, type GroupedTab } from '../src/main/smarttab/grouping'

const tabs = [
  { id: 'a', url: 'https://github.com/facebook/react', title: 'facebook/react: The library' },
  { id: 'b', url: 'https://github.com/vercel', title: 'vercel' },
  { id: 'c', url: 'https://docs.google.com/spreadsheets', title: 'Google Sheets - data' },
  { id: 'd', url: 'https://youtube.com/watch?v=abc', title: 'YouTube - video' },
  { id: 'e', url: 'https://mail.google.com/', title: 'Gmail' },
]

describe('SmartTab grouping', () => {
  it('groups by domain', () => {
    const g = createSmartTab()
    const groups: GroupedTab[] = g.groupByDomain(tabs as any[])
    expect(groups.length).toBe(4) // github (a,b), google (c,e), youtube (d)
    const gh = groups.find(x => x.label === 'github.com')!
    expect(gh.tabs.length).toBe(2)
  })

  it('labels groups with theme', () => {
    const g = createSmartTab()
    const groups = g.groupByTheme(tabs as any[])
    // github code tabs + google docs + youtube
    expect(groups.some(x => x.label.toLowerCase().includes('code'))).toBe(true)
  })

  it('round-trips sessions (save/restore)', () => {
    const g = createSmartTab()
    const session = g.saveSession(tabs as any[], 'Buổi sáng')
    expect(session.name).toBe('Buổi sáng')
    expect(session.tabs.length).toBe(5)
    const restored = g.restoreSession(session)
    expect(restored.map(t => t.url)).toEqual(tabs.map(t => t.url))
  })
})