// @vitest-environment jsdom
// AddressBar renderer component (issue #81) — jsdom + testing-library.
// Draft/commit/revert/blur semantics incl. the issue #42 no-op blur guard,
// plus back/forward/reload nav controls.
import { describe, it, expect, vi, type Mock } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import AddressBar from '../src/renderer/components/AddressBar'

// Re-use the component's real placeholder via regex to avoid string drift.
const PLACEHOLDER = /Enter a web address or search\.\.\./

interface RenderResult {
  onCommit: Mock
  onOpenAI: Mock
  onBack: Mock
  onForward: Mock
  onReload: Mock
}

function renderBar(overrides: Partial<Parameters<typeof AddressBar>[0]> = {}): RenderResult {
  const props = {
    value: 'https://example.com',
    onCommit: vi.fn(),
    onOpenAI: vi.fn(),
    nav: { canGoBack: true, canGoForward: true, onBack: vi.fn(), onForward: vi.fn(), onReload: vi.fn() },
    ...overrides,
  }
  render(<AddressBar {...props} />)
  return {
    onCommit: props.onCommit as Mock,
    onOpenAI: props.onOpenAI as Mock,
    onBack: props.nav.onBack as Mock,
    onForward: props.nav.onForward as Mock,
    onReload: props.nav.onReload as Mock,
  }
}

describe('AddressBar', () => {
  it('shows value when not editing, and the typed draft while editing', () => {
    renderBar()
    const input = screen.getByPlaceholderText(PLACEHOLDER)
    // Not editing → shows the active URL
    expect(input).toHaveValue('https://example.com')
    // Focus starts a draft; typing replaces it
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'draft.dev' } })
    expect(input).toHaveValue('draft.dev')
  })

  it('Enter commits normalize(value) — bare hostname gets https://, schemed input passes through', () => {
    const { onCommit } = renderBar()
    const input = screen.getByPlaceholderText(PLACEHOLDER)
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'example.org' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onCommit).toHaveBeenCalledTimes(1)
    expect(onCommit).toHaveBeenCalledWith('https://example.org')
    // Already-schemed input is passed through unchanged
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'http://foo.dev/path' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onCommit).toHaveBeenCalledWith('http://foo.dev/path')
  })

  it('Enter with an empty or stale draft does nothing (no onCommit call)', () => {
    const { onCommit } = renderBar()
    const input = screen.getByPlaceholderText(PLACEHOLDER)
    // Enter on the untouched value → no commit (issue #42 / #45 stale-value guard)
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onCommit).not.toHaveBeenCalled()
    // Enter on a draft that is only whitespace → no commit
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '   ' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('blur with a changed draft commits; blur with a reverted empty draft does not', () => {
    const { onCommit } = renderBar()
    const input = screen.getByPlaceholderText(PLACEHOLDER)
    // Changed draft → blur commits the normalized URL
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'news.dev' } })
    fireEvent.blur(input)
    expect(onCommit).toHaveBeenCalledWith('https://news.dev')
    // Draft cleared → blur reverts without committing
    onCommit.mockClear()
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '' } })
    fireEvent.blur(input)
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('blur with an unchanged value is a no-op — no commit (issue #42 guard)', () => {
    const { onCommit } = renderBar()
    const input = screen.getByPlaceholderText(PLACEHOLDER)
    // Focus then blur without editing must NOT re-navigate to the current URL
    fireEvent.focus(input)
    fireEvent.blur(input)
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('blur reverts a draft that normalizes to the current value (no commit)', () => {
    const { onCommit } = renderBar({ value: 'https://example.com' })
    const input = screen.getByPlaceholderText(PLACEHOLDER)
    // Typing the bare hostname of the current URL normalizes to it → no-op
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'example.com' } })
    fireEvent.blur(input)
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('Escape reverts the draft without committing', () => {
    const { onCommit } = renderBar()
    const input = screen.getByPlaceholderText(PLACEHOLDER)
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'wip.dev' } })
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(input).toHaveValue('https://example.com') // reverted to active URL
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('nav buttons: Back/Forward disabled flags, Reload never disabled, clicks call handlers', () => {
    const { onBack, onForward, onReload } = renderBar({ nav: { canGoBack: false, canGoForward: true, onBack: vi.fn(), onForward: vi.fn(), onReload: vi.fn() } })
    const back = screen.getByTitle('Back')
    const forward = screen.getByTitle('Forward')
    const reload = screen.getByTitle('Reload')
    expect(back).toBeDisabled()
    expect(forward).not.toBeDisabled()
    expect(reload).not.toBeDisabled() // Reload never disabled
    fireEvent.click(forward)
    expect(onForward).toHaveBeenCalledTimes(1)
    fireEvent.click(reload)
    expect(onReload).toHaveBeenCalledTimes(1)
    expect(onBack).not.toHaveBeenCalled()
    // With canGoBack: true the Back button is enabled and clickable
    const { onBack: onBack2 } = renderBar({ nav: { canGoBack: true, canGoForward: false, onBack: vi.fn(), onForward: vi.fn(), onReload: vi.fn() } })
    const back2 = screen.getAllByTitle('Back').at(-1)!
    expect(back2).not.toBeDisabled()
    fireEvent.click(back2)
    expect(onBack2).toHaveBeenCalledTimes(1)
  })
})