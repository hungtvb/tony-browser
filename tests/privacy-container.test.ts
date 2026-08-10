// Fix #37 — Container tab bypass toàn bộ privacy filter + Focus Mode.
// attachWebRequestFilters phải gắn webRequest filter lên MỌI partition (default + container),
// và createTabView phải gọi hàm này cho session phân vùng (không attach 2 lần).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { attachWebRequestFilters, attachPrivacy } from '../src/main/ipc'
import { createTabView } from '../src/main/window'
import { FocusController } from '../src/main/focus/controller'

// ─── fake Electron session (giả lập partition container) ───
const electronMock = vi.hoisted(() => {
  const partitionSessions = new Map<string, any>()
  function makeFakeSession(): any {
    const handlers: Array<{ filter: { urls: string[] }, handler: (details: any, cb: (r: any) => void) => void }> = []
    let permissionHandlerCalls = 0
    return {
      handlers,
      get permissionHandlerCalls() { return permissionHandlerCalls },
      webRequest: {
        onBeforeRequest: (filter: any, handler: any) => { handlers.push({ filter, handler }) },
        filterResponseData: () => ({ on: () => {}, write: () => {}, end: () => {} }),
      },
      setPermissionRequestHandler: () => { permissionHandlerCalls++ },
    }
  }
  return {
    partitionSessions,
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
    fromPartition: (p: string) => {
      if (!electronMock.partitionSessions.has(p)) electronMock.partitionSessions.set(p, electronMock.makeFakeSession())
      return electronMock.partitionSessions.get(p)
    },
  },
}))

beforeEach(() => {
  electronMock.partitionSessions.clear()
})

function blockerOf(ses: any) {
  return ses.handlers.find((h: any) => h.filter.urls.includes('*://*/*'))
}

describe('attachWebRequestFilters — session phân vùng (container)', () => {
  it('gắn cả 2 webRequest filter (blocker + YouTube strip) lên session', () => {
    const ses = electronMock.makeFakeSession()
    attachWebRequestFilters(ses)
    expect(ses.handlers).toHaveLength(2)
    expect(ses.handlers[0].filter.urls).toEqual(['*://*/*'])
    expect(ses.handlers[1].filter.urls).toEqual([
      '*://*.youtube.com/youtubei/v1/player*',
      '*://*.youtube.com/youtubei/v1/next*',
    ])
  })

  it('chặn URL trong blocklist ads trên session phân vùng → callback cancel:true', () => {
    const ses = electronMock.makeFakeSession()
    attachWebRequestFilters(ses)
    let result: any = null
    blockerOf(ses).handler({ url: 'https://doubleclick.net/pagead/adview' }, (r: any) => { result = r })
    expect(result).toEqual({ cancel: true })
  })

  it('không chặn URL thường (ngoài blocklist + focus off)', () => {
    const ses = electronMock.makeFakeSession()
    attachWebRequestFilters(ses)
    let result: any = null
    blockerOf(ses).handler({ url: 'https://github.com/tony-browser' }, (r: any) => { result = r })
    expect(result).toEqual({})
  })

  it('chặn URL bị Focus Mode block trên session phân vùng → callback cancel:true', () => {
    const ses = electronMock.makeFakeSession()
    const focus = new FocusController({ enabled: true, blocklist: ['facebook.com'] })
    attachWebRequestFilters(ses, () => focus)
    let result: any = null
    blockerOf(ses).handler({ url: 'https://facebook.com/feed' }, (r: any) => { result = r })
    expect(result).toEqual({ cancel: true })
  })

  it('Focus Mode off → không chặn URL trong blocklist focus', () => {
    const ses = electronMock.makeFakeSession()
    const focus = new FocusController({ enabled: false, blocklist: ['facebook.com'] })
    attachWebRequestFilters(ses, () => focus)
    let result: any = null
    blockerOf(ses).handler({ url: 'https://facebook.com/feed' }, (r: any) => { result = r })
    expect(result).toEqual({})
  })

  it('guard: attach 2 lần cùng 1 session → chỉ đăng ký filter 1 lần', () => {
    const ses = electronMock.makeFakeSession()
    attachWebRequestFilters(ses)
    attachWebRequestFilters(ses)
    expect(ses.handlers).toHaveLength(2)
  })
})

describe('createTabView — container partition được attach privacy filter (fix #37)', () => {
  it('tab container → session phân vùng có webRequest filter hoạt động (chặn ads)', () => {
    createTabView('https://example.com', 'work')
    const ses = electronMock.partitionSessions.get('persist:container-work')
    expect(ses).toBeDefined()
    expect(blockerOf(ses)).toBeDefined()
    let result: any = null
    blockerOf(ses).handler({ url: 'https://doubleclick.net/pagead/adview' }, (r: any) => { result = r })
    expect(result).toEqual({ cancel: true })
  })

  it('tab container → Focus Mode cũng chặn được trên session phân vùng', () => {
    // focusProvider module-level trong ipc.ts được đăng ký qua attachPrivacy (index.ts) —
    // đảm bảo createTabView attach cho container không mất Focus Mode
    const focus = new FocusController({ enabled: true, blocklist: ['facebook.com'] })
    const fakeWin: any = { webContents: { session: electronMock.defaultSession } }
    attachPrivacy(fakeWin, {} as any, () => focus)
    createTabView('https://example.com', 'work')
    const ses = electronMock.partitionSessions.get('persist:container-work')
    let result: any = null
    blockerOf(ses).handler({ url: 'https://facebook.com/feed' }, (r: any) => { result = r })
    expect(result).toEqual({ cancel: true })
  })

  it('tạo 2 tab cùng container → không attach filter 2 lần (guard Set)', () => {
    createTabView('https://a.com', 'work')
    createTabView('https://b.com', 'work')
    const ses = electronMock.partitionSessions.get('persist:container-work')
    expect(ses.handlers).toHaveLength(2)
  })

  it('guard: createTabView twice on the same container session → setPermissionRequestHandler called once (fix #62)', () => {
    createTabView('https://a.com', 'work')
    createTabView('https://b.com', 'work')
    const ses = electronMock.partitionSessions.get('persist:container-work')
    expect(ses.permissionHandlerCalls).toBe(1)
  })
})
