// @vitest-environment jsdom
// FeatureBar renderer component (issue #77 + #72) — jsdom + testing-library.
// Issue #72 changed the API: the warned set now lives in App state and arrives
// via the `warnedIds` prop, fed by the proactive 'sleeper:warnings' event
// (subscribed via onWarnings → returns an unsubscribe fn) + the poll fallback.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react'
import FeatureBar from '../src/renderer/components/FeatureBar'

function renderBar(overrides: Partial<Parameters<typeof FeatureBar>[0]> = {}) {
  const props = {
    layout: 'top' as const,
    onToggleLayout: vi.fn(),
    warnedIds: [] as string[],
    onWarned: vi.fn(),
    focusOn: false,
    onToggleFocus: vi.fn(),
    ...overrides,
  }
  render(<FeatureBar {...props} />)
  return props
}

describe('FeatureBar', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('renders focus chip, sleep count and brand', () => {
    renderBar()
    expect(screen.getByText('Focus Off')).toBeInTheDocument()
    expect(screen.getByText(/tabs asleep/)).toBeInTheDocument()
    expect(screen.getByText(/Tony Browser/)).toBeInTheDocument()
  })

  it('shows the RAM-heavy chip from the warnedIds prop', () => {
    renderBar({ warnedIds: ['tab-a', 'tab-b'] })
    expect(screen.getByText(/2 RAM-heavy tabs/)).toBeInTheDocument()
  })

  it('does not render the RAM-heavy chip when warnedIds is empty', () => {
    renderBar({ warnedIds: [] })
    expect(screen.queryByText(/RAM-heavy tabs/)).not.toBeInTheDocument()
  })

  it('forwards poll warnings to onWarned (fallback) and subscribes to the proactive event', async () => {
    const onWarned = vi.fn()
    const unsubscribe = vi.fn()
    vi.stubGlobal('tony', {
      focus: { state: vi.fn(() => Promise.resolve({ enabled: false })) },
      sleeper: {
        evaluate: vi.fn(() => Promise.resolve({ sleeping: 1, warnings: ['tab-a', 'tab-b'] })),
        onWarnings: vi.fn(() => unsubscribe),
      },
    })
    render(<FeatureBar layout="top" onToggleLayout={vi.fn()} warnedIds={[]} onWarned={onWarned} focusOn={false} onToggleFocus={vi.fn()} />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000)
    })
    expect(onWarned).toHaveBeenCalledWith(['tab-a', 'tab-b'])
    expect(window.tony?.sleeper.onWarnings).toHaveBeenCalledWith(onWarned)
  })

  it('calls the unsubscribe fn returned by onWarnings on unmount (no listener leak)', async () => {
    const unsubscribe = vi.fn()
    vi.stubGlobal('tony', {
      focus: { state: vi.fn(() => Promise.resolve({ enabled: false })) },
      sleeper: { evaluate: vi.fn(() => Promise.resolve({ sleeping: 0, warnings: [] })), onWarnings: vi.fn(() => unsubscribe) },
    })
    const { unmount } = render(<FeatureBar layout="top" onToggleLayout={vi.fn()} warnedIds={[]} onWarned={vi.fn()} focusOn={false} onToggleFocus={vi.fn()} />)
    unmount()
    expect(unsubscribe).toHaveBeenCalledTimes(1)
  })

  it('does not throw when window.tony is missing (poll fallback)', () => {
    expect(() => renderBar()).not.toThrow()
  })

  it('toggles focus chip via onToggleFocus prop and reflects focusOn', async () => {
    const onToggleFocus = vi.fn()
    renderBar({ focusOn: false, onToggleFocus })
    fireEvent.click(screen.getByText('Focus Off'))
    expect(onToggleFocus).toHaveBeenCalledTimes(1)
    expect(window.tony?.focus?.toggle).not.toBeDefined()
  })

  it('renders Focus On when focusOn is true (controlled by App)', () => {
    renderBar({ focusOn: true })
    expect(screen.getByText('Focus On')).toBeInTheDocument()
  })

  it('still renders focus chip when window.tony is missing (props drive state)', () => {
    expect(() => renderBar({ focusOn: false })).not.toThrow()
  })

  it('calls onToggleLayout when the layout chip is clicked', () => {
    const props = renderBar()
    fireEvent.click(screen.getByText('Horizontal'))
    expect(props.onToggleLayout).toHaveBeenCalledTimes(1)
  })
})