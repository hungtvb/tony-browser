import { describe, it, expect } from 'vitest'
import { createBlocklist } from '../src/main/privacy/blocklist'

describe('blocklist', () => {
  it('blocks matching domains', () => {
    const bl = createBlocklist(['doubleclick.net', 'ads.example.com'])
    expect(bl.shouldBlock('https://ad.doubleclick.net/x.js')).toBe(true)
    expect(bl.shouldBlock('https://ads.example.com/banner.png')).toBe(true)
    expect(bl.shouldBlock('https://example.com/')).toBe(false)
  })

  it('blocks subdomains of listed domains', () => {
    const bl = createBlocklist(['doubleclick.net'])
    expect(bl.shouldBlock('https://ad.doubleclick.net/fp/')).toBe(true)
    expect(bl.shouldBlock('https://google.com/')).toBe(false)
  })

  it('is case-insensitive and ignores leading dot', () => {
    const bl = createBlocklist(['.DoubleClick.NET'])
    expect(bl.shouldBlock('https://AD.DOUBLECLICK.NET/x')).toBe(true)
  })

  it('counts list size correctly', () => {
    const bl = createBlocklist(['a.com', 'b.com', 'c.com'])
    expect(bl.size).toBe(3)
  })
})