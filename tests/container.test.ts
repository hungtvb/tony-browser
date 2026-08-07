import { describe, it, expect } from 'vitest'
import { createTabManager } from '../src/main/tabs/TabManager'

function makeFactory() {
  const views: any[] = []
  const factory = (id: string) => {
    const v = { id, loadURL: () => {}, destroy: () => {} }
    views.push(v)
    return v
  }
  return { factory, views }
}

describe('TabManager with containers', () => {
  it('opens tab with default container', () => {
    const { factory } = makeFactory()
    const tm = createTabManager(factory)
    const tab = tm.open('https://example.com')
    expect(tab.container).toBe('default')
  })

  it('opens tab with specified container', () => {
    const { factory } = makeFactory()
    const tm = createTabManager(factory)
    const tab = tm.open('https://work.example.com', 'work')
    expect(tab.container).toBe('work')
  })

  it('lists tabs per container', () => {
    const { factory } = makeFactory()
    const tm = createTabManager(factory)
    tm.open('https://a.com', 'work')
    tm.open('https://b.com', 'personal')
    const work = tm.listByContainer('work')
    expect(work).toHaveLength(1)
    expect(work[0].url).toBe('https://a.com')
  })

  it('active tab fallback when closing active in container', () => {
    const { factory } = makeFactory()
    const tm = createTabManager(factory)
    const a = tm.open('https://a.com', 'work')
    tm.close(a.id)
    expect(tm.activeId).toBe('')
  })
})