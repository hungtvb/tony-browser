// @vitest-environment jsdom
// FeatureBar renderer component (issue #77) — jsdom + testing-library.
// Tests the chip surfaces that exist on main: focus toggle, sleeper poll
// (RAM-heavy chip), layout toggle, and safe fallback when window.tony is missing.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import FeatureBar from '../src/renderer/components/FeatureBar'

describe('FeatureBar', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('renders focus chip, sleep count and brand', () => {
    render(<FeatureBar layout="top" onToggleLayout={() => {}} />)
    expect(screen.getByText('Focus Off')).toBeInTheDocument()
    expect(screen.getByText(/tabs asleep/)).toBeInTheDocument()
    expect(screen.getByText(/Tony Browser/)).toBeInTheDocument()
  })

  it('shows the RAM-heavy chip with the warned count from the sleeper poll', async () => {
    vi.stubGlobal('tony', {
      focus: { state: vi.fn(() => Promise.resolve({ enabled: false })) },
      sleeper: { evaluate: vi.fn(() => Promise.resolve({ sleeping: 1, warnings: ['tab-a', 'tab-b'] })) },
    })
    render(<FeatureBar layout="top" onToggleLayout={() => {}} />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000)
    })
    expect(screen.getByText(/2 RAM-heavy tabs/)).toBeInTheDocument()
  })

  it('does not render the RAM-heavy chip when the poll returns no warnings', async () => {
    vi.stubGlobal('tony', {
      focus: { state: vi.fn(() => Promise.resolve({ enabled: false })) },
      sleeper: { evaluate: vi.fn(() => Promise.resolve({ sleeping: 0, warnings: [] })) },
    })
    render(<FeatureBar layout="top" onToggleLayout={() => {}} />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000)
    })
    expect(screen.queryByText(/RAM-heavy tabs/)).not.toBeInTheDocument()
  })

  it('does not throw when window.tony is missing (poll fallback)', () => {
    expect(() => render(<FeatureBar layout="top" onToggleLayout={() => {}} />)).not.toThrow()
  })

  it('toggles focus chip and calls window.tony.focus.toggle', async () => {
    const toggle = vi.fn(() => Promise.resolve())
    vi.stubGlobal('tony', {
      focus: { state: vi.fn(() => Promise.resolve({ enabled: false })), toggle },
      sleeper: { evaluate: vi.fn(() => Promise.resolve({ sleeping: 0, warnings: [] })) },
    })
    render(<FeatureBar layout="top" onToggleLayout={() => {}} />)
    fireEvent.click(screen.getByText('Focus Off'))
    expect(toggle).toHaveBeenCalledWith(true)
    expect(screen.getByText('Focus On')).toBeInTheDocument()
  })

  it('calls onToggleLayout when the layout chip is clicked', () => {
    const onToggleLayout = vi.fn()
    render(<FeatureBar layout="top" onToggleLayout={onToggleLayout} />)
    fireEvent.click(screen.getByText('Horizontal'))
    expect(onToggleLayout).toHaveBeenCalledTimes(1)
  })
})
