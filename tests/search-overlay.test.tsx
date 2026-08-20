// @vitest-environment jsdom
// SearchOverlay renderer component (issue #75) — stale-response race + debounce.
// Mocks window.tony.tabs.search; verifies happy path, out-of-order resolution
// (late response for an older query must be discarded), empty query (no IPC call),
// debounce (fast typing collapses pending calls), and the "No tabs found" message.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import SearchOverlay from '../src/renderer/components/SearchOverlay'
import type { TabState, TonyAPI } from '../src/shared/types'

const results: TabState[] = [
  { id: 't1', title: 'Alpha Docs', url: 'https://alpha.dev/docs', loading: false, container: 'default' },
  { id: 't2', title: 'Beta Blog', url: 'https://beta.dev/blog', loading: false, container: 'default' },
]

beforeEach(() => {
  window.tony = { tabs: { search: vi.fn() } } as unknown as TonyAPI
})

function type(q: string) {
  const input = screen.getByPlaceholderText(/Search open tabs/)
  fireEvent.change(input, { target: { value: q } })
}

async function flush() {
  await act(async () => { await new Promise(r => setTimeout(r, 180)) })
  await act(async () => { await new Promise(r => setTimeout(r, 180)) })
}

describe('SearchOverlay', () => {
  it('renders one row per result with title + url after a query resolves', async () => {
    vi.mocked(window.tony!.tabs.search).mockResolvedValue(results)
    render(<SearchOverlay onSelect={vi.fn()} onClose={vi.fn()} />)
    type('alpha')
    await flush()
    expect(window.tony!.tabs.search).toHaveBeenCalledWith('alpha')
    expect(screen.getByText('Alpha Docs')).toBeInTheDocument()
    expect(screen.getByText('https://alpha.dev/docs')).toBeInTheDocument()
    expect(screen.getByText('Beta Blog')).toBeInTheDocument()
  })

  it('discards stale responses — the first (slow) query never overwrites the latest one', async () => {
    const search = vi.mocked(window.tony!.tabs.search)
    // 'g' resolves slowly, 'gi' resolves fast: the slow 'g' result must NOT win.
    search.mockImplementation((q: string) =>
      q === 'g' ? new Promise(r => setTimeout(() => r([{ id: 'old', title: 'Old Match', url: 'https://old.dev' } as TabState]), 250))
        : Promise.resolve(results))
    render(<SearchOverlay onSelect={vi.fn()} onClose={vi.fn()} />)
    type('g')
    await act(async () => { await new Promise(r => setTimeout(r, 200)) }) // debounce 'g' fires
    type('gi')
    await flush() // 'gi' debounce fires and resolves; 'g' is still pending
    expect(screen.getByText('Alpha Docs')).toBeInTheDocument()
    expect(screen.queryByText('Old Match')).not.toBeInTheDocument()
    await act(async () => { await new Promise(r => setTimeout(r, 300)) }) // let the stale 'g' resolve late
    expect(screen.queryByText('Old Match')).not.toBeInTheDocument()
    expect(screen.getByText('Alpha Docs')).toBeInTheDocument()
  })

  it('debounces — fast typing collapses intermediate queries into one search call', async () => {
    const search = vi.mocked(window.tony!.tabs.search)
    search.mockImplementation((q: string) => Promise.resolve(q === 'github' ? results : []))
    render(<SearchOverlay onSelect={vi.fn()} onClose={vi.fn()} />)
    type('g')
    await act(async () => { await new Promise(r => setTimeout(r, 80)) })
    type('gi')
    await act(async () => { await new Promise(r => setTimeout(r, 80)) })
    type('git')
    await act(async () => { await new Promise(r => setTimeout(r, 80)) })
    type('github')
    await flush()
    // 4 keystrokes inside the debounce window → only the final query is searched.
    expect(search.mock.calls.flat()).toEqual(['github'])
    expect(screen.getByText('Alpha Docs')).toBeInTheDocument()
  })

  it('empty or whitespace query does not call the IPC bridge and clears results', async () => {
    const search = vi.mocked(window.tony!.tabs.search)
    search.mockResolvedValue(results)
    render(<SearchOverlay onSelect={vi.fn()} onClose={vi.fn()} />)
    expect(screen.queryByText('Alpha Docs')).not.toBeInTheDocument()
    type(' ')
    await flush()
    expect(search).not.toHaveBeenCalled()
    expect(screen.queryByText('Alpha Docs')).not.toBeInTheDocument()
  })

  it('renders "No tabs found" when a non-empty query resolves to zero results', async () => {
    vi.mocked(window.tony!.tabs.search).mockResolvedValue([])
    render(<SearchOverlay onSelect={vi.fn()} onClose={vi.fn()} />)
    type('zzz')
    await flush()
    expect(screen.getByText('No tabs found')).toBeInTheDocument()
  })

  it('keeps keyboard selection on the first result for the latest query (setIdx reset)', async () => {
    vi.mocked(window.tony!.tabs.search).mockResolvedValue(results)
    render(<SearchOverlay onSelect={vi.fn()} onClose={vi.fn()} />)
    type('alpha')
    await flush()
    const rows = screen.getAllByText(/Alpha Docs|Beta Blog/)
    // active (highlighted) row is the first result after a fresh search
    expect(rows[0].closest('div')?.style.background).toContain('rgb(148, 225, 48)')
  })
})