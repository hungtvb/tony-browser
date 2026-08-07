// Smart Tab — controller: nhóm + lưu/khôi phục session, expose qua IPC
import { createSmartTab } from './grouping'
import type { TabSessionInfo, GroupedTabInfo } from '../../shared/types'
import type { TabState } from '../../shared/types'
import type { Tab } from '../tabs/TabManager'

export class SmartTabController {
  private smart = createSmartTab()
  private sessions: TabSessionInfo[] = []

  get sessionsList() { return [...this.sessions] }

  groupByDomain(tabs: Tab[]): GroupedTabInfo[] {
    const states: TabState[] = tabs.map(t => ({ id: t.id, url: t.url, title: t.title, loading: t.loading }))
    return this.smart.groupByDomain(states)
  }

  groupByTheme(tabs: Tab[]): GroupedTabInfo[] {
    const states: TabState[] = tabs.map(t => ({ id: t.id, url: t.url, title: t.title, loading: t.loading }))
    return this.smart.groupByTheme(states)
  }

  saveSession(tabs: Tab[], name?: string): TabSessionInfo {
    const states: TabState[] = tabs.map(t => ({ id: t.id, url: t.url, title: t.title, loading: t.loading }))
    const session = this.smart.saveSession(states, name)
    const info: TabSessionInfo = { name: session.name, createdAt: session.createdAt, tabs: session.tabs }
    this.sessions.unshift(info)
    if (this.sessions.length > 10) this.sessions.length = 10
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