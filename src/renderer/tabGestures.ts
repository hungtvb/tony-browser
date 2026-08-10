// Issue #48 — Tab UX gestures (middle-click close + wheel tab switching).
// Pure functions so TabBar.tsx wiring stays thin and this is unit-testable in node env.

export type WheelDirection = 'next' | 'prev'

/** Middle-click (button === 1) closes the tab. Left(0)/right(2) are ignored. */
export function isMiddleClickClose(e: { button: number }): boolean {
  return e.button === 1
}

/**
 * Map a wheel event to a tab-switch direction.
 * deltaY is the primary axis; when it is 0 (horizontal trackpad scroll) fall
 * back to deltaX. Returns null when there is no meaningful scroll.
 */
export function wheelDeltaToDirection(e: { deltaY: number; deltaX?: number }): WheelDirection | null {
  const y = e.deltaY
  if (y > 0) return 'next'
  if (y < 0) return 'prev'
  const x = e.deltaX ?? 0
  if (x > 0) return 'next'
  if (x < 0) return 'prev'
  return null
}

/**
 * Circular next/prev over tab ids. Active id missing from the list (e.g. just
 * closed) falls back to the first tab; empty list → undefined.
 */
export function nextTabId(
  ids: string[],
  activeId: string,
  dir: WheelDirection,
): string | undefined {
  if (ids.length === 0) return undefined
  let idx = ids.indexOf(activeId)
  if (idx === -1) return ids[0]
  if (dir === 'next') idx = (idx + 1) % ids.length
  else idx = (idx - 1 + ids.length) % ids.length
  return ids[idx]
}

/**
 * Throttle gate: allows the first call, then blocks calls until `intervalMs`
 * have elapsed since the last *allowed* call (debounce-style re-arm). Used to
 * stop a fast wheel spin from jumping multiple tabs at once.
 */
export function createWheelGate(intervalMs: number): () => boolean {
  let lastAllowed = -Infinity
  return () => {
    const now = Date.now()
    if (now - lastAllowed >= intervalMs) {
      lastAllowed = now
      return true
    }
    return false
  }
}
