// Issue #43 — progress bar state machine (renderer).
// Pure module so the "loading → 90% → done → 100% + fade" behaviour is unit-testable.
export type ProgressPhase = 'idle' | 'loading' | 'done'

/** Max width (percent) while a page is loading — real progress events are not needed. */
export const PROGRESS_LOADING_WIDTH = 90

export function nextPhase(prev: ProgressPhase, isLoading: boolean): ProgressPhase {
  if (isLoading) return 'loading'
  if (prev === 'loading') return 'done'
  return 'idle'
}

export function phaseStyle(phase: ProgressPhase): { width: string; opacity: number } {
  switch (phase) {
    case 'loading': return { width: `${PROGRESS_LOADING_WIDTH}%`, opacity: 1 }
    case 'done': return { width: '100%', opacity: 0 }
    default: return { width: '0%', opacity: 0 }
  }
}
