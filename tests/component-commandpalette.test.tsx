// @vitest-environment jsdom
// CommandPalette renderer component (issue #77) — jsdom + testing-library.
// Pure filter/select logic: query match on label+hint, arrow navigation,
// Enter runs the selected command, Escape/overlay click close.
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CommandPalette from '../src/renderer/components/CommandPalette'

// Fresh mock set per test — module-level vi.fn() would share call history.
function makeCommands() {
  return [
    { id: 'focus', label: 'Toggle Focus Mode', icon: '🎯', hint: 'F', run: vi.fn() },
    { id: 'reader', label: 'Reader Mode', icon: '📖', hint: 'R', run: vi.fn() },
    { id: 'layout', label: 'Switch Layout', icon: '🪟', hint: 'L', run: vi.fn() },
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
})
