// @vitest-environment jsdom
// SavedPages renderer component (issue #85) — saved-pages collection UI.
// Calls window.tony.save.list() on open, renders title/url per item, and a
// delete button that calls save.remove(id) then re-fetches the list.
// Mock pattern mirrors search-overlay.test.tsx.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import SavedPages from '../src/renderer/components/SavedPages'
import type { TonyAPI } from '../src/shared/types'

const pages = [
  { id: 'saved-1', title: 'Alpha Docs', url: 'https://alpha.dev/docs', container: 'default', savedAt: 1000 },
  { id: 'saved-2', title: 'Beta Blog', url: 'https://beta.dev/blog', container: 'work', savedAt: 2000 },
]

function mockSave(list: typeof pages) {
  const listFn = vi.fn().mockResolvedValue(list)
  const removeFn = vi.fn().mockResolvedValue(true)
  window.tony = {
    save: { page: vi.fn(), list: listFn, remove: removeFn },
  } as unknown as TonyAPI
  return { listFn, removeFn }
}

async function flush() {
  await act(async () => { await Promise.resolve() })
}

describe('SavedPages', () => {
  beforeEach(() => {
    window.tony = undefined as unknown as TonyAPI
  })

  it('renders one row per saved page with title + url after save.list() resolves', async () => {
    const { listFn } = mockSave(pages)
    render(<SavedPages onClose={vi.fn()} />)
    await flush()
    expect(listFn).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Alpha Docs')).toBeInTheDocument()
    expect(screen.getByText('https://alpha.dev/docs')).toBeInTheDocument()
    expect(screen.getByText('Beta Blog')).toBeInTheDocument()
  })

  it('shows an empty state when save.list() returns no pages', async () => {
    mockSave([])
    render(<SavedPages onClose={vi.fn()} />)
    await flush()
    expect(screen.getByText(/No saved pages/)).toBeInTheDocument()
  })

  it('delete button calls save.remove(id) then re-fetches the list', async () => {
    const { listFn, removeFn } = mockSave(pages)
    render(<SavedPages onClose={vi.fn()} />)
    await flush()
    fireEvent.click(screen.getAllByTitle('Remove')[0])
    await flush()
    expect(removeFn).toHaveBeenCalledWith('saved-1')
    // re-fetch after remove: initial call + refresh call
    expect(listFn).toHaveBeenCalledTimes(2)
  })

  it('Escape closes the panel', async () => {
    mockSave(pages)
    const onClose = vi.fn()
    render(<SavedPages onClose={onClose} />)
    await flush()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('clicking the overlay backdrop closes the panel', async () => {
    mockSave(pages)
    const onClose = vi.fn()
    const { container } = render(<SavedPages onClose={onClose} />)
    await flush()
    fireEvent.click(container.firstElementChild!)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
