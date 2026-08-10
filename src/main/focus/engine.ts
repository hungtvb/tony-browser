// Focus Engine — block distracting websites when Focus Mode is on
export interface FocusCheckResult {
  blocked: boolean
  reason?: 'focus'
}

export interface FocusEngine {
  enabled: boolean
  setEnabled(on: boolean): void
  setBlocklist(domains: string[]): void
  setWhitelist(patterns: string[]): void
  check(url: string): FocusCheckResult
}

export interface FocusOptions {
  blocklist: string[]
  whitelist: string[]
}

export function createFocusEngine(opts: FocusOptions): FocusEngine {
  let enabled = false
  let blocklist: string[] = opts.blocklist.map(normalizeDomain)
  let whitelist: string[] = opts.whitelist.map(normalizePattern)

  function normalizeDomain(d: string): string {
    return d.trim().toLowerCase().replace(/^\./, '').replace(/\/+$/, '')
  }

  function normalizePattern(p: string): string {
    return p.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '')
  }

  function hostOf(url: string): string {
    try { return new URL(url).hostname.toLowerCase() } catch { return '' }
  }

  function check(url: string): FocusCheckResult {
    if (!enabled) return { blocked: false }
    const host = hostOf(url)
    if (!host) return { blocked: false }

    // whitelist first (pattern can be a domain or domain/path)
    for (const w of whitelist) {
      const wHost = w.split('/')[0]
      const wPath = w.includes('/') ? w.slice(w.indexOf('/') + 1) : ''
      if (host === wHost || host.endsWith('.' + wHost)) {
        if (!wPath) return { blocked: false }
        const urlPath = url.split('#')[0].split('?')[0].replace(/^https?:\/\//, '').replace(/^[^/]+/, '')
        if (urlPath.startsWith('/' + wPath)) return { blocked: false }
      }
    }

    // blocklist
    for (const d of blocklist) {
      if (host === d || host.endsWith('.' + d)) return { blocked: true, reason: 'focus' }
    }
    return { blocked: false }
  }

  return {
    get enabled() { return enabled },
    setEnabled(on: boolean) { enabled = on },
    setBlocklist(list: string[]) { blocklist = list.map(normalizeDomain) },
    setWhitelist(list: string[]) { whitelist = list.map(normalizePattern) },
    check,
  }
}
