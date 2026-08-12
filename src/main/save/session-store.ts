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
      // atomic write: temp file + rename, so the on-disk file is always either the
      // old-complete or the new-complete content — never truncated (issue #122)
      const tmp = `${file}.tmp`
      fs.writeFileSync(tmp, JSON.stringify(list), 'utf-8')
      fs.renameSync(tmp, file)
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

// Debounced + atomic file persistence (issue #122 — cap session-store writes).
// Tab 'changed' events fire on open/close/activate/navigate/title/favicon — writing the
// whole session file synchronously on every event is wasted I/O. This wrapper:
//   1. debounces bursts of save() calls into a single write (delay ms of quiet),
//   2. skips the write entirely when the snapshot is unchanged since the last one
//      (no redundant JSON.stringify + rename on identical data),
//   3. writes atomically: temp file + rename, so session.json on disk is always
//      either the old-complete or the new-complete content (never truncated),
//   4. flush() writes synchronously — used on quit so the last state is not lost.
export function createDebouncedPersist<T>(base: SessionPersist<T>, delay = 500): SessionPersist<T> & { flush: () => void } {
  let pending: T[] | null = null
  let timer: NodeJS.Timeout | null = null
  let snapshot = ''

  function stringify(list: T[]): string {
    let out = ''
    try { out = JSON.stringify(list) } catch { /* un-serializable — fall through to write */ }
    return out
  }

  function writeLocked(list: T[]) {
    const next = stringify(list)
    if (next !== '' && next === snapshot) return // identical — no redundant write
    snapshot = next
    base.save(list)
  }

  function save(list: T[]) {
    pending = list
    if (delay <= 0) { writeLocked(list); return } // debounce disabled — immediate
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      if (pending) { writeLocked(pending); pending = null }
    }, delay)
  }

  function flush() {
    if (timer) { clearTimeout(timer); timer = null }
    if (pending) { writeLocked(pending); pending = null }
  }

  return { save, load: base.load, flush }
}