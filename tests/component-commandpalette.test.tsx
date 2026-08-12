// @vitest-environment jsdom
// CommandPalette renderer component (issue #77/#114) — jsdom + testing-library.
// Pure filter/select logic: query match on label+hint, arrow navigation,
// Enter runs the selected command, Escape/overlay click close.
// Issue #114: command icons are SVG UIcon names (repo convention, PR #44) —
// no raw emoji; the icon slot must render an actual <svg> element.
// NOTE: written against the NEW `name` contract — expected RED until
// CommandPalette.tsx is updated (TDD ordering).
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CommandPalette from '../src/renderer/components/CommandPalette'

// Fresh mock set per test — module-level vi.fn() would share call history.
function makeCommands() {
  return [
    { id: 'focus', label: 'Toggle Focus Mode', name: 'focus', hint: 'F', run: vi.fn() },
    { id: 'reader', label: 'Reader Mode', name: 'reader', hint: 'R', run: vi.fn() },
    { id: 'layout', label: 'Switch Layout', name: 'layout', hint: 'L', run: vi.fn() },
  ]
}

function renderPalette(overrides: Partial<Parameters<typeof CommandPalette>[0]> = {}) {
  const commands = makeCommands()
  const props = { commands, onClose: vi.fn(), ...overrides }
  render(<CommandPalette {...props} />)
  return { commands, props }
}

describe('CommandPalette', () => {
  it('shows all commands for an empty query', () => {
    renderPalette()
    expect(screen.getByText('Toggle Focus Mode')).toBeInTheDocument()
    expect(screen.getByText('Reader Mode')).toBeInTheDocument()
    expect(screen.getByText('Switch Layout')).toBeInTheDocument()
  })

  it('filters by label (case-insensitive substring)', () => {
    renderPalette()
    const input = screen.getByPlaceholderText(/Type a command/)
    fireEvent.change(input, { target: { value: 'reader' } })
    expect(screen.getByText('Reader Mode')).toBeInTheDocument()
    expect(screen.queryByText('Toggle Focus Mode')).not.toBeInTheDocument()
    expect(screen.queryByText('Switch Layout')).not.toBeInTheDocument()
  })

  it('filters by hint text too', () => {
    renderPalette()
    const input = screen.getByPlaceholderText(/Type a command/)
    fireEvent.change(input, { target: { value: 'l' } })
    // 'L' matches the hint of Switch Layout (and label of nothing else)
    expect(screen.getByText('Switch Layout')).toBeInTheDocument()
  })

  it('shows the no-match message when nothing matches', () => {
    renderPalette()
    const input = screen.getByPlaceholderText(/Type a command/)
    fireEvent.change(input, { target: { value: 'zzz-nope' } })
    expect(screen.getByText('No matching commands')).toBeInTheDocument()
  })

  it('ArrowDown moves selection and Enter runs the selected command + closes', () => {
    const { commands, props } = renderPalette()
    const input = screen.getByPlaceholderText(/Type a command/)
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(commands[1].run).toHaveBeenCalledTimes(1)
    expect(props.onClose).toHaveBeenCalledTimes(1)
  })

  it('ArrowUp wraps at the top (stays on first item)', () => {
    const { commands } = renderPalette()
    const input = screen.getByPlaceholderText(/Type a command/)
    fireEvent.keyDown(input, { key: 'ArrowUp' })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(commands[0].run).toHaveBeenCalledTimes(1)
  })

  it('Escape closes without running anything', () => {
    const { commands, props } = renderPalette()
    const input = screen.getByPlaceholderText(/Type a command/)
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(props.onClose).toHaveBeenCalledTimes(1)
    expect(commands[0].run).not.toHaveBeenCalled()
  })

  it('clicking a command runs it and closes', () => {
    const { commands, props } = renderPalette()
    fireEvent.click(screen.getByText('Reader Mode'))
    expect(commands[1].run).toHaveBeenCalledTimes(1)
    expect(props.onClose).toHaveBeenCalledTimes(1)
  })

  it('resets selection to the first item when the query changes', () => {
    const { commands } = renderPalette()
    const input = screen.getByPlaceholderText(/Type a command/)
    fireEvent.keyDown(input, { key: 'ArrowDown' }) // select 2nd
    fireEvent.change(input, { target: { value: 'reader' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    // After reset, selection is item 0 of the filtered list = Reader Mode
    expect(commands[1].run).toHaveBeenCalledTimes(1)
    expect(commands[0].run).not.toHaveBeenCalled()
  })

  // Issue #114: icons are SVG UIcon names — the item icon slot must render an
  // <svg> element (UIcon) instead of a raw emoji text span.
  it('renders each command icon as an SVG element (no raw emoji strings)', () => {
    renderPalette()
    const item = screen.getByText('Toggle Focus Mode').closest('div')!
    const svg = item.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(item.textContent).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u)
  })

  it('renders every command icon via the same UIcon name', () => {
    const { commands } = renderPalette()
    for (const c of commands) {
      const item = screen.getByText(c.label).closest('div')!
      const svg = item.querySelector('svg')
      expect(svg).not.toBeNull()
      // aria-label of UIcon defaults to the icon name
      expect(svg!.getAttribute('aria-label')).toBe(c.name)
    }
  })
})