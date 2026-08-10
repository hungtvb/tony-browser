// Session store — undo đóng tab (Ctrl+Shift+T) + lưu/khôi phục session
import * as fs from 'fs'

export interface SessionTab {
  id: string
  url: string
  title: string
  container?: string
  favicon?: string
}

export function createSessionStore(persist?: SessionPersist<SessionTab>) {
  // load stack undo từ disk (nếu có persist) — giữ tối đa 50 phần tử như recordClosed
  const closed: SessionTab[] = (persist?.load() ?? []).slice(0, 50)
  let snapshot: SessionTab[] | null = null

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

  function saveSession(tabs: SessionTab[]) {
    snapshot = tabs.map(t => ({ ...t }))
  }

  function restoreSession(): SessionTab[] {
    return snapshot ? snapshot.map(t => ({ ...t })) : []
  }

  function clearSession() {
    snapshot = null
  }

  return { recordClosed, popClosed, closedCount, saveSession, restoreSession, clearSession }
}

// Persist danh sách session xuống disk dạng JSON (dùng cho SmartTab sessions)
export interface SessionPersist<T> {
  save(list: T[]): void
  load(): T[]
}

export function createSessionPersist<T>(file: string): SessionPersist<T> {
  function save(list: T[]) {
    try {
      fs.writeFileSync(file, JSON.stringify(list), 'utf-8')
    } catch { /* ignore — không crash app khi disk lỗi */ }
  }

  function load(): T[] {
    try {
      if (!fs.existsSync(file)) return []
      const parsed = JSON.parse(fs.readFileSync(file, 'utf-8'))
      return Array.isArray(parsed) ? parsed as T[] : []
    } catch {
      return [] // file hỏng → fallback rỗng, không crash
    }
  }

  return { save, load }
}