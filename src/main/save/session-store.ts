// Session store — undo đóng tab (Ctrl+Shift+T) + lưu/khôi phục session
export interface SessionTab {
  id: string
  url: string
  title: string
  container?: string
}

export function createSessionStore() {
  const closed: SessionTab[] = []
  let snapshot: SessionTab[] | null = null

  function recordClosed(tab: SessionTab) {
    closed.unshift(tab)
    if (closed.length > 50) closed.pop()
  }

  function popClosed(): SessionTab | null {
    return closed.shift() ?? null
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