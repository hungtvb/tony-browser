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
  container: string
  /** Favicon URL (data URL when < 8KB, otherwise http(s) URL) — undefined when the page has no favicon */
  favicon?: string
  /** Lần cuối tab được mở/activate — nguồn cho TabSleeper quyết định ngủ tab nền */
  lastActive?: number
}

export type TabEvent = { type: 'open' | 'close' | 'activate'; id: string }

export function createTabManager(factory: ViewFactory) {
  const emitter = new EventEmitter()
  const tabs = new Map<string, Tab>()
  let activeId = ''
  let counter = 0

  function open(url: string, container = 'default', favicon?: string): Tab {
    const id = `tab-${++counter}-${Date.now()}`
    const view = factory(id)
    const tab: Tab = {
      id, url, title: 'New Tab', loading: true, view, container,
      lastActive: Date.now(),
      ...(favicon !== undefined ? { favicon } : {}),
    }
    tabs.set(id, tab)
    activeId = id
    view.loadURL(url)
    emitter.emit('changed', { type: 'open', id })
    return tab
  }

  function listByContainer(container: string): Tab[] {
    return [...tabs.values()].filter(t => t.container === container)
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
    const tab = tabs.get(id)!
    tab.lastActive = Date.now()
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
    listByContainer,
    get,
    getActive,
    broadcast,
    on: emitter.on.bind(emitter),
    get activeId() { return activeId },
  }
}
