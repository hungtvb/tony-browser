import { describe, it, expect } from 'vitest'
import { createFocusBlocker } from '../src/main/focus/blocker'

// cùng blocklist mặc định với FocusController (src/main/focus/controller.ts)
const DEFAULT_BLOCKLIST = ['facebook.com', 'youtube.com', 'tiktok.com', 'instagram.com']

describe('FocusBlocker — hàm thuần quyết định chặn request web (tách khỏi Electron)', () => {
  it('focus on + url trong blocklist → chặn (reason focus)', () => {
    const f = createFocusBlocker({ blocklist: DEFAULT_BLOCKLIST })
    f.setEnabled(true)
    expect(f.blockUrl('https://facebook.com/feed')).toEqual({ cancel: true, reason: 'focus' })
  })

  it('focus on + subdomain của blocklist → chặn', () => {
    const f = createFocusBlocker({ blocklist: DEFAULT_BLOCKLIST })
    f.setEnabled(true)
    expect(f.blockUrl('https://m.facebook.com/profile')).toEqual({ cancel: true, reason: 'focus' })
  })

  it('focus on + url whitelist → không chặn', () => {
    const f = createFocusBlocker({ blocklist: DEFAULT_BLOCKLIST })
    f.setEnabled(true)
    f.setWhitelist(['work.facebook.com'])
    expect(f.blockUrl('https://work.facebook.com/team')).toEqual({ cancel: false })
  })

  it('focus off → không chặn bất kỳ url nào', () => {
    const f = createFocusBlocker({ blocklist: DEFAULT_BLOCKLIST })
    expect(f.blockUrl('https://facebook.com')).toEqual({ cancel: false })
  })

  it('đếm số request bị chặn do focus (counter riêng, không lẫn adblock)', () => {
    const f = createFocusBlocker({ blocklist: DEFAULT_BLOCKLIST })
    f.setEnabled(true)
    f.blockUrl('https://facebook.com/a')
    f.blockUrl('https://youtube.com/b')
    f.blockUrl('https://github.com') // không chặn
    expect(f.blockedCount()).toBe(2)
  })

  it('blocklist rỗng sau setBlocklist([]) → không chặn gì', () => {
    const f = createFocusBlocker({ blocklist: DEFAULT_BLOCKLIST })
    f.setEnabled(true)
    f.setBlocklist([])
    expect(f.blockUrl('https://facebook.com')).toEqual({ cancel: false })
  })
})