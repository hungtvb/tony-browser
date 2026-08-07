import { describe, it, expect, beforeEach } from 'vitest'
import { createSessionStore } from '../src/main/save/session-store'

describe('Session store', () => {
  let store: ReturnType<typeof createSessionStore>

  beforeEach(() => { store = createSessionStore() })

  it('tracks closed tabs (undo stack)', () => {
    store.recordClosed({ id: 'a', url: 'https://a.com', title: 'A' })
    store.recordClosed({ id: 'b', url: 'https://b.com', title: 'B' })
    const last = store.popClosed()
    expect(last?.url).toBe('https://b.com')
    expect(store.closedCount()).toBe(1)
  })

  it('returns empty when nothing closed', () => {
    expect(store.popClosed()).toBeNull()
  })

  it('saves and restores session snapshot', () => {
    store.saveSession([
      { id: 'a', url: 'https://a.com', title: 'A' },
      { id: 'b', url: 'https://b.com', title: 'B' },
    ])
    const restored = store.restoreSession()
    expect(restored).toHaveLength(2)
    expect(restored[0].url).toBe('https://a.com')
  })

  it('returns empty when no session saved', () => {
    expect(store.restoreSession()).toEqual([])
  })
})