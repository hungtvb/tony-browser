// Issue #91 — StatusBar gets a real privacy control: an "Adblock" toggle chip
// (wire direction for privacy.toggle). The chip is rendered next to the status
// text, reflects the current on/off state, and calls onTogglePrivacy(!on) on click.
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { StatusBar } from '../src/renderer/components/Feedback'

describe('StatusBar privacy toggle (issue #91)', () => {
  afterEach(() => cleanup())

  it('renders the Adblock chip with the current state when privacyOn is provided', () => {
    render(<StatusBar status="" privacyOn={true} onTogglePrivacy={vi.fn()} />)
    expect(screen.getByText('Adblock On')).toBeInTheDocument()
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('renders Adblock Off when privacy is disabled', () => {
    render(<StatusBar status="" privacyOn={false} onTogglePrivacy={vi.fn()} />)
    expect(screen.getByText('Adblock Off')).toBeInTheDocument()
  })

  it('calls onTogglePrivacy with the inverted state on click', () => {
    const onToggle = vi.fn()
    render(<StatusBar status="" privacyOn={true} onTogglePrivacy={onToggle} />)
    fireEvent.click(screen.getByText('Adblock On'))
    expect(onToggle).toHaveBeenCalledWith(false)
  })

  it('still renders the status text next to the toggle', () => {
    render(<StatusBar status="Blocked 5 requests" privacyOn={true} onTogglePrivacy={vi.fn()} />)
    expect(screen.getByText('Blocked 5 requests')).toBeInTheDocument()
    expect(screen.getByText('Adblock On')).toBeInTheDocument()
  })

  it('hides completely when idle and no privacy props are passed (backward compatible)', () => {
    const { container } = render(<StatusBar status="" />)
    expect(container.firstChild).toBeNull()
  })
})
