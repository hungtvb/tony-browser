// Issue #121 — guard multi-window/hidden-window perf.
// Shared visibility helpers used by:
//  - renderer (FeatureBar): skip/slow the sleeper poll while the window is hidden
//    (document.hidden is true when the BrowserWindow is minimized/hidden on most
//    platforms; document.visibilityState === 'hidden' also covers tab switches)
//  - main (ipc.ts sleeper:evaluate): skip per-tab memory sampling while the
//    window is hidden — getAppMetrics() walk + IPC wake cost is wasted work
//    when the user isn't looking.

export interface WindowLike {
  isDestroyed(): boolean
  isMinimized(): boolean
  isVisible(): boolean
}

export const VISIBLE_SLEEPER_POLL_MS = 10_000 // 10s — keep the chip fresh while visible
export const HIDDEN_SLEEPER_POLL_MS = 30_000 // 30s — 3x slower while hidden (issue #121)

/** True when the main BrowserWindow is hidden/minimized/gone → main-side work can be skipped. */
export function isWindowHidden(win: WindowLike | null | undefined): boolean {
  if (!win) return true
  try {
    if (typeof win.isDestroyed === 'function' && win.isDestroyed()) return true
    if (typeof win.isMinimized === 'function' && win.isMinimized()) return true
    if (typeof win.isVisible === 'function' && !win.isVisible()) return true
    // no window-like methods (e.g. a test stub with only webContents) → assume visible
    return false
  } catch {
    // destroyed mid-call — treat as hidden
    return true
  }
}

/** Renderer-side visibility: document.hidden covers minimized/hidden/occluded windows. */
export function isDocumentHidden(doc: Pick<Document, 'hidden'> | Document | undefined): boolean {
  return !doc || doc.hidden
}

/** Sleeper poll cadence: 10s visible, 30s hidden (3x slower → 1/3 of the IPC wakes). */
export function sleeperPollMs(hidden: boolean): number {
  return hidden ? HIDDEN_SLEEPER_POLL_MS : VISIBLE_SLEEPER_POLL_MS
}