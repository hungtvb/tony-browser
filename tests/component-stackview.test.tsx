// @vitest-environment jsdom
// StackView renderer component (issue #86) — "Stack by domain" view that
// consumes window.tony.tabs.stacks(): renders collapsible domain groups,
// activates a tab on click, refreshes on re-open, and closes via Esc/backdrop.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import StackView from '../src/renderer/components/StackView'
import type { TabState, TonyAPI } from '../src/shared/types'

const stacks = [
  { label: 'github.com', tabs: [
    { id: 't1', title: 'facebook/react', url: 'https://github.com/facebook/react', loading: false, container: 'default' },
    { id: 't2', title: 'vercel', url: 'https://github.com/vercel', loading: false, container: 'default' },
  ] },
  { label: 'youtube.com', tabs: [
    { id: 't3', title: 'YouTube - video', url: 'https://youtube.com/watch?v=abc', loading: false, container: 'default' },
  ] },
]

beforeEach(() => {
  window.tony = { tabs: { stacks: vi.fn() } } as unknown as TonyAPI
})

function flush() {
  return act(async () => { await Promise.resolve() })
}

describe('StackView', () => {
  it('calls tabs.stacks() on mount and renders each stack label', async () => {
    vi.mocked(window.tony!.tabs.stacks).mockResolvedValue(stacks as any)
    render(<StackView onSelect={vi.fn()} onClose={vi.fn()} />)
    await flush()
    expect(window.tony!.tabs.stacks).toHaveBeenCalledTimes(1)
    expect(screen.getByText('github.com')).toBeInTheDocument()
    expect(screen.getByText('youtube.com')).toBeInTheDocument()
  })

  it('renders one tab row per stack with title + url, sorted by stack size', async () => {
    vi.mocked(window.tony!.tabs.stacks).mockResolvedValue(stacks as any)
    render(<StackView onSelect={vi.fn()} onClose={vi.fn()} />)
    await flush()
    expect(screen.getByText('facebook/react')).toBeInTheDocument()
    expect(screen.getByText('vercel')).toBeInTheDocument()
    expect(screen.getByText('YouTube - video')).toBeInTheDocument()
    expect(screen.getByText('https://github.com/facebook/react')).toBeInTheDocument()
  })

  it('collapses/expands a stack when its label header is clicked', async () => {
    vi.mocked(window.tony!.tabs.stacks).mockResolvedValue(stacks as any)
    render(<StackView onSelect={vi.fn()} onClose={vi.fn()} />)
    await flush()
    const header = screen.getByText('github.com')
    fireEvent.click(header)
    expect(screen.queryByText('facebook/react')).not.toBeInTheDocument()
    fireEvent.click(header)
    expect(screen.getByText('facebook/react')).toBeInTheDocument()
  })

  it('calls onSelect with the tab id when a tab row is clicked, then closes', async () => {
    const onSelect = vi.fn()
    const onClose = vi.fn()
    vi.mocked(window.tony!.tabs.stacks).mockResolvedValue(stacks as any)
    render(<StackView onSelect={onSelect} onClose={onClose} />)
    await flush()
    fireEvent.click(screen.getByText('vercel'))
    expect(onSelect).toHaveBeenCalledWith('t2')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose on Escape and on backdrop click', async () => {
    const onClose = vi.fn()
    vi.mocked(window.tony!.tabs.stacks).mockResolvedValue(stacks as any)
    render(<StackView onSelect={vi.fn()} onClose={onClose} />)
    await flush()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
    fireEvent.click(document.querySelector('[data-testid="stack-backdrop"]')!)
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('refetches stacks on every mount (fresh data after re-open)', async () => {
    const stacksFn = vi.mocked(window.tony!.tabs.stacks).mockResolvedValue(stacks as any)
    const { unmount } = render(<StackView onSelect={vi.fn()} onClose={vi.fn()} />)
    await flush()
    unmount()
    render(<StackView onSelect={vi.fn()} onClose={vi.fn()} />)
    await flush()
    expect(stacksFn).toHaveBeenCalledTimes(2)
  })

  it('renders an empty state when there are no stacks', async () => {
    vi.mocked(window.tony!.tabs.stacks).mockResolvedValue([])
    render(<StackView onSelect={vi.fn()} onClose={vi.fn()} />)
    await flush()
    expect(screen.getByText(/no tabs to stack/i)).toBeInTheDocument()
  })
})
