// Issue #116 — single source of truth for the shortcut reference.
// English labels only (per issue spec). Every `keys` value must match a
// shortcut that App.tsx keydown actually handles (see tests).
export interface ShortcutEntry {
  label: string
  keys: string
}

export interface ShortcutGroup {
  title: string
  items: ShortcutEntry[]
}

export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: 'Tabs',
    items: [
      { label: 'New tab', keys: 'Ctrl+T' }, // Issue #139 — Ctrl+T now works
      { label: 'Close tab', keys: 'Ctrl+W' },
      { label: 'Switch tab', keys: 'Alt+1-9' },
      { label: 'Next tab', keys: 'Ctrl+Tab' },
      { label: 'Reopen closed tab', keys: 'Ctrl+Shift+T' },
    ],
  },
  {
    title: 'Navigation',
    items: [
      { label: 'Focus address bar', keys: 'Ctrl+L' },
      { label: 'Search open tabs', keys: 'Ctrl+Shift+F' },
    ],
  },
  {
    title: 'AI',
    items: [
      { label: 'Open AI assistant', keys: 'Ctrl+K' },
    ],
  },
  {
    title: 'Window',
    items: [
      { label: 'Shortcut reference', keys: '?' },
    ],
  },
]

// Issue #116 — static footer hint row for the command palette (learnability):
// 4-5 highest-value shortcuts, visible even without a focused item.
export const PALETTE_FOOTER_HINTS: string[] = [
  'Ctrl+T new tab', // Issue #139 — now real
  'Ctrl+W close',
  'Ctrl+L focus bar',
  'Alt+1-9 switch tab',
  'Ctrl+Shift+F search tab',
]

// Issue #139 — pure keyboard-shortcut decision helpers, so the Ctrl+T New Tab
// behaviour is unit-testable without mounting the app (tests/shortcuts.test.ts).
export function isEditableTarget(e: KeyboardEvent): boolean {
  const t = e.target
  if (!t || typeof (t as HTMLElement).hasAttribute !== 'function') return false
  const el = t as HTMLElement
  if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') return true
  // jsdom (vitest) doesn't implement isContentEditable — check both the
  // property and the attribute so real-browser + test behaviour match.
  return el.isContentEditable === true || el.hasAttribute('contenteditable')
}

/** Ctrl+T / Cmd+T → new tab. Guarded: NOT Ctrl+Shift+T (reopen closed tab). */
export function isNewTabShortcut(e: KeyboardEvent): boolean {
  if (e.shiftKey) return false
  if (isEditableTarget(e)) return false
  return (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 't'
}