import { describe, it, expect } from 'vitest'
import { openRestoredTabs } from '../src/main/save/session-restore'

describe('Session restore — opens all saved tabs (no magic-number cutoff)', () => {
  it('restores all 12+ tabs saved in the session (no slice(0,10))', () => {
    const saved = Array.from({ length: 15 }, (_, i) => ({
      url: `https://site${i}.com`,
      title: `Site ${i}`,
      container: i % 2 === 0 ? 'default' : 'work',
    }))
    const opened: string[] = []
    const count = openRestoredTabs(saved, (s) => opened.push(s.url))
    expect(count).toBe(15)
    expect(opened).toHaveLength(15)
    expect(opened[14]).toBe('https://site14.com')
  })

  it('restores in the exact order the session saved (tabs 11+ are not dropped)', () => {
    const saved = Array.from({ length: 12 }, (_, i) => ({
      url: `https://tab${i}.com`,
      title: `Tab ${i}`,
    }))
    const opened: string[] = []
    openRestoredTabs(saved, (s) => opened.push(s.url))
    expect(opened.slice(0, 3)).toEqual(['https://tab0.com', 'https://tab1.com', 'https://tab2.com'])
    expect(opened).toContain('https://tab10.com')
    expect(opened).toContain('https://tab11.com')
  })

  it('empty session → opens no tabs', () => {
    const opened: string[] = []
    const count = openRestoredTabs([], (s) => opened.push(s.url))
    expect(count).toBe(0)
    expect(opened).toHaveLength(0)
  })

  it('passes favicon through to the onOpen callback (issue #52)', () => {
    const saved = [
      { url: 'https://a.com', title: 'A', container: 'work', favicon: 'data:image/png;base64,FAV1' },
      { url: 'https://b.com', title: 'B' },
    ]
    const opened: any[] = []
    const count = openRestoredTabs(saved, (s) => opened.push(s))
    expect(count).toBe(2)
    expect(opened[0].favicon).toBe('data:image/png;base64,FAV1')
    expect(opened[1].favicon).toBeUndefined()
  })
})