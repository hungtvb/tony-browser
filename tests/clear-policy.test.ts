// Issue #124 — Privacy: auto-clear cookies/cache with site exception list.
// Pure policy module tests: domain normalization, whitelist matching, disk persistence.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { createClearPolicy, normalizeDomain, isWhitelisted, isValidState } from '../src/main/privacy/clear-policy'

const TEST_DIR = '/tmp/kenzo-clear-policy-test'
const TEST_FILE = path.join(TEST_DIR, 'privacy-policy.json')

describe('normalizeDomain', () => {
  it('strips protocol + path + port + trailing slash, lowercases', () => {
    expect(normalizeDomain('https://Example.COM:8080/path?q=1')).toBe('example.com')
    expect(normalizeDomain('http://example.com/')).toBe('example.com')
  })

  it('strips leading www.', () => {
    expect(normalizeDomain('www.example.com')).toBe('example.com')
  })

  it('keeps subdomains intact (only leading www is stripped)', () => {
    expect(normalizeDomain('mail.example.com')).toBe('mail.example.com')
  })

  it('empty/garbage input → empty string', () => {
    expect(normalizeDomain('   ')).toBe('')
    expect(normalizeDomain('')).toBe('')
  })
})

describe('isWhitelisted', () => {
  it('exact domain match', () => {
    expect(isWhitelisted('https://example.com/page', ['example.com'])).toBe(true)
  })

  it('subdomain of a whitelisted domain is kept', () => {
    expect(isWhitelisted('https://mail.example.com/', ['example.com'])).toBe(true)
    expect(isWhitelisted('https://a.b.example.com/x', ['example.com'])).toBe(true)
  })

  it('unrelated domain is NOT kept', () => {
    expect(isWhitelisted('https://other.com/', ['example.com'])).toBe(false)
    expect(isWhitelisted('https://example.org/', ['example.com'])).toBe(false)
    // sibling subdomain of a different base — not covered by example.com
    expect(isWhitelisted('https://example.com.evil.com/', ['example.com'])).toBe(false)
  })

  it('whitelist entry with protocol/path is normalized before matching', () => {
    expect(isWhitelisted('https://example.com/', ['https://example.com/login'])).toBe(true)
  })

  it('empty whitelist → nothing kept', () => {
    expect(isWhitelisted('https://example.com/', [])).toBe(false)
  })
})

describe('createClearPolicy — in-memory', () => {
  it('defaults: enabled + empty whitelist', () => {
    const p = createClearPolicy()
    expect(p.getState()).toEqual({ enabled: true, whitelist: [] })
    expect(p.isWhitelisted('https://example.com/')).toBe(false)
  })

  it('setEnabled + add/remove whitelist', () => {
    const p = createClearPolicy()
    p.setEnabled(false)
    p.addWhitelist('https://Example.com/path')
    expect(p.getState()).toEqual({ enabled: false, whitelist: ['example.com'] })
    expect(p.isWhitelisted('https://mail.example.com/')).toBe(true)
    p.removeWhitelist('example.com')
    expect(p.getState().whitelist).toEqual([])
    expect(p.isWhitelisted('https://example.com/')).toBe(false)
  })

  it('apply(patch) merges partial updates', () => {
    const p = createClearPolicy()
    p.apply({ whitelist: ['keep.com'] })
    p.apply({ enabled: false })
    expect(p.getState()).toEqual({ enabled: false, whitelist: ['keep.com'] })
  })

  it('addWhitelist is idempotent (no duplicates)', () => {
    const p = createClearPolicy()
    p.addWhitelist('example.com')
    p.addWhitelist('http://example.com/')
    expect(p.getState().whitelist).toEqual(['example.com'])
  })
})

describe('createClearPolicy — disk persistence', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    fs.rmSync(TEST_DIR, { recursive: true, force: true })
  })

  it('setEnabled/addWhitelist persist to disk; reload restores state', () => {
    const p = createClearPolicy({ file: TEST_FILE })
    p.setEnabled(false)
    p.addWhitelist('bank.example.com')
    const q = createClearPolicy({ file: TEST_FILE })
    expect(q.getState()).toEqual({ enabled: false, whitelist: ['bank.example.com'] })
  })

  it('corrupt file → falls back to defaults (enabled, empty whitelist)', () => {
    fs.mkdirSync(TEST_DIR, { recursive: true })
    fs.writeFileSync(TEST_FILE, '{not-json!!!')
    const p = createClearPolicy({ file: TEST_FILE })
    expect(p.getState()).toEqual({ enabled: true, whitelist: [] })
  })

  it('invalid structure → falls back to defaults', () => {
    fs.mkdirSync(TEST_DIR, { recursive: true })
    fs.writeFileSync(TEST_FILE, JSON.stringify({ enabled: 'yes', whitelist: 42 }))
    const p = createClearPolicy({ file: TEST_FILE })
    expect(p.getState()).toEqual({ enabled: true, whitelist: [] })
  })
})

describe('isValidState', () => {
  it('accepts a valid state', () => {
    expect(isValidState({ enabled: true, whitelist: ['a.com'] })).toBe(true)
  })
  it('rejects wrong shapes', () => {
    expect(isValidState(null)).toBe(false)
    expect(isValidState({ enabled: true })).toBe(false)
    expect(isValidState({ enabled: 'yes', whitelist: [] })).toBe(false)
    expect(isValidState({ enabled: true, whitelist: [1] })).toBe(false)
  })
})
