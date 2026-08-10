// Session restore — reopen all saved tabs (no magic number slice(0,10))
export interface RestorableTab {
  url: string
  title?: string
  container?: string
  favicon?: string
}

/**
 * Reopen all tabs saved in the session, in the exact saved order.
 * @param saved    tab list read from disk (session.json)
 * @param onOpen   callback that opens one tab — lets index.ts wire it into TabManager + create the view
 * @returns number of tabs opened
 */
export function openRestoredTabs(saved: RestorableTab[], onOpen: (tab: RestorableTab) => void): number {
  if (!saved.length) return 0
  for (const s of saved) {
    onOpen(s)
  }
  return saved.length
}