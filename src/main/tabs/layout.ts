// Shared layout for WebContentsView — computes bounds from the current window size
// Used for resize, split, open/close tab alike. Avoids scattered manual setBounds calls.
import { computeSplitBounds, type Bounds } from './split'

/** Number of visible views: 1 (full) or 2 (split) */
export function layoutBounds(
  viewCount: 1 | 2,
  winWidth: number,
  winHeight: number,
  toolbarHeight = 92,
): [Bounds, Bounds?] {
  if (viewCount === 2) return computeSplitBounds(winWidth, winHeight, toolbarHeight, true)
  return computeSplitBounds(winWidth, winHeight, toolbarHeight, false)
}

/**
 * Compute bounds for a list of views based on the current split state.
 * splitIds: list of tab ids currently split (length 2 → split; 1 → full).
 * Returns a bounds array of the same length as the number of visible views.
 */
export function computeLayoutBounds(
  splitIds: string[],
  winWidth: number,
  winHeight: number,
  toolbarHeight = 92,
): Bounds[] {
  const [a, b] = layoutBounds(splitIds.length >= 2 ? 2 : 1, winWidth, winHeight, toolbarHeight)
  return b ? [a, b] : [a]
}

/**
 * Plan the layout for ALL tabs: which tab is visible, its bounds, which tab is hidden.
 * Bounds are assigned by position in the VISIBLE LIST (full → [activeId], split → splitIds),
 * NOT by the tab's index in tm.list() — avoids misassigning bounds when the active
 * tab is not the first in the list (leftover bug #14).
 */
export function planLayout(
  tabIds: string[],
  splitIds: string[],
  activeId: string,
  winWidth: number,
  winHeight: number,
  toolbarHeight = 92,
): { id: string; bounds: Bounds; visible: boolean }[] {
  // split only when both ids still exist in tabIds — if one id is gone (tab closed mid-way) treat as full
  const split = splitIds.length >= 2 && splitIds.every(id => tabIds.includes(id))
  const showIds = split ? splitIds : [activeId]
  const bounds = computeLayoutBounds(showIds, winWidth, winHeight, toolbarHeight)
  return tabIds.map(id => {
    const idx = showIds.indexOf(id)
    const visible = idx >= 0
    return {
      id,
      bounds: visible ? bounds[idx] : bounds[0],
      visible,
    }
  })
}