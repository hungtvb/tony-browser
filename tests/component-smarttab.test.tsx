// @vitest-environment jsdom
// Issue #87 — Sidebar "Spaces" grouping/session UI wired to window.tony.smarttab.*
// (real renderer consumer for the smarttab IPC family; mock pattern mirrors
// component-savedpages.test.tsx)
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import Sidebar from '../src/renderer/components/Sidebar'
import type { TonyAPI } from '../src/shared/types'

const tabs = [
  { id: 't1', title: 'GitHub', url: 'https://github.com/hungtvb/tony-browser', container: 'default' },
  { id: 't2', title: 'YouTube', url: 'https://youtube.com/watch?v=1', container: 'personal' },
]

const groups = [
  { label: 'github.com', tabs: [tabs[0]] },
  { label: 'youtube.com', tabs: [tabs[1]] },
]

function mockSmarttab(overrides: { groups?: typeof groups; sessions?: unknown[] } = {}) {
  const groupsFn = vi.fn().mockResolvedValue(overrides.groups ?? groups)
  const saveFn = vi.fn().mockResolvedValue({ name: 'S1', createdAt: 1, tabs: [] })
  const sessionsFn = vi.fn().mockResolvedValue(overrides.sessions ?? [
    { name: 'Work', createdAt: 1700000000000, tabs: [{ url: 'https://github.com', title: 'GitHub' }] },
  ])
  const restoreFn = vi.fn().mockResolvedValue([{ url: 'https://github.com', title: 'GitHub' }])
  const openFn = vi.fn().mockResolvedValue({} as never)
  window.tony = {
    smarttab: { groups: groupsFn, saveSession: saveFn, sessions: sessionsFn, restoreSession: restoreFn },
    tabs: { open: openFn },
  } as unknown as TonyAPI
  return { groupsFn, saveFn, sessionsFn, restoreFn, openFn }
}

async function flush() {
  await act(async () => { await Promise.resolve() })
}

function renderSidebar() {
  return render(
    <Sidebar tabs={tabs} activeId="t1" onSelect={vi.fn()} onClose={vi.fn()} onNewTab={vi.fn()} />
  )
}

describe('Sidebar smarttab Spaces UI', () => {
  beforeEach(() => {
    window.tony = undefined as unknown as TonyAPI
  })

  it('calls smarttab.groups("domain") on mount and renders grouped tabs', async () => {
    const { groupsFn } = mockSmarttab()
    renderSidebar()
    await flush()
    expect(groupsFn).toHaveBeenCalledWith('domain')
    expect(screen.getByText('github.com')).toBeInTheDocument()
    expect(screen.getByText('youtube.com')).toBeInTheDocument()
    expect(screen.getByText('GitHub')).toBeInTheDocument()
    expect(screen.getByText('YouTube')).toBeInTheDocument()
  })

  it('mode toggle re-fetches groups with "theme"', async () => {
    const { groupsFn } = mockSmarttab()
    renderSidebar()
    await flush()
    fireEvent.click(screen.getByText('By theme'))
    await flush()
    expect(groupsFn).toHaveBeenCalledWith('theme')
  })

  it('falls back to the flat tab list when groups resolve empty', async () => {
    mockSmarttab({ groups: [] })
    renderSidebar()
    await flush()
    expect(screen.getByText('GitHub')).toBeInTheDocument()
    expect(screen.getByText('YouTube')).toBeInTheDocument()
  })

  it('Save session calls smarttab.saveSession with the typed name', async () => {
    const { saveFn } = mockSmarttab()
    renderSidebar()
    await flush()
    fireEvent.click(screen.getByText('Show'))
    fireEvent.change(screen.getByPlaceholderText('Session name (optional)'), { target: { value: 'My Session' } })
    fireEvent.click(screen.getByTitle('Save session'))
    await flush()
    expect(saveFn).toHaveBeenCalledWith('My Session')
  })

  it('Save session with empty name calls smarttab.saveSession(undefined)', async () => {
    const { saveFn } = mockSmarttab()
    renderSidebar()
    await flush()
    fireEvent.click(screen.getByText('Show'))
    fireEvent.click(screen.getByTitle('Save session'))
    await flush()
    expect(saveFn).toHaveBeenCalledWith(undefined)
  })

  it('Sessions toggle lists saved sessions and Restore opens each tab via tabs.open', async () => {
    const { restoreFn, openFn } = mockSmarttab()
    renderSidebar()
    await flush()
    fireEvent.click(screen.getByText('Show'))
    expect(screen.getByText('Work')).toBeInTheDocument()
    fireEvent.click(screen.getByTitle('Restore'))
    await flush()
    expect(restoreFn).toHaveBeenCalledWith('Work')
    expect(openFn).toHaveBeenCalledWith('https://github.com')
  })

  it('shows empty state when there are no saved sessions', async () => {
    mockSmarttab({ sessions: [] })
    renderSidebar()
    await flush()
    fireEvent.click(screen.getByText('Show'))
    expect(screen.getByText('No saved sessions')).toBeInTheDocument()
  })
})
