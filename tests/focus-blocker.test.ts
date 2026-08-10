import { describe, it, expect } from 'vitest'
import { createFocusBlocker } from '../src/main/focus/blocker'

// same default blocklist as FocusController (src/main/focus/controller.ts)
const DEFAULT_BLOCKLIST = ['facebook.com', 'youtube.com', 'tiktok.com', 'instagram.com']

describe('FocusBlocker — pure logic deciding web request blocking (decoupled from Electron)', () => {
  it('focus on + url in blocklist → blocked (reason focus)', () => {
    const f = createFocusBlocker({ blocklist: DEFAULT_BLOCKLIST })
    f.setEnabled(true)
    expect(f.blockUrl('https://facebook.com/feed')).toEqual({ cancel: true, reason: 'focus' })
  })

  it('focus on + subdomain of blocklist → blocked', () => {
    const f = createFocusBlocker({ blocklist: DEFAULT_BLOCKLIST })
    f.setEnabled(true)
    expect(f.blockUrl('https://m.facebook.com/profile')).toEqual({ cancel: true, reason: 'focus' })
  })

  it('focus on + url in whitelist → not blocked', () => {
    const f = createFocusBlocker({ blocklist: DEFAULT_BLOCKLIST })
    f.setEnabled(true)
    f.setWhitelist(['work.facebook.com'])
    expect(f.blockUrl('https://work.facebook.com/team')).toEqual({ cancel: false })
  })

  it('focus off → no url is blocked', () => {
    const f = createFocusBlocker({ blocklist: DEFAULT_BLOCKLIST })
    expect(f.blockUrl('https://facebook.com')).toEqual({ cancel: false })
  })

  it('counts requests blocked by focus (separate counter, not mixed with adblock)', () => {
    const f = createFocusBlocker({ blocklist: DEFAULT_BLOCKLIST })
    f.setEnabled(true)
    f.blockUrl('https://facebook.com/a')
    f.blockUrl('https://youtube.com/b')
    f.blockUrl('https://github.com') // not blocked
    expect(f.blockedCount()).toBe(2)
  })

  it('empty blocklist after setBlocklist([]) → nothing blocked', () => {
    const f = createFocusBlocker({ blocklist: DEFAULT_BLOCKLIST })
    f.setEnabled(true)
    f.setBlocklist([])
    expect(f.blockUrl('https://facebook.com')).toEqual({ cancel: false })
  })
})