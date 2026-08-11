// @vitest-environment jsdom
// Issue #88 — Sidebar core handlers (select/close/new-tab) and the container
// dot color. The smarttab "Spaces" flows are covered by component-smarttab.test.tsx;
// this suite focuses on the tab-list interactions and the container color mapping.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import Sidebar from '../src/renderer/components/Sidebar'
import type { TabState, TonyAPI } from '../src/shared/types'

const tabs = [
  { id: 't1', title: 'GitHub', url: 'https://github.com/hungtvb/tony-browser', container: 'default', loading: false },
  { id: 't2', title: 'YouTube', url: 'https://youtube.com/watch?v=1', container: 'personal', loading: false },
  { id: 't3', title: 'Bank', url: 'https://bank.example.com', container: 'unknown-box', loading: false },
]

const groups = [
  { label: 'github.com', tabs: [tabs[0]] },
  { label: 'youtube.com', tabs: [tabs[1]] },
  { label: 'bank.example.com', tabs: [tabs[2]] },
]

function mockSmarttab(overrides: { groups?: typeof groups } = {}) {
  window.tony = {
    smarttab: {
      groups: vi.fn().mockResolvedValue(overrides.groups ?? groups),
      saveSession: vi.fn().mockResolvedValue({ name: 'S1', createdAt: 1, tabs: [] }),
      sessions: vi.fn().mockResolvedValue([]),
      restoreSession: vi.fn().mockResolvedValue([]),
    },
    tabs: { open: vi.fn().mockResolvedValue({} as never) },
  } as unknown as TonyAPI
}

async function flush() {
  await act(async () => { await Promise.resolve() })
}

describe('Sidebar tab-list handlers (issue #88)', () => {
  beforeEach(() => {
    window.tony = undefined as unknown as TonyAPI
  })

  it('calls onSelect with the tab id when a tab row is clicked', async () => {
    mockSmarttab()
    const onSelect = vi.fn()
    render(<Sidebar tabs={tabs} activeId="t1" onSelect={onSelect} onClose={vi.fn()} onNewTab={vi.fn()} />)
    await flush()
    fireEvent.click(screen.getByText('YouTube'))
    expect(onSelect).toHaveBeenCalledWith('t2')
  })

  it('calls onClose with the tab id when the ✕ close control is clicked (without selecting)', async () => {
    mockSmarttab()
    const onSelect = vi.fn()
    const onClose = vi.fn()
    render(<Sidebar tabs={tabs} activeId="t1" onSelect={onSelect} onClose={onClose} onNewTab={vi.fn()} />)
    await flush()
    const row = screen.getByText('GitHub').closest('button')!
    fireEvent.click(row.querySelector('span[style*="opacity"]')!)
    expect(onClose).toHaveBeenCalledWith('t1')
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('calls onNewTab when the + button is clicked', async () => {
    mockSmarttab()
    const onNewTab = vi.fn()
    render(<Sidebar tabs={tabs} activeId="t1" onSelect={vi.fn()} onClose={vi.fn()} onNewTab={onNewTab} />)
    await flush()
    fireEvent.click(screen.getByTitle('New Tab'))
    expect(onNewTab).toHaveBeenCalledTimes(1)
  })

  it('marks the active tab row (highlight style differs from inactive rows)', async () => {
    mockSmarttab()
    render(<Sidebar tabs={tabs} activeId="t1" onSelect={vi.fn()} onClose={vi.fn()} onNewTab={vi.fn()} />)
    await flush()
    const active = screen.getByText('GitHub').closest('button')!
    const inactive = screen.getByText('YouTube').closest('button')!
    expect(active.style.background).not.toBe(inactive.style.background)
    expect(active.style.background).toContain('rgba(255, 255, 255, 0.14)')
    expect(inactive.style.background).toBe('transparent')
  })

  it('renders the container dot with the CONTAINER_COLORS color for known containers', async () => {
    mockSmarttab()
    render(<Sidebar tabs={tabs} activeId="t1" onSelect={vi.fn()} onClose={vi.fn()} onNewTab={vi.fn()} />)
    await flush()
    const github = screen.getByText('GitHub').closest('button')!
    const youtube = screen.getByText('YouTube').closest('button')!
    expect(github.querySelector('span[style*="border-radius: 50%"]')!.getAttribute('style')).toContain('rgb(107, 114, 128)')
    expect(youtube.querySelector('span[style*="border-radius: 50%"]')!.getAttribute('style')).toContain('rgb(52, 199, 89)')
  })

  it('falls back to the gray dot when the container is not in CONTAINER_COLORS', async () => {
    mockSmarttab()
    render(<Sidebar tabs={tabs} activeId="t1" onSelect={vi.fn()} onClose={vi.fn()} onNewTab={vi.fn()} />)
    await flush()
    const bank = screen.getByText('Bank').closest('button')!
    expect(bank.querySelector('span[style*="border-radius: 50%"]')!.getAttribute('style')).toContain('rgb(107, 114, 128)')
  })
})