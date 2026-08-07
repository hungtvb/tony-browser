import { describe, it, expect } from 'vitest'
import { createTabStacker, searchTabs } from '../src/main/tabs/stacker'

const tabs = [
  { id: 'a', url: 'https://github.com/facebook/react', title: 'facebook/react: The library' },
  { id: 'b', url: 'https://github.com/vercel', title: 'vercel' },
  { id: 'c', url: 'https://docs.google.com/spreadsheets', title: 'Google Sheets - data' },
  { id: 'd', url: 'https://youtube.com/watch?v=abc', title: 'YouTube - video' },
  { id: 'e', url: 'https://mail.google.com/', title: 'Gmail' },
]

describe('Tab Stacking', () => {
  it('groups same-domain tabs into stack', () => {
    const stacker = createTabStacker()
    const stacks = stacker.group(tabs as any)
    const github = stacks.find(s => s.label === 'github.com')!
    expect(github).toBeDefined()
    expect(github.tabs).toHaveLength(2)
    expect(github.tabs.map(t => t.id)).toEqual(['a', 'b'])
  })

  it('keeps single tabs as individual stacks', () => {
    const stacker = createTabStacker()
    const stacks = stacker.group(tabs as any)
    expect(stacks.filter(s => s.tabs.length === 1)).toHaveLength(3)
  })
})

describe('Search tabs', () => {
  it('finds by title keyword', () => {
    const results = searchTabs(tabs as any, 'youtube')
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('d')
  })

  it('finds by url keyword', () => {
    const results = searchTabs(tabs as any, 'docs.google')
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('c')
  })

  it('returns empty when no match', () => {
    const results = searchTabs(tabs as any, 'xyzzy')
    expect(results).toHaveLength(0)
  })

  it('is case-insensitive', () => {
    const results = searchTabs(tabs as any, 'YOUTUBE')
    expect(results).toHaveLength(1)
  })
})