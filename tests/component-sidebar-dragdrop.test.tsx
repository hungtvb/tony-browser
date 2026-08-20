// @vitest-environment jsdom
// Issue #125 — Sidebar drag & drop tab reorder. HTML5 drag events on tab rows
// must call onReorder(fromId, toId) and the rows must not be draggable while
// an overlay is open (dragDisabled).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import Sidebar from '../src/renderer/components/Sidebar'
import type { TabState, TonyAPI } from '../src/shared/types'

const tabs = [
  { id: 't1', title: 'GitHub', url: 'https://github.com/hungtvb/tony-browser', container: 'default', loading: false },
  { id: 't2', title: 'YouTube', url: 'https://youtube.com/watch?v=1', container: 'personal', loading: false },
  { id: 't3', title: 'Bank', url: 'https://bank.example.com', container: 'default', loading: false },
] as TabState[]

const groups = [
  { label: 'github.com', tabs: [tabs[0]] },
  { label: 'youtube.com', tabs: [tabs[1]] },
  { label: 'bank.example.com', tabs: [tabs[2]] },
]

function mockSmarttab() {
  window.tony = {
    smarttab: {
      groups: vi.fn().mockResolvedValue(groups),
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

function makeDataTransfer() {
  const store = new Map<string, string>()
  return {
    setData: (k: string, v: string) => { store.set(k, v) },
    getData: (k: string) => store.get(k) ?? '',
    effectAllowed: 'move' as string,
    dropEffect: 'move' as string,
  }
}

describe('Sidebar drag & drop reorder (issue #125)', () => {
  beforeEach(() => {
    window.tony = undefined as unknown as TonyAPI
  })

  it('drag & drop a tab row onto another row calls onReorder(fromId, toId)', async () => {
    mockSmarttab()
    const onReorder = vi.fn()
    render(<Sidebar tabs={tabs} activeId="t1" onSelect={vi.fn()} onClose={vi.fn()} onNewTab={vi.fn()} onReorder={onReorder} />)
    await flush()
    const from = screen.getByText('GitHub').closest('button')!
    const to = screen.getByText('YouTube').closest('button')!
    const dt = makeDataTransfer()
    fireEvent.dragStart(from, { dataTransfer: dt })
    fireEvent.dragOver(to, { dataTransfer: dt })
    fireEvent.drop(to, { dataTransfer: dt })
    expect(onReorder).toHaveBeenCalledTimes(1)
    expect(onReorder).toHaveBeenCalledWith('t1', 't2')
  })

  it('tab rows are draggable', async () => {
    mockSmarttab()
    render(<Sidebar tabs={tabs} activeId="t1" onSelect={vi.fn()} onClose={vi.fn()} onNewTab={vi.fn()} onReorder={vi.fn()} />)
    await flush()
    const row = screen.getByText('GitHub').closest('button')!
    expect(row.draggable).toBe(true)
  })

  it('drag is disabled while an overlay is open (dragDisabled prop)', async () => {
    mockSmarttab()
    render(<Sidebar tabs={tabs} activeId="t1" onSelect={vi.fn()} onClose={vi.fn()} onNewTab={vi.fn()} onReorder={vi.fn()} dragDisabled />)
    await flush()
    const row = screen.getByText('GitHub').closest('button')!
    expect(row.draggable).toBe(false)
  })

  it('drop without a drag in progress does not call onReorder', async () => {
    mockSmarttab()
    const onReorder = vi.fn()
    render(<Sidebar tabs={tabs} activeId="t1" onSelect={vi.fn()} onClose={vi.fn()} onNewTab={vi.fn()} onReorder={onReorder} />)
    await flush()
    const to = screen.getByText('YouTube').closest('button')!
    fireEvent.drop(to, { dataTransfer: makeDataTransfer() })
    expect(onReorder).not.toHaveBeenCalled()
  })

  it('dragging onto the same row is ignored', async () => {
    mockSmarttab()
    const onReorder = vi.fn()
    render(<Sidebar tabs={tabs} activeId="t1" onSelect={vi.fn()} onClose={vi.fn()} onNewTab={vi.fn()} onReorder={onReorder} />)
    await flush()
    const row = screen.getByText('GitHub').closest('button')!
    const dt = makeDataTransfer()
    fireEvent.dragStart(row, { dataTransfer: dt })
    fireEvent.drop(row, { dataTransfer: dt })
    expect(onReorder).not.toHaveBeenCalled()
  })
})
