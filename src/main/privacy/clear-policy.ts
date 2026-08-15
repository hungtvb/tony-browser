// Issue #124 — Privacy: auto-clear cookies/cache with site exception list.
// Pure policy: whitelist normalization/matching + state persistence (JSON in userData).
// No Electron dependency in the core — the file path is injected so tests can point
// anywhere (same pattern as src/main/focus/store.ts).
import * as fs from 'fs'
import * as path from 'path'

export interface ClearPolicyState {
  /** auto-clear cookies/cache on quit (default: true — session-only for non-whitelisted) */
  enabled: boolean
  /** normalized domains that KEEP their cookies across restarts (login persistence) */
  whitelist: string[]
}

export type ClearPolicyPatch = Partial<ClearPolicyState>

const DEFAULT_STATE: ClearPolicyState = { enabled: true, whitelist: [] }

/** 'https://Example.COM:8080/path?q=1' | 'www.example.com' → 'example.com' (lowercase, no protocol/path/port/www) */
export function normalizeDomain(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./, '')
    .split('/')[0]
    .split(':')[0]
}

/**
 * True when `urlOrDomain` (a URL or a bare host) belongs to a whitelisted domain
 * (exact match or any subdomain). Protocol/path/www are ignored on both sides.
 */
export function isWhitelisted(urlOrDomain: string, whitelist: string[]): boolean {
  const host = normalizeDomain(urlOrDomain)
  if (!host) return false
  return whitelist.some((entry) => {
    const d = normalizeDomain(entry)
    return d !== '' && (host === d || host.endsWith(`.${d}`))
  })
}

export function isValidState(v: unknown): v is ClearPolicyState {
  if (!v || typeof v !== 'object') return false
  const s = v as Record<string, unknown>
  return (
    typeof s.enabled === 'boolean' &&
    Array.isArray(s.whitelist) &&
    s.whitelist.every((x) => typeof x === 'string')
  )
}

export interface ClearPolicy {
  getState: () => ClearPolicyState
  setEnabled: (on: boolean) => void
  addWhitelist: (domain: string) => void
  removeWhitelist: (domain: string) => void
  apply: (patch: ClearPolicyPatch) => void
  isWhitelisted: (urlOrDomain: string) => boolean
}

/**
 * Create the cookie auto-clear policy. With `file` set, every mutation is persisted
 * to disk (JSON) and the initial state is loaded from it (corrupt/missing → defaults).
 */
export function createClearPolicy(opts?: { file?: string }): ClearPolicy {
  const file = opts?.file
  let state: ClearPolicyState = { ...DEFAULT_STATE }

  if (file) {
    try {
      if (fs.existsSync(file)) {
        const loaded = JSON.parse(fs.readFileSync(file, 'utf-8'))
        if (isValidState(loaded)) state = { ...loaded }
      }
    } catch {
      // corrupt file — keep defaults
    }
  }

  function persist() {
    if (!file) return
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true })
      fs.writeFileSync(file, JSON.stringify(state, null, 2), 'utf-8')
    } catch (e) {
      console.error('Could not save clear-policy:', e)
    }
  }

  return {
    getState: () => ({ ...state }),
    setEnabled: (on: boolean) => {
      state.enabled = on
      persist()
    },
    addWhitelist: (domain: string) => {
      const d = normalizeDomain(domain)
      if (d && !state.whitelist.includes(d)) {
        state.whitelist = [...state.whitelist, d]
        persist()
      }
    },
    removeWhitelist: (domain: string) => {
      const d = normalizeDomain(domain)
      state.whitelist = state.whitelist.filter((x) => x !== d)
      persist()
    },
    apply: (patch: ClearPolicyPatch) => {
      if (typeof patch.enabled === 'boolean') state.enabled = patch.enabled
      if (Array.isArray(patch.whitelist)) {
        state.whitelist = [...new Set(patch.whitelist.map(normalizeDomain).filter(Boolean))]
      }
      persist()
    },
    isWhitelisted: (urlOrDomain: string) => isWhitelisted(urlOrDomain, state.whitelist),
  }
}
