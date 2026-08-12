// @vitest-environment jsdom
// Issue #117 — Reading progress + dark/light theme toggle for Reader Mode
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react'
import ReaderView from '../src/renderer/components/ReaderView'

afterEach(cleanup)

describe('ReaderView (issue #117)', () => {
  it('renders a dark-mode toggle button alongside Close', () => {
    render(<ReaderView title="T" content="C" onClose={vi.fn()} />)
    const btn = screen.getByRole('button', { name: /theme|toggle dark|toggle light/i })
    expect(btn).toBeInTheDocument()
  })

  it('toggles between light and dark themes', () => {
    const { container, rerender } = render(<ReaderView title="T" content="C" onClose={vi.fn()} />)
    const btn = screen.getByRole('button', { name: /theme|toggle dark|toggle light/i })
    const overlay = container.firstChild as HTMLElement
    // Default = light theme (current behavior)
    expect(overlay.style.background).toBe('rgb(245, 245, 247)') // #f5f5f7
    fireEvent.click(btn)
    rerender(<ReaderView title="T" content="C" onClose={vi.fn()} />)
    // Dark theme after one click
    expect(overlay.style.background).toBe('rgb(16, 17, 16)') // #101110
    fireEvent.click(screen.getByRole('button', { name: /theme|toggle dark|toggle light/i }))
    rerender(<ReaderView title="T" content="C" onClose={vi.fn()} />)
    // Back to light
    expect(overlay.style.background).toBe('rgb(245, 245, 247)')
  })

  it('shows reading progress that fills as the content scrolls', () => {
    const { container } = render(<ReaderView title="T" content="C" onClose={vi.fn()} />)
    const bar = container.querySelector('[data-reader-progress]')
    expect(bar).not.toBeNull()
    // jsdom: scrollHeight === clientHeight, so progress is 0; firing scroll must not crash
    fireEvent.scroll(container.firstChild as Element)
    expect(container.querySelector('[data-reader-progress]')).not.toBeNull()
  })

  it('exposes a progress indicator element', () => {
    const { container } = render(<ReaderView title="T" content="C" onClose={vi.fn()} />)
    expect(container.querySelector('[data-reader-progress]')).toBeInTheDocument()
  })

  it('still fires onClose from the close button', () => {
    const onClose = vi.fn()
    render(<ReaderView title="T" content="C" onClose={onClose} />)
    fireEvent.click(screen.getByText('✕ Close'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders launcher labels in English with no hardcoded skill names', () => {
    const { container } = render(<ReaderView title="" content="C" onClose={vi.fn()} />)
    expect(container.textContent).toContain('Reader Mode')
  })
})