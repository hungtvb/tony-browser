// Tab Stacking + Search — groups tabs by domain, searches tab content
export interface StackableTab {
  id: string
  url: string
  title: string
}

export interface TabStack {
  label: string
  tabs: StackableTab[]
}

function hostOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, '').toLowerCase() } catch { return 'other' }
}

/** Group tabs by domain — tabs sharing a domain become one stack */
export function createTabStacker() {
  function group(tabs: StackableTab[]): TabStack[] {
    const map = new Map<string, StackableTab[]>()
    for (const t of tabs) {
      const host = hostOf(t.url)
      const list = map.get(host) ?? []
      list.push(t)
      map.set(host, list)
    }
    return [...map.entries()]
      .map(([label, list]) => ({ label, tabs: list }))
      .sort((a, b) => b.tabs.length - a.tabs.length)
  }
  return { group }
}

/** Find tabs by keyword in title/url */
export function searchTabs(tabs: StackableTab[], query: string): StackableTab[] {
  const q = query.toLowerCase().trim()
  if (!q) return []
  return tabs.filter(t =>
    t.title.toLowerCase().includes(q) ||
    t.url.toLowerCase().includes(q)
  )
}