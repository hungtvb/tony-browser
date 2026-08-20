// Issue #123 — fingerprinting-protection headers: sanitize high-entropy request headers
import { describe, it, expect } from 'vitest'
import { sanitizeHeaders, GENERIC_USER_AGENT } from '../src/main/privacy/headers'

describe('sanitizeHeaders — fingerprinting protection', () => {
  const sample = {
    'Host': 'example.com',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8',
    'Accept': 'text/html',
    'Sec-CH-UA': '"Chromium";v="131", "Not_A Brand";v="24"',
    'Sec-CH-UA-Platform': '"macOS"',
    'Sec-CH-UA-Platform-Version': '"15.0.0"',
    'Sec-CH-UA-Model': '"MacBookPro18,3"',
    'Sec-CH-UA-Mobile': '?0',
    'Cookie': 'session=abc',
  }

  it('replaces User-Agent with the generic Chromium UA (no platform)', () => {
    const out = sanitizeHeaders(sample)
    expect(out['User-Agent']).toBe(GENERIC_USER_AGENT)
    expect(GENERIC_USER_AGENT).toMatch(/^Mozilla\/5\.0/)
    expect(GENERIC_USER_AGENT).toMatch(/Chrome\/131/)
    // no OS/platform token in parens
    expect(GENERIC_USER_AGENT).not.toMatch(/\(([^)]*(Linux|Windows|Mac|Intel|X11)[^)]*)\)/)
  })

  it('removes client-hint headers (Sec-CH-UA family)', () => {
    const out = sanitizeHeaders(sample)
    expect(out['Sec-CH-UA']).toBeUndefined()
    expect(out['Sec-CH-UA-Platform']).toBeUndefined()
    expect(out['Sec-CH-UA-Platform-Version']).toBeUndefined()
    expect(out['Sec-CH-UA-Model']).toBeUndefined()
    expect(out['Sec-CH-UA-Mobile']).toBeUndefined()
  })

  it('rewrites Accept-Language to the generic value', () => {
    const out = sanitizeHeaders(sample)
    expect(out['Accept-Language']).toBe('en-US,en;q=0.9')
  })

  it('keeps all other headers untouched (case preserved)', () => {
    const out = sanitizeHeaders(sample)
    expect(out['Host']).toBe('example.com')
    expect(out['Accept']).toBe('text/html')
    expect(out['Cookie']).toBe('session=abc')
  })

  it('is case-insensitive for header names', () => {
    const out = sanitizeHeaders({
      'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36',
      'sec-ch-ua': '"Chromium";v="131"',
      'accept-language': 'fr-FR,fr;q=0.9',
    })
    expect(out['user-agent']).toBe(GENERIC_USER_AGENT)
    expect(out['sec-ch-ua']).toBeUndefined()
    expect(out['accept-language']).toBe('en-US,en;q=0.9')
  })

  it('enabled=false → returns headers unchanged (toggle off restores originals)', () => {
    const out = sanitizeHeaders(sample, { enabled: false })
    expect(out).toEqual(sample)
  })

  it('supports custom UA / Accept-Language via options (configurable)', () => {
    const out = sanitizeHeaders(sample, {
      userAgent: 'Mozilla/5.0 CustomUA/1.0',
      acceptLanguage: 'vi-VN,vi;q=0.9',
    })
    expect(out['User-Agent']).toBe('Mozilla/5.0 CustomUA/1.0')
    expect(out['Accept-Language']).toBe('vi-VN,vi;q=0.9')
  })
})
