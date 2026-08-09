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

  it('save → load lại đúng state', () => {
    saveFocusState({ enabled: true, blocklist: ['facebook.com', 'x.com'], whitelist: ['work.facebook.com'] })
    const loaded = loadFocusState()
    expect(loaded).toEqual({ enabled: true, blocklist: ['facebook.com', 'x.com'], whitelist: ['work.facebook.com'] })
  })

  it('file hỏng (invalid JSON) → trả null (dùng default)', () => {
    fs.writeFileSync(TEST_FILE, '{not-json!!!')
    expect(loadFocusState()).toBeNull()
  })

  it('state không đúng cấu trúc → null', () => {
    fs.writeFileSync(TEST_FILE, JSON.stringify({ enabled: 'yes', blocklist: 42 }))
    expect(loadFocusState()).toBeNull()
  })
})

describe('FocusController persist', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    fs.rmSync(TEST_FILE, { force: true })
  })

  it('constructor khôi phục state từ persisted data', () => {
    const loaded = loadFocusState()
    const ctrl = new FocusController(loaded ?? undefined)
    expect(ctrl.enabled).toBe(false)
    expect(ctrl.getState().blocklist.length).toBeGreaterThan(0)
  })

  it('constructor nhận initial trực tiếp — không phụ thuộc disk', () => {
    const ctrl = new FocusController({ enabled: true, blocklist: ['example.com'], whitelist: ['docs.example.com'] })
    expect(ctrl.enabled).toBe(true)
    expect(ctrl.getState().blocklist).toEqual(['example.com'])
    expect(ctrl.getState().whitelist).toEqual(['docs.example.com'])
    // engine thật cũng bật theo
    expect(ctrl.check('https://example.com')).toMatchObject({ blocked: true })
  })

  it('initial có blocklist: [] → giữ nguyên rỗng (KHÔNG nạp DEFAULT_BLOCKLIST)', () => {
    const ctrl = new FocusController({ enabled: true, blocklist: [], whitelist: [] })
    expect(ctrl.getState().blocklist).toEqual([])
    expect(ctrl.check('https://facebook.com')).toMatchObject({ blocked: false })
  })

  it('constructor không có initial → default tắt + DEFAULT_BLOCKLIST', () => {
    const ctrl = new FocusController()
    expect(ctrl.enabled).toBe(false)
    expect(ctrl.getState().blocklist.length).toBeGreaterThan(0)
  })

  it('setEnabled/setBlocklist/setWhitelist ghi đè xuống disk', () => {
    const ctrl = new FocusController()
    ctrl.setEnabled(true)
    ctrl.setBlocklist(['new-block.com'])
    ctrl.setWhitelist(['allow.com'])
    const onDisk = JSON.parse(fs.readFileSync(TEST_FILE, 'utf-8'))
    expect(onDisk).toEqual({ enabled: true, blocklist: ['new-block.com'], whitelist: ['allow.com'] })
  })
})