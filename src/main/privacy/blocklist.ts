// Privacy — blocklist matcher (Task 3.1, TDD)
export interface Blocklist {
  shouldBlock(url: string): boolean
  size: number
}

export function createBlocklist(domains: string[]): Blocklist {
  const set = new Set(domains.map(d => d.trim().toLowerCase().replace(/^\./, '')).filter(Boolean))
  return {
    shouldBlock(url: string): boolean {
      try {
        const host = new URL(url).hostname.toLowerCase()
        if (set.has(host)) return true
        for (const d of set) {
          if (host.endsWith('.' + d)) return true
        }
        return false
      } catch {
        return false
      }
    },
    get size() { return set.size },
  }
}
