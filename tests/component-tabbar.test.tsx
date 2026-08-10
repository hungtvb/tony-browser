// @vitest-environment jsdom
// TabBar renderer component (issue #77) — jsdom + testing-library.
// Tab rendering, selection, close (click + middle-click) and the new-tab button.
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import TabBar from '../src/renderer/components/TabBar'

const tabs = [
  { id: 't1', title: 'Alpha', url: 'https://alpha.dev' },
  { id: 't2', title: 'Beta', url: 'https://beta.dev', loading: true },
  { id: 't3', title: 'Gamma', url: 'https://gamma.dev', favicon: 'https://gamma.dev/fav.png' },
]

function renderBar(overrides: Partial<Parameters<typeof TabBar>[0]> = {}) {
  const props = {
    tabs,
    activeId: 't1',
    onSelect: vi.fn(),
    onClose: vi.fn(),
    onNewTab: vi.fn(),
    ...overrides,
  }
  render(<TabBar {...props} />)
  return props
}

describe('TabBar', () => {
  it('renders one button per tab with its title', () => {
    renderBar()
    expect(screen.getByText('Alpha')).toBeInTheDocument()
    expect(screen.getByText('Beta')).toBeInTheDocument()
    expect(screen.getByText('Gamma')).toBeInTheDocument()
  })

  it('calls onSelect with the tab id when a tab is clicked', () => {
    const props = renderBar()
    fireEvent.click(screen.getByText('Beta'))
    expect(props.onSelect).toHaveBeenCalledWith('t2')
  })

  it('calls onClose with the tab id when the close button is clicked', () => {
    const props = renderBar()
    const alpha = screen.getByText('Alpha').closest('button')!
    fireEvent.click(alpha.querySelector('span[style*="opacity"]')!)
    expect(props.onClose).toHaveBeenCalledWith('t1')
  })

  it('calls onClose on middle-click (auxclick button 1)', () => {
    const props = renderBar()
    const gamma = screen.getByText('Gamma').closest('button')!
    fireEvent(gamma, new MouseEvent('auxclick', { bubbles: true, button: 1 }))
    expect(props.onClose).toHaveBeenCalledWith('t3')
  })

  it('calls onNewTab when the + button is clicked', () => {
    const props = renderBar()
    fireEvent.click(screen.getByText('+'))
    expect(props.onNewTab).toHaveBeenCalledTimes(1)
  })

  it('marks the active tab and renders a spinner for loading tabs', () => {
    renderBar()
    const active = screen.getByText('Alpha').closest('button')!
    expect(active.style.background).toContain('212, 255, 64')
    // Beta is loading → spinner span, no favicon img
    const beta = screen.getByText('Beta').closest('button')!
    expect(beta.querySelector('span[style*="animation"]')).toBeTruthy()
    // Gamma has a favicon
    const gamma = screen.getByText('Gamma').closest('button')!
    expect(gamma.querySelector('img')).toBeTruthy()
  })

  it('renders tabs without a favicon as a plain status dot', () => {
    renderBar()
    const alpha = screen.getByText('Alpha').closest('button')!
    expect(alpha.querySelector('img')).toBeNull()
  })
})
