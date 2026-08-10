import { describe, it, expect, beforeEach } from 'vitest'
import { createSessionStore, type SessionPersist, type SessionTab } from '../src/main/save/session-store'

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

  it('keeps favicon through the undo-close round-trip (issue #52)', () => {
    store.recordClosed({
      id: 'a', url: 'https://a.com', title: 'A',
      favicon: 'data:image/png;base64,AAAA',
    })
    const tab = store.popClosed()
    expect(tab?.favicon).toBe('data:image/png;base64,AAAA')
  })

  it('restored session snapshot keeps favicon (issue #52)', () => {
    store.saveSession([
      { id: 'a', url: 'https://a.com', title: 'A', favicon: 'data:image/png;base64,BBBB' },
      { id: 'b', url: 'https://b.com', title: 'B' },
    ])
    const restored = store.restoreSession()
    expect(restored[0].favicon).toBe('data:image/png;base64,BBBB')
    expect(restored[1].favicon).toBeUndefined()
  })
})

describe('Session store with disk persist (fix #34 — undo-close qua restart)', () => {
  function makeFakePersist(seed: SessionTab[] = []): SessionPersist<SessionTab> {
    let data: SessionTab[] = seed.map(t => ({ ...t }))
    return {
      save: (list: SessionTab[]) => { data = list.map(t => ({ ...t })) },
      load: () => data.map(t => ({ ...t })),
    }
  }

  it('restores undo stack from disk on restart — LIFO qua restart', () => {
    const persist = makeFakePersist()
    const store1 = createSessionStore(persist)
    store1.recordClosed({ id: 'a', url: 'https://a.com', title: 'A' })
    store1.recordClosed({ id: 'b', url: 'https://b.com', title: 'B' })

    // mô phỏng restart: store mới cùng persist instance (disk)
    const store2 = createSessionStore(persist)
    expect(store2.closedCount()).toBe(2)
    expect(store2.popClosed()?.id).toBe('b') // tab đóng gần nhất
    expect(store2.popClosed()?.id).toBe('a') // rồi tab cũ hơn — LIFO giữ qua restart
    expect(store2.closedCount()).toBe(0)
  })

  it('persists after popClosed — undo xong rồi restart vẫn đúng', () => {
    const persist = makeFakePersist()
    const store1 = createSessionStore(persist)
    store1.recordClosed({ id: 'a', url: 'https://a.com', title: 'A' })
    store1.recordClosed({ id: 'b', url: 'https://b.com', title: 'B' })
    expect(store1.popClosed()?.id).toBe('b')

    const store2 = createSessionStore(persist)
    expect(store2.closedCount()).toBe(1)
    expect(store2.popClosed()?.id).toBe('a')
  })

  it('caps loaded stack at 50 entries', () => {
    const seed = Array.from({ length: 60 }, (_, i) => ({ id: `t${i}`, url: `https://x${i}.com`, title: `T${i}` }))
    const store = createSessionStore(makeFakePersist(seed))
    expect(store.closedCount()).toBe(50)
  })

  it('keeps in-memory behavior when no persist given (backward compatible)', () => {
    const store = createSessionStore()
    store.recordClosed({ id: 'a', url: 'https://a.com', title: 'A' })
    store.recordClosed({ id: 'b', url: 'https://b.com', title: 'B' })
    expect(store.closedCount()).toBe(2)
    expect(store.popClosed()?.id).toBe('b')
  })
})