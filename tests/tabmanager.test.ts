import { describe, it, expect, vi } from 'vitest'
import { createTabManager, type View, type ViewFactory } from '../src/main/tabs/TabManager'

function makeVM() {
  const views: any[] = []
  const factory: ViewFactory = (id: string) => {
    const v = {
      id, url: '', destroyed: false,
      loadURL: (u: string) => { v.url = u },
      destroy: () => { v.destroyed = true },
    }
    views.push(v)
    return v as View
  }
  return { factory, views }
}

describe('TabManager', () => {
  it('opens a tab and sets active', () => {
    const { factory, views } = makeVM()
    const tm = createTabManager(factory)
    const t = tm.open('https://example.com')
    expect(t.id).toBeTruthy()
    expect(tm.activeId).toBe(t.id)
    expect(t.url).toBe('https://example.com')
    expect(views.length).toBe(1)
  })

  it('closes active tab and activates another', () => {
    const { factory, views } = makeVM()
    const tm = createTabManager(factory)
    const a = tm.open('https://a.com')
    const b = tm.open('https://b.com')
    tm.close(a.id)
    expect(tm.activeId).toBe(b.id)
    expect(tm.list().length).toBe(1)
    expect(views[0].destroyed).toBe(true)
  })

  it('activate switches active tab', () => {
    const { factory } = makeVM()
    const tm = createTabManager(factory)
    const a = tm.open('https://a.com')
    const b = tm.open('https://b.com')
    tm.activate(a.id)
    expect(tm.activeId).toBe(a.id)
  })

  it('open accepts a favicon and attaches it to the tab (issue #52)', () => {
    const { factory } = makeVM()
    const tm = createTabManager(factory)
    const t = tm.open('https://a.com', 'work', 'data:image/png;base64,FAV')
    expect(t.favicon).toBe('data:image/png;base64,FAV')
    expect(t.container).toBe('work')
  })

  it('open without favicon leaves tab.favicon undefined (issue #52)', () => {
    const { factory } = makeVM()
    const tm = createTabManager(factory)
    const t = tm.open('https://a.com')
    expect(t.favicon).toBeUndefined()
  })

  // ─── Issue #125 — reorder (sidebar drag & drop) ───

  it('reorder moves a tab to the target position (issue #125)', () => {
    const { factory } = makeVM()
    const tm = createTabManager(factory)
    const a = tm.open('https://a.com')
    const b = tm.open('https://b.com')
    const c = tm.open('https://c.com')
    expect(tm.reorder(c.id, a.id)).toBe(true)
    expect(tm.list().map(t => t.id)).toEqual([c.id, a.id, b.id])
  })

  it('reorder to a later position keeps the rest of the order stable (issue #125)', () => {
    const { factory } = makeVM()
    const tm = createTabManager(factory)
    const a = tm.open('https://a.com')
    const b = tm.open('https://b.com')
    const c = tm.open('https://c.com')
    // a takes c's slot (insert before the target); b stays put
    expect(tm.reorder(a.id, c.id)).toBe(true)
    expect(tm.list().map(t => t.id)).toEqual([b.id, a.id, c.id])
  })

  it('reorder with unknown ids is a no-op (issue #125)', () => {
    const { factory } = makeVM()
    const tm = createTabManager(factory)
    const a = tm.open('https://a.com')
    const b = tm.open('https://b.com')
    expect(tm.reorder('missing', a.id)).toBe(false)
    expect(tm.reorder(a.id, 'missing')).toBe(false)
    expect(tm.list().map(t => t.id)).toEqual([a.id, b.id])
  })

  it('reorder with from === to is a no-op (issue #125)', () => {
    const { factory } = makeVM()
    const tm = createTabManager(factory)
    const a = tm.open('https://a.com')
    expect(tm.reorder(a.id, a.id)).toBe(false)
    expect(tm.list().map(t => t.id)).toEqual([a.id])
  })

  it('reorder keeps the active tab and emits changed (issue #125)', () => {
    const { factory } = makeVM()
    const tm = createTabManager(factory)
    const a = tm.open('https://a.com')
    const b = tm.open('https://b.com')
    const c = tm.open('https://c.com')
    tm.activate(a.id)
    const spy = vi.fn()
    tm.on('changed', spy)
    expect(tm.reorder(c.id, b.id)).toBe(true)
    expect(tm.activeId).toBe(a.id)
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy.mock.calls[0][0]).toMatchObject({ type: 'reorder', id: c.id })
  })

  // ─── Issue #140 — moveToContainer (sidebar drag & drop Phase 2) ───
  it('moves a tab to another container and recreates its view (issue #140)', () => {
    const { factory, views } = makeVM()
    const tm = createTabManager(factory)
    const t = tm.open('https://a.com', 'work')
    expect(t.container).toBe('work')
    const ok = tm.moveToContainer(t.id, 'personal')
    expect(ok).toBe(true)
    const after = tm.get(t.id)!
    expect(after.container).toBe('personal')
    expect(after.url).toBe('https://a.com')
    // old view destroyed + a new view created and loaded the same URL
    expect(views[0].destroyed).toBe(true)
    expect(views.length).toBe(2)
    expect(views[1].url).toBe('https://a.com')
  })

  it('moveToContainer to the same container is a no-op (issue #140)', () => {
    const { factory, views } = makeVM()
    const tm = createTabManager(factory)
    const t = tm.open('https://a.com', 'work')
    expect(tm.moveToContainer(t.id, 'work')).toBe(false)
    expect(views.length).toBe(1)
    expect(views[0].destroyed).toBe(false)
  })

  it('moveToContainer with an unknown id is a no-op (issue #140)', () => {
    const { factory, views } = makeVM()
    const tm = createTabManager(factory)
    expect(tm.moveToContainer('missing', 'personal')).toBe(false)
    expect(views.length).toBe(0)
  })
})