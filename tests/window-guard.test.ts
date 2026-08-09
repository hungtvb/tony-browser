import { describe, it, expect } from 'vitest'
import { isAllowedUrl } from '../src/main/window'

describe('isAllowedUrl (guard window.open / will-navigate)', () => {
  it('allows http and https', () => {
    expect(isAllowedUrl('http://example.com')).toBe(true)
    expect(isAllowedUrl('https://example.com/path?q=1')).toBe(true)
    expect(isAllowedUrl('HTTP://EXAMPLE.COM')).toBe(true)
  })

  it('rejects file://, javascript:, data:, chrome:, about:', () => {
    expect(isAllowedUrl('file:///etc/passwd')).toBe(false)
    expect(isAllowedUrl('javascript:alert(1)')).toBe(false)
    expect(isAllowedUrl('data:text/html,<h1>x</h1>')).toBe(false)
    expect(isAllowedUrl('chrome://settings')).toBe(false)
    expect(isAllowedUrl('about:blank')).toBe(false)
  })

  it('rejects empty / garbage', () => {
    expect(isAllowedUrl('')).toBe(false)
    expect(isAllowedUrl('example.com')).toBe(false)
  })
})