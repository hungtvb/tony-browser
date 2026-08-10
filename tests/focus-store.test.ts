import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FocusController } from '../src/main/focus/controller'
import { loadFocusState, saveFocusState } from '../src/main/focus/store'
import * as fs from 'fs'
import * as path from 'path'

vi.mock('electron', () => ({ app: { getPath: () => '/tmp/kenzo-focus-test' } }))

const TEST_FILE = path.join('/tmp/kenzo-focus-test', 'focus-config.json')

describe('FocusStore', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    fs.rmSync(TEST_FILE, { force: true })
  })

  it('save → reloads the correct state', () => {
    saveFocusState({ enabled: true, blocklist: ['facebook.com', 'x.com'], whitelist: ['work.facebook.com'] })
    const loaded = loadFocusState()
    expect(loaded).toEqual({ enabled: true, blocklist: ['facebook.com', 'x.com'], whitelist: ['work.facebook.com'] })
  })

  it('corrupt file (invalid JSON) → returns null (falls back to default)', () => {
    fs.writeFileSync(TEST_FILE, '{not-json!!!')
    expect(loadFocusState()).toBeNull()
  })

  it('state with invalid structure → null', () => {
    fs.writeFileSync(TEST_FILE, JSON.stringify({ enabled: 'yes', blocklist: 42 }))
    expect(loadFocusState()).toBeNull()
  })
})

describe('FocusController persist', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    fs.rmSync(TEST_FILE, { force: true })
  })

  it('constructor restores state from persisted data', () => {
    const loaded = loadFocusState()
    const ctrl = new FocusController(loaded ?? undefined)
    expect(ctrl.enabled).toBe(false)
    expect(ctrl.getState().blocklist.length).toBeGreaterThan(0)
  })

  it('constructor takes initial directly — no disk dependency', () => {
    const ctrl = new FocusController({ enabled: true, blocklist: ['example.com'], whitelist: ['docs.example.com'] })
    expect(ctrl.enabled).toBe(true)
    expect(ctrl.getState().blocklist).toEqual(['example.com'])
    expect(ctrl.getState().whitelist).toEqual(['docs.example.com'])
    // the real engine is enabled accordingly
    expect(ctrl.check('https://example.com')).toMatchObject({ blocked: true })
  })

  it('initial with blocklist: [] → stays empty (does NOT load DEFAULT_BLOCKLIST)', () => {
    const ctrl = new FocusController({ enabled: true, blocklist: [], whitelist: [] })
    expect(ctrl.getState().blocklist).toEqual([])
    expect(ctrl.check('https://facebook.com')).toMatchObject({ blocked: false })
  })

  it('constructor without initial → defaults to off + DEFAULT_BLOCKLIST', () => {
    const ctrl = new FocusController()
    expect(ctrl.enabled).toBe(false)
    expect(ctrl.getState().blocklist.length).toBeGreaterThan(0)
  })

  it('setEnabled/setBlocklist/setWhitelist persist to disk', () => {
    const ctrl = new FocusController()
    ctrl.setEnabled(true)
    ctrl.setBlocklist(['new-block.com'])
    ctrl.setWhitelist(['allow.com'])
    const onDisk = JSON.parse(fs.readFileSync(TEST_FILE, 'utf-8'))
    expect(onDisk).toEqual({ enabled: true, blocklist: ['new-block.com'], whitelist: ['allow.com'] })
  })
})