import { describe, it, expect } from 'vitest'
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
})