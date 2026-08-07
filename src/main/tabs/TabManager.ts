import { EventEmitter } from 'events'

export interface View {
  id: string
  loadURL(u: string): void
  destroy(): void
}

export type ViewFactory = (id: string) => View

export interface Tab {
  id: string
  url: string
  title: string
  loading: boolean
  view: View
}

export type TabEvent = { type: 'open' | 'close' | 'activate'; id: string }

export function createTabManager(factory: ViewFactory) {
  const emitter = new EventEmitter()
  const tabs = new Map<string, Tab>()
  let activeId = ''
  let counter = 0

  function open(url: string): Tab {
    const id = `tab-${++counter}-${Date.now()}`
    const view = factory(id)
    const tab: Tab = { id, url, title: 'New Tab', loading: true, view }
    tabs.set(id, tab)
    activeId = id
    view.loadURL(url)
    emitter.emit('changed', { type: 'open', id })
    return tab
  }

  function close(id: string) {
    const tab = tabs.get(id)
    if (!tab) return
    tab.view.destroy()
    tabs.delete(id)
    if (activeId === id) {
      const remaining = [...tabs.keys()]
      activeId = remaining.length ? remaining[remaining.length - 1] : ''
    }
    emitter.emit('changed', { type: 'close', id })
  }

  function activate(id: string) {
    if (!tabs.has(id)) return
    activeId = id
    emitter.emit('changed', { type: 'activate', id })
  }

  function list(): Tab[] {
    return [...tabs.values()]
  }

  function get(id: string): Tab | undefined {
    return tabs.get(id)
  }

  function getActive(): Tab | undefined {
    return tabs.get(activeId)
  }

  /** Phát event changed + gọi callback broadcast (renderer sync) */
  function broadcast() {
    emitter.emit('changed', { type: 'sync', id: activeId })
  }

  return {
    open,
    close,
    activate,
    list,
    get,
    getActive,
    broadcast,
    on: emitter.on.bind(emitter),
    get activeId() { return activeId },
  }
}
