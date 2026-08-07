import { describe, it, expect } from 'vitest'
import { createUrlFilter, createCosmeticFilter } from '../src/main/privacy/filters'

describe('URL pattern filter (tầng 2)', () => {
  it('blocks /ads/ and /banner paths', () => {
    const f = createUrlFilter()
    expect(f.shouldBlock('https://example.com/ads/banner.png')).toBe(true)
    expect(f.shouldBlock('https://example.com/banners/728x90.png')).toBe(true)
  })

  it('blocks ad* subdomain patterns', () => {
    const f = createUrlFilter()
    expect(f.shouldBlock('https://adservice.google.com/x')).toBe(true)
    expect(f.shouldBlock('https://ads.facebook.com/api')).toBe(true)
  })

  it('blocks tracker query params (utm_ aside)', () => {
    const f = createUrlFilter()
    expect(f.shouldBlock('https://example.com/pixel?type=impression&ref=ad')).toBe(true)
  })

  it('allows normal content paths', () => {
    const f = createUrlFilter()
    expect(f.shouldBlock('https://example.com/article/how-to')).toBe(false)
    expect(f.shouldBlock('https://example.com/')).toBe(false)
  })

  it('blocks common ad script names', () => {
    const f = createUrlFilter()
    expect(f.shouldBlock('https://cdn.example.com/ads.js')).toBe(true)
    expect(f.shouldBlock('https://cdn.example.com/adsbygoogle.js')).toBe(true)
  })
})

describe('Cosmetic filter (tầng 3 — ẩn element quảng cáo)', () => {
  it('hides common ad containers', () => {
    const c = createCosmeticFilter()
    const css = c.css()
    expect(css).toContain('[class*="advert"]')
    expect(css).toContain('[id*="banner"]')
  })

  it('hides iframe ads and sponsored blocks', () => {
    const c = createCosmeticFilter()
    const css = c.css()
    expect(css).toContain('iframe[src*="doubleclick"]')
    expect(css).toContain('[id*="sponsored"]')
  })

  it('generates style tag injection snippet', () => {
    const c = createCosmeticFilter()
    expect(c.injectScript().length).toBeGreaterThan(50)
  })
})