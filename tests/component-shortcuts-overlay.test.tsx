// Issue #116 — keyboard hint bar & learnability overlay:
// 1. CommandPalette footer shows an extra static shortcut row
// 2. ShortcutsOverlay (opened by '?' / palette command) renders the full
//    grouped shortcut reference; Esc closes it; every hint row matches a
//    shortcut that App.tsx keydown actually handles.
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import CommandPalette from '../src/renderer/components/CommandPalette'
import ShortcutsOverlay from '../src/renderer/components/ShortcutsOverlay'
import { SHORTCUT_GROUPS, PALETTE_FOOTER_HINTS } from '../src/renderer/shortcuts'

describe('ShortcutsOverlay (issue #116)', () => {
  afterEach(() => cleanup())

  it('renders all groups and every row shows a shortcuts combo', () => {
    render(<ShortcutsOverlay onClose={vi.fn()} />)
    for (const g of SHORTCUT_GROUPS) {
      expect(screen.getByText(g.title)).toBeInTheDocument()
    }
    for (const g of SHORTCUT_GROUPS) {
      for (const s of g.items) {
        expect(screen.getByText(s.label)).toBeInTheDocument()
        expect(screen.getByText(s.keys)).toBeInTheDocument()
        expect(s.keys.length).toBeGreaterThan(0)
      }
    }
  })

  it('Esc key closes the overlay', () => {
    const onClose = vi.fn()
    render(<ShortcutsOverlay onClose={onClose} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('clicking the backdrop closes the overlay', () => {
    const onClose = vi.fn()
    render(<ShortcutsOverlay onClose={onClose} />)
    fireEvent.click(screen.getByTestId('shortcuts-backdrop'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('every row keys match shortcuts handled in App.tsx keydown map', () => {
    const handled = new Set([
      'Ctrl+K', 'Ctrl+Shift+F', 'Ctrl+Shift+T', 'Ctrl+W', 'Ctrl+L',
      'Ctrl+Tab', 'Alt+1-9', '?',
    ])
    for (const g of SHORTCUT_GROUPS) {
      for (const s of g.items) {
        expect(handled.has(s.keys)).toBe(true)
      }
    }
  })
})

describe('CommandPalette footer hints (issue #116)', () => {
  afterEach(() => cleanup())

  it('footer shows the extra shortcut row', () => {
    render(<CommandPalette commands={[]} onClose={vi.fn()} />)
    for (const hint of PALETTE_FOOTER_HINTS) {
      expect(screen.getByText(hint)).toBeInTheDocument()
    }
  })
})