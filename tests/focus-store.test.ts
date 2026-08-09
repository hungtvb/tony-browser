import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FocusController } from '../src/main/focus/controller'
import { loadFocusState, saveFocusState } from '../src/main/focus/store'

vi.mock('electron', () => ({ app: { getPath: () => '/tmp/kenzo-focus-test' } }))

describe('FocusStore', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('save → load lại đúng state', () => {
    saveFocusState({ enabled: true, blocklist: ['facebook.com', 'x.com'], whitelist: ['work.facebook.com'] })
    const loaded = loadFocusState()
    expect(loaded).toEqual({ enabled: true, blocklist: ['facebook.com', 'x.com'], whitelist: ['work.facebook.com'] })
  })

  it('file hỏng (invalid JSON) → trả null (dùng default)', () => {
    const fs = require('fs')
    const path = require('path')
    // mock getPath trả về dir cố định — ghi file hỏng vào đó
    const dir = '/tmp/kenzo-focus-test'
    fs.writeFileSync(path.join(dir, 'focus-config.json'), '{not-json!!!')
    expect(loadFocusState()).toBeNull()
  })

  it('state không đúng cấu trúc → null', () => {
    const fs = require('fs')
    const path = require('path')
    fs.writeFileSync(path.join('/tmp/kenzo-focus-test', 'focus-config.json'), JSON.stringify({ enabled: 'yes', blocklist: 42 }))
    expect(loadFocusState()).toBeNull()
  })
})

describe('FocusController persist', () => {
  it('constructor khôi phục state từ persisted data', () => {
    saveFocusState({ enabled: true, blocklist: ['example.com'], whitelist: ['docs.example.com'] })
    const ctrl = new FocusController(loadFocusState() ?? undefined)
    expect(ctrl.enabled).toBe(true)
    expect(ctrl.getState().blocklist).toEqual(['example.com'])
    expect(ctrl.getState().whitelist).toEqual(['docs.example.com'])
    // engine thật cũng bật theo
    expect(ctrl.check('https://example.com')).toMatchObject({ blocked: true })
  })

  it('constructor không có persisted state → default tắt + DEFAULT_BLOCKLIST', () => {
    const fs = require('fs')
    const path = require('path')
    fs.rmSync(path.join('/tmp/kenzo-focus-test', 'focus-config.json'), { force: true })
    const ctrl = new FocusController(loadFocusState() ?? undefined)
    expect(ctrl.enabled).toBe(false)
    expect(ctrl.getState().blocklist.length).toBeGreaterThan(0)
  })

  it('setEnabled/setBlocklist/setWhitelist ghi đè xuống disk', () => {
    const fs = require('fs')
    const path = require('path')
    fs.rmSync(path.join('/tmp/kenzo-focus-test', 'focus-config.json'), { force: true })
    const ctrl = new FocusController()
    ctrl.setEnabled(true)
    ctrl.setBlocklist(['new-block.com'])
    ctrl.setWhitelist(['allow.com'])
    const onDisk = JSON.parse(fs.readFileSync(path.join('/tmp/kenzo-focus-test', 'focus-config.json'), 'utf-8'))
    expect(onDisk).toEqual({ enabled: true, blocklist: ['new-block.com'], whitelist: ['allow.com'] })
  })
})