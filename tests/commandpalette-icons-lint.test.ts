// Source-lint test for issue #114: the command palette command definitions
// in App.tsx must use UIcon names only (SVG, repo convention from PR #44) —
// raw emoji render as tofu/blank boxes in Electron WebContentsView.
// Node environment: reads the source file directly, no React render needed.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const appSrc = readFileSync(path.join(root, 'src/renderer/App.tsx'), 'utf8')
const paletteSrc = readFileSync(path.join(root, 'src/renderer/components/CommandPalette.tsx'), 'utf8')
const uiconSrc = readFileSync(path.join(root, 'src/renderer/components/UIcon.tsx'), 'utf8')

// The palette command block in App.tsx — from `commands={[` through the
// closing `]}` (matches across the issue #114 comment line; comments stripped).
const commandsBlock = appSrc.match(/commands=\{\[\s*[\s\S]*?\n\s*\]\}/)
const blockText = commandsBlock ? commandsBlock[0].replace(/^\s*\/\/.*$/gm, '') : ''

// Extract icon values: `id: 'x', name: 'y'` lines (or icon: '…' pre-fix)
const iconValues = [...blockText.matchAll(/\b(?:icon|name):\s*'([^']+)'/g)].map(m => m[1])

// Valid UIcon names registered in ICONS (keys before `: RiXxxIcon/RiXxxLine` pairs)
const validNames = new Set(
  [...uiconSrc.matchAll(/\b([a-z0-9'-]+):\s+(?:\w+Icon|\w+Line),/g)].map(m => m[1])
)

// Emoji ranges: pictographs + common symbols/misc
const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]/u

describe('issue #114 — command palette icons are SVG UIcon names', () => {
  it('App.tsx command definitions contain no emoji icons', () => {
    expect(commandsBlock).not.toBe('')
    for (const v of iconValues) {
      expect(v, `command icon value '${v}' must not be an emoji`).not.toMatch(EMOJI_RE)
    }
    expect(iconValues.some(v => EMOJI_RE.test(v))).toBe(false)
  })

  it('App.tsx command icons map to valid UIcon names', () => {
    expect(iconValues.length).toBeGreaterThanOrEqual(9) // newtab/search/focus/reader/ai/pip/layout/saved/stacks
    for (const v of iconValues) {
      expect(validNames.has(v), `'${v}' is not a registered UIcon name`).toBe(true)
    }
  })

  it('CommandPalette renders SVG icons, not raw text spans', () => {
    expect(paletteSrc).toMatch(/UIcon/)
    expect(paletteSrc).not.toMatch(/<span style=\{styles\.icon\}>\{c\.icon\}<\/span>/)
    expect(paletteSrc).toMatch(/<UIcon\s+name=\{c\.name\}/)
  })
})