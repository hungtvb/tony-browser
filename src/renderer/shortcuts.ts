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
  'Ctrl+W close',
  'Ctrl+L focus bar',
  'Alt+1-9 switch tab',
  'Ctrl+Shift+F search tab',
]
