// Issue #121 — FeatureBar sleeper poll must respect window/document visibility:
// while hidden, the poll cadence slows 3x (10s -> 30s); on becoming visible again
// an immediate evaluate() fires so the "N tabs asleep" chip refreshes right away.
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, act } from '@testing-library/react'
import FeatureBar from '../src/renderer/components/FeatureBar'
import { HIDDEN_SLEEPER_POLL_MS, VISIBLE_SLEEPER_POLL_MS } from '../src/shared/perf-visibility'

function mockTony() {
  const evaluate = vi.fn().mockResolvedValue({ sleeping: 0, warnings: [] })
  window.tony = {
    sleeper: {
      evaluate,
      onWarnings: vi.fn(() => () => {}),
      activity: vi.fn(),
    },
  } as never
  return { evaluate }
}

describe('FeatureBar hidden-window polling (issue #121)', () => {
  beforeEach(() => {
    window.tony = undefined as never
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    cleanup()
  })

  it('skips the sleeper evaluate body while the document is hidden', async () => {
    const { evaluate } = mockTony()
    render(<FeatureBar layout="top" onToggleLayout={vi.fn()} warnedIds={[]} onWarned={vi.fn()} focusOn={false} onToggleFocus={vi.fn()} />)
    await act(async () => { await Promise.resolve() })

    // first visible tick fires an evaluate
    await act(async () => { vi.advanceTimersByTime(VISIBLE_SLEEPER_POLL_MS) })
    const visibleCalls = evaluate.mock.calls.length

    // hide the document -> the next tick body is skipped entirely
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
    await act(async () => { vi.advanceTimersByTime(HIDDEN_SLEEPER_POLL_MS) })
    expect(evaluate.mock.calls.length).toBe(visibleCalls)

    // visible again -> polling resumes
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
    await act(async () => { vi.advanceTimersByTime(VISIBLE_SLEEPER_POLL_MS) })
    expect(evaluate.mock.calls.length).toBe(visibleCalls + 1)
  })

  it('fires an immediate evaluate when the window becomes visible again', async () => {
    const { evaluate } = mockTony()
    render(<FeatureBar layout="top" onToggleLayout={vi.fn()} warnedIds={[]} onWarned={vi.fn()} focusOn={false} onToggleFocus={vi.fn()} />)
    await act(async () => { await Promise.resolve() })
    const before = evaluate.mock.calls.length

    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
    document.dispatchEvent(new Event('visibilitychange'))
    await act(async () => { await Promise.resolve() })

    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
    document.dispatchEvent(new Event('visibilitychange'))
    await act(async () => { await Promise.resolve(); await Promise.resolve() })

    expect(evaluate.mock.calls.length).toBe(before + 1)
  })

  it('the "tabs asleep" status chip renders the sleeping count', async () => {
    const evaluate = vi.fn().mockResolvedValue({ sleeping: 0, warnings: [] })
    window.tony = {
      sleeper: { evaluate, onWarnings: vi.fn(() => () => {}), activity: vi.fn() },
    } as never
    render(<FeatureBar layout="top" onToggleLayout={vi.fn()} warnedIds={[]} onWarned={vi.fn()} focusOn={false} onToggleFocus={vi.fn()} />)
    evaluate.mockResolvedValue({ sleeping: 3, warnings: [] })
    // first visible tick feeds the chip
    await act(async () => { vi.advanceTimersByTime(VISIBLE_SLEEPER_POLL_MS) })
    await act(async () => { await Promise.resolve() })
    expect(screen.getByText('3 tabs asleep')).toBeInTheDocument()
  })
})