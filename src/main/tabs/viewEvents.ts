// viewEvents (issues #42/#43) — forward webContents navigation/loading events to the tab manager.
// Kept as a tiny pure module so main-process wiring is unit-testable without Electron.
import type { WebContentsView } from 'electron'

export interface ViewEventHandlers {
  /** fired on did-navigate / did-navigate-in-page with the new URL */
  onNavigated?: (url: string) => void
  /** fired on did-start-loading (true) / did-stop-loading / did-fail-load (false) */
  onLoading?: (isLoading: boolean) => void
}

export function attachViewEvents(
  view: Pick<WebContentsView, 'webContents'>,
  handlers: ViewEventHandlers,
): void {
  const wc = view.webContents
  wc.on('did-start-loading', () => handlers.onLoading?.(true))
  wc.on('did-stop-loading', () => handlers.onLoading?.(false))
  wc.on('did-fail-load', () => handlers.onLoading?.(false))
  wc.on('did-navigate', (_e: unknown, url: string) => handlers.onNavigated?.(url))
  wc.on('did-navigate-in-page', (_e: unknown, url: string) => handlers.onNavigated?.(url))
}
