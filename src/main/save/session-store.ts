// Session store — undo closed tabs (Ctrl+Shift+T)
import * as fs from 'fs'

export interface SessionTab {
  id: string
  url: string
  title: string
  container?: string
  favicon?: string
}

export function createSessionStore(persist?: SessionPersist<SessionTab>) {
  // load the undo stack from disk (if persist is provided) — keep at most 50 entries like recordClosed
  const closed: SessionTab[] = (persist?.load() ?? []).slice(0, 50)

  function recordClosed(tab: SessionTab) {
    closed.unshift(tab)
    if (closed.length > 50) closed.pop()
    persist?.save(closed)
  }

  function popClosed(): SessionTab | null {
    const tab = closed.shift() ?? null
    persist?.save(closed)
    return tab
  }

  function closedCount(): number {
    return closed.length
  }

  return { recordClosed, popClosed, closedCount }
}

// Persist the session list to disk as JSON (used for SmartTab sessions)
export interface SessionPersist<T> {
  save(list: T[]): void
  load(): T[]
}

export function createSessionPersist<T>(file: string): SessionPersist<T> {
  function save(list: T[]) {
    try {
      fs.writeFileSync(file, JSON.stringify(list), 'utf-8')
    } catch { /* ignore — do not crash the app on disk errors */ }
  }

  function load(): T[] {
    try {
      if (!fs.existsSync(file)) return []
      const parsed = JSON.parse(fs.readFileSync(file, 'utf-8'))
      return Array.isArray(parsed) ? parsed as T[] : []
    } catch {
      return [] // corrupted file → empty fallback, do not crash
    }
  }

  return { save, load }
}