// Issue #46 — favicon: pick the best favicon URL from Electron's page-favicon-updated
// payload (string[]). Prefer small data URLs (< 8KB, inline & offline-safe), else the
// first http(s) URL. Pure module so main-process wiring is unit-testable.
export const DATA_URL_LIMIT = 8 * 1024

export function pickFavicon(favicons: string[] | undefined): string | undefined {
  if (!favicons || favicons.length === 0) return undefined
  const smallData = favicons.find(f => f.startsWith('data:') && f.length <= DATA_URL_LIMIT)
  if (smallData) return smallData
  return favicons.find(f => /^https?:\/\//i.test(f)) ?? favicons[0]
}

export interface FaviconEventsTarget {
  on(ev: string, cb: (...args: any[]) => void): unknown
  isDestroyed?(): boolean
}

/**
 * Attach a page-favicon-updated listener and forward the picked favicon URL to
 * `onChange` (undefined when the page has no favicon). Safe no-op when destroyed.
 */
export function attachFaviconEvents(target: FaviconEventsTarget, onChange: (favicon: string | undefined) => void): void {
  if (target.isDestroyed?.()) return
  target.on('page-favicon-updated', (_e: unknown, favicons: string[]) => {
    onChange(pickFavicon(favicons))
  })
}
