import { describe, it, expect, beforeEach } from 'vitest'
import { createCollection, type SavedPage } from '../src/main/save/collection'

describe('Save page collection', () => {
  let col: ReturnType<typeof createCollection>

  beforeEach(() => { col = createCollection() })

  it('adds a page', () => {
    const p = col.add('https://example.com', 'Example', 'default')
    expect(p.id).toBeDefined()
    expect(col.list()).toHaveLength(1)
  })

  it('removes a page', () => {
    const p = col.add('https://a.com', 'A', 'default')
    col.remove(p.id)
    expect(col.list()).toHaveLength(0)
  })

  it('persists via save/load round-trip', () => {
    col.add('https://b.com', 'B', 'work')
    const saved = col.save()
    const col2 = createCollection()
    col2.load(saved)
    expect(col2.list()).toHaveLength(1)
    expect(col2.list()[0].container).toBe('work')
  })
})