// Smart Tab — groups tabs, saves/restores sessions
import type { TabState } from '../../shared/types'
import type { Tab } from '../tabs/TabManager'

export interface GroupedTab {
  label: string
  tabs: TabState[]
}

export interface TabSession {
  name: string
  createdAt: number
  tabs: { url: string; title: string }[]
}

export interface SmartTab {
  groupByDomain(tabs: TabState[]): GroupedTab[]
  groupByTheme(tabs: TabState[]): GroupedTab[]
  saveSession(tabs: TabState[], name?: string): TabSession
  restoreSession(session: TabSession): { url: string; title: string }[]
}

const THEME_KEYWORDS: Record<string, string[]> = {
  '💻 Code & Dev': ['github.com', 'gitlab.com', 'stackoverflow', 'npm', 'jsfiddle', 'codesandbox'],
  '📄 Docs & Office': ['docs.google', 'sheets', 'slides', 'notion', 'office.com', 'dropbox'],
  '🎬 Entertainment': ['youtube', 'netflix', 'spotify', 'tiktok', 'twitch'],
  '📧 Email': ['mail.', 'gmail', 'outlook', 'yahoo.com/mail'],
  '🛒 Shopping': ['shopee', 'lazada', 'tiki', 'amazon', 'shopify'],
  '📰 News': ['news', 'vnexpress', 'dantri', 'tuoitre', 'zalo', 'vlog'],
}

export function createSmartTab(): SmartTab {
  function hostOf(url: string): string {
    try { return new URL(url).hostname.replace(/^www\./, '').toLowerCase() } catch { return '' }
  }

  function groupByDomain(tabs: TabState[]): GroupedTab[] {
    const map = new Map<string, TabState[]>()
    for (const t of tabs) {
      const host = hostOf(t.url) || 'other'
      const list = map.get(host) ?? []
      list.push(t)
      map.set(host, list)
    }
    return [...map.entries()].map(([label, t]) => ({ label, tabs: t }))
  }

  function classify(url: string): string {
    const host = hostOf(url)
    const full = (host + ' ' + url).toLowerCase()
    for (const [theme, kws] of Object.entries(THEME_KEYWORDS)) {
      if (kws.some(k => full.includes(k))) return theme
    }
    return '🌐 Other'
  }

  function groupByTheme(tabs: Tab[]): GroupedTab[] {
    const map = new Map<string, TabState[]>()
    for (const t of tabs) {
      const theme = classify(t.url)
      const list = map.get(theme) ?? []
      list.push(t)
      map.set(theme, list)
    }
    return [...map.entries()].map(([label, t]) => ({ label, tabs: t }))
  }

  function saveSession(tabs: Tab[], name?: string): TabSession {
    return {
      name: name ?? `Session ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`,
      createdAt: Date.now(),
      tabs: tabs.map(t => ({ url: t.url, title: t.title || t.url })),
    }
  }

  function restoreSession(session: TabSession): { url: string; title: string }[] {
    return session.tabs
  }

  return { groupByDomain, groupByTheme, saveSession, restoreSession }
}