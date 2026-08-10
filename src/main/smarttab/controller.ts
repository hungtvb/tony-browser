// Smart Tab — controller: groups + saves/restores sessions, exposes via IPC
import { createSmartTab } from './grouping'
import type { TabSessionInfo, GroupedTabInfo } from '../../shared/types'
import type { TabState } from '../../shared/types'
import type { Tab } from '../tabs/TabManager'

export interface SmartTabPersist {
  save(list: TabSessionInfo[]): void
  load(): TabSessionInfo[]
}

function isValidSession(s: TabSessionInfo | null | undefined): s is TabSessionInfo {
  if (!s || typeof s !== 'object') return false
  if (typeof s.name !== 'string' || !s.name) return false
  if (typeof s.createdAt !== 'number') return false
  return Array.isArray(s.tabs) && s.tabs.every(t => t && typeof t.url === 'string' && typeof t.title === 'string')
}

export class SmartTabController {
  private smart = createSmartTab()
  private sessions: TabSessionInfo[] = []
  private persist?: SmartTabPersist

  constructor(persist?: SmartTabPersist) {
    this.persist = persist
    if (persist) {
      try {
        const loaded = persist.load()
        if (Array.isArray(loaded)) {
          this.sessions = loaded.filter(isValidSession)
        }
      } catch { /* persist failed → start with an empty list */ }
    }
  }

  get sessionsList() { return [...this.sessions] }

  groupByDomain(tabs: Tab[]): GroupedTabInfo[] {
    const states: TabState[] = tabs.map(t => ({ id: t.id, url: t.url, title: t.title, loading: t.loading, container: t.container ?? 'default' }))
    return this.smart.groupByDomain(states)
  }

  groupByTheme(tabs: Tab[]): GroupedTabInfo[] {
    const states: TabState[] = tabs.map(t => ({ id: t.id, url: t.url, title: t.title, loading: t.loading, container: t.container ?? 'default' }))
    return this.smart.groupByTheme(states)
  }

  saveSession(tabs: Tab[], name?: string): TabSessionInfo {
    const states: TabState[] = tabs.map(t => ({ id: t.id, url: t.url, title: t.title, loading: t.loading, container: t.container ?? 'default' }))
    const session = this.smart.saveSession(states, name)
    const info: TabSessionInfo = { name: session.name, createdAt: session.createdAt, tabs: session.tabs }
    this.sessions.unshift(info)
    if (this.sessions.length > 10) this.sessions.length = 10
    this.persist?.save(this.sessions)
    return info
  }

  restoreSession(name: string): { url: string; title: string }[] {
    const s = this.sessions.find(x => x.name === name)
    if (!s) return []
    return s.tabs
  }

  listSessions(): TabSessionInfo[] {
    return this.sessions
  }
}
