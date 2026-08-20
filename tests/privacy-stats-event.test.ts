// Issue #120 — privacy stats must be event-driven, not polled every 3s.
// When a request is blocked, main pushes a throttled 'privacy:stats' event to
// the window (max 1/s); idle browsers emit nothing. This file proves the
// main-side wiring: attachPrivacy registers the broadcast, a blocked request
// triggers it, a burst is throttled, and non-blocked requests stay silent.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { attachWebRequestFilters, attachPrivacy, resetPrivacyStatsBroadcast } from '../src/main/ipc'

// ─── fake Electron session (same shape as tests/privacy-container.test.ts) ───
const electronMock = vi.hoisted(() => {
  function makeFakeSession(): any {
    const handlers: Array<{ filter: { urls: string[] }, handler: (details: any, cb: (r: any) => void) => void }> = []
    return {
      handlers,
      webRequest: {
        onBeforeRequest: (filter: any, handler: any) => { handlers.push({ filter, handler }) },
        onBeforeSendHeaders: (filter: any, handler: any) => { handlers.push({ filter, handler }) },
        filterResponseData: () => ({ on: () => {}, write: () => {}, end: () => {} }),
      },
      setPermissionRequestHandler: () => {},
    }
  }
  return {
    makeFakeSession,
    defaultSession: makeFakeSession(),
  }
})

vi.mock('electron', () => ({
  ipcMain: { handle: vi.fn() },
  BrowserWindow: class {},
  WebContentsView: class {
    webContents: any
    setVisible: any
    constructor() {
      this.webContents = { loadURL: () => Promise.resolve(), isDestroyed: () => false }
      this.setVisible = () => {}
    }
  },
  app: { getPath: () => '/tmp' },
  session: {
    defaultSession: electronMock.defaultSession,
    fromPartition: () => electronMock.makeFakeSession(),
  },
}))

function blockerOf(ses: any) {
  return ses.handlers.find((h: any) => h.filter.urls.includes('*://*/*'))
}

const BLOCKED = 'https://doubleclick.net/pagead/adview'
const CLEAN = 'https://github.com/tony-browser'

describe('Issue #120 — event-driven privacy stats (main side)', () => {
  beforeEach(() => {
    resetPrivacyStatsBroadcast()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('blocked request → pushes privacy:stats to the window webContents', () => {
    const send = vi.fn()
    const fakeWin: any = { webContents: { session: electronMock.defaultSession, send, isDestroyed: () => false } }
    attachPrivacy(fakeWin, {} as any)
    const h = blockerOf(electronMock.defaultSession)!
    h.handler({ url: BLOCKED }, () => {})
    expect(send).toHaveBeenCalledTimes(1)
    expect(send).toHaveBeenCalledWith('privacy:stats', expect.objectContaining({ blocked: expect.any(Number), listSize: expect.any(Number) }))
  })

  it('non-blocked request → no privacy:stats event', () => {
    const send = vi.fn()
    const fakeWin: any = { webContents: { session: electronMock.defaultSession, send, isDestroyed: () => false } }
    attachPrivacy(fakeWin, {} as any)
    const h = blockerOf(electronMock.defaultSession)!
    h.handler({ url: CLEAN }, () => {})
    expect(send).not.toHaveBeenCalled()
  })

  it('throttled: a burst of blocked requests within 1s → 1 immediate push, then 1 after the window', () => {
    vi.useFakeTimers()
    const send = vi.fn()
    const fakeWin: any = { webContents: { session: electronMock.defaultSession, send, isDestroyed: () => false } }
    attachPrivacy(fakeWin, {} as any)
    const h = blockerOf(electronMock.defaultSession)!
    // first block → immediate push
    h.handler({ url: BLOCKED }, () => {})
    expect(send).toHaveBeenCalledTimes(1)
    // 5 more blocks inside the 1s window → still only 1 push so far
    for (let i = 0; i < 5; i++) h.handler({ url: BLOCKED }, () => {})
    expect(send).toHaveBeenCalledTimes(1)
    // past the throttle window → exactly one trailing push (latest counter)
    vi.advanceTimersByTime(1000)
    expect(send).toHaveBeenCalledTimes(2)
  })

  it('container-session blocks also trigger the push (shared counter)', () => {
    const send = vi.fn()
    const fakeWin: any = { webContents: { session: electronMock.defaultSession, send, isDestroyed: () => false } }
    attachPrivacy(fakeWin, {} as any)
    const container = electronMock.makeFakeSession()
    attachWebRequestFilters(container)
    blockerOf(container)!.handler({ url: BLOCKED }, () => {})
    expect(send).toHaveBeenCalledTimes(1)
    expect(send).toHaveBeenCalledWith('privacy:stats', expect.objectContaining({ blocked: expect.any(Number) }))
  })
})
