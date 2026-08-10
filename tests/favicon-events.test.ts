// Issue #46 — favicon picker + webContents wiring.
import { describe, it, expect, vi } from 'vitest'
import { pickFavicon, attachFaviconEvents, DATA_URL_LIMIT } from '../src/main/tabs/faviconEvents'

function fakeWebContents() {
  const listeners = new Map<string, (...args: any[]) => void>()
  return {
    on: vi.fn((ev: string, cb: (...args: any[]) => void) => { listeners.set(ev, cb) }),
    emit: (ev: string, ...args: any[]) => listeners.get(ev)?.(...args),
    isDestroyed: () => false,
  }
}

describe('pickFavicon — choose the best favicon URL', () => {
  it('undefined/empty → undefined (fallback to container dot in renderer)', () => {
    expect(pickFavicon(undefined)).toBeUndefined()
    expect(pickFavicon([])).toBeUndefined()
  })

  it('prefers a small data URL (< 8KB) over http URLs', () => {
    const small = 'data:image/png;base64,AAAA'
    const urls = ['https://a.com/favicon.ico', small]
    expect(pickFavicon(urls)).toBe(small)
  })

  it('skips oversized data URLs (>= 8KB) — falls back to http URL', () => {
    const big = 'data:image/png;base64,' + 'x'.repeat(DATA_URL_LIMIT)
    const urls = [big, 'https://a.com/favicon.ico']
    expect(pickFavicon(urls)).toBe('https://a.com/favicon.ico')
  })

  it('falls back to the first entry when only data URLs (all big) or odd schemes', () => {
    const big = 'data:image/png;base64,' + 'x'.repeat(DATA_URL_LIMIT + 1)
    expect(pickFavicon([big])).toBe(big) // only option → keep it
    expect(pickFavicon(['chrome://favicon'])).toBe('chrome://favicon')
  })

  it('first http(s) URL wins when several exist', () => {
    const urls = ['https://a.com/favicon.ico', 'https://b.com/favicon.ico']
    expect(pickFavicon(urls)).toBe('https://a.com/favicon.ico')
  })
})

describe('attachFaviconEvents — forwards page-favicon-updated to onChange', () => {
  it('emits picked favicon on page-favicon-updated', () => {
    const wc = fakeWebContents()
    const onChange = vi.fn()
    attachFaviconEvents(wc as any, onChange)

    wc.emit('page-favicon-updated', {}, ['https://a.com/favicon.ico'])
    expect(onChange).toHaveBeenCalledWith('https://a.com/favicon.ico')
  })

  it('emits undefined when the page has no favicon (empty list)', () => {
    const wc = fakeWebContents()
    const onChange = vi.fn()
    attachFaviconEvents(wc as any, onChange)

    wc.emit('page-favicon-updated', {}, [])
    expect(onChange).toHaveBeenCalledWith(undefined)
  })

  it('registers the event listener', () => {
    const wc = fakeWebContents()
    attachFaviconEvents(wc as any, vi.fn())
    expect(wc.on).toHaveBeenCalledWith('page-favicon-updated', expect.any(Function))
  })

  it('no throw when webContents is already destroyed', () => {
    const wc = fakeWebContents()
    wc.isDestroyed = () => true
    expect(() => attachFaviconEvents(wc as any, vi.fn())).not.toThrow()
  })
})
