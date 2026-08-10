// Fix #37 — Container tabs bypassed the entire privacy filter + Focus Mode.
// attachWebRequestFilters must attach the webRequest filter to EVERY partition (default + container),
// and createTabView must call this function for partitioned sessions (no double attach).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { attachWebRequestFilters, attachPrivacy } from '../src/main/ipc'
import { createTabView } from '../src/main/window'
import { FocusController } from '../src/main/focus/controller'

// ─── fake Electron session (simulating partition container) ───
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

describe('attachWebRequestFilters — partitioned session (container)', () => {
  it('attaches both webRequest filters (blocker + YouTube strip) to the session', () => {
    const ses = electronMock.makeFakeSession()
    attachWebRequestFilters(ses)
    expect(ses.handlers).toHaveLength(2)
    expect(ses.handlers[0].filter.urls).toEqual(['*://*/*'])
    expect(ses.handlers[1].filter.urls).toEqual([
      '*://*.youtube.com/youtubei/v1/player*',
      '*://*.youtube.com/youtubei/v1/next*',
    ])
  })

  it('blocks URL in ads blocklist on partitioned session → callback cancel:true', () => {
    const ses = electronMock.makeFakeSession()
    attachWebRequestFilters(ses)
    let result: any = null
    blockerOf(ses).handler({ url: 'https://doubleclick.net/pagead/adview' }, (r: any) => { result = r })
    expect(result).toEqual({ cancel: true })
  })

  it('does not block normal URLs (outside blocklist + focus off)', () => {
    const ses = electronMock.makeFakeSession()
    attachWebRequestFilters(ses)
    let result: any = null
    blockerOf(ses).handler({ url: 'https://github.com/tony-browser' }, (r: any) => { result = r })
    expect(result).toEqual({})
  })

  it('blocks URLs blocked by Focus Mode on partitioned session → callback cancel:true', () => {
    const ses = electronMock.makeFakeSession()
    const focus = new FocusController({ enabled: true, blocklist: ['facebook.com'] })
    attachWebRequestFilters(ses, () => focus)
    let result: any = null
    blockerOf(ses).handler({ url: 'https://facebook.com/feed' }, (r: any) => { result = r })
    expect(result).toEqual({ cancel: true })
  })

  it('Focus Mode off → does not block URL in focus blocklist', () => {
    const ses = electronMock.makeFakeSession()
    const focus = new FocusController({ enabled: false, blocklist: ['facebook.com'] })
    attachWebRequestFilters(ses, () => focus)
    let result: any = null
    blockerOf(ses).handler({ url: 'https://facebook.com/feed' }, (r: any) => { result = r })
    expect(result).toEqual({})
  })

  it('guard: attaching twice to the same session → registers the filter only once', () => {
    const ses = electronMock.makeFakeSession()
    attachWebRequestFilters(ses)
    attachWebRequestFilters(ses)
    expect(ses.handlers).toHaveLength(2)
  })
})

describe('createTabView — container partition gets privacy filter attached (fix #37)', () => {
  it('container tab → partitioned session has a working webRequest filter (blocks ads)', () => {
    createTabView('https://example.com', 'work')
    const ses = electronMock.partitionSessions.get('persist:container-work')
    expect(ses).toBeDefined()
    expect(blockerOf(ses)).toBeDefined()
    let result: any = null
    blockerOf(ses).handler({ url: 'https://doubleclick.net/pagead/adview' }, (r: any) => { result = r })
    expect(result).toEqual({ cancel: true })
  })

  it('container tab → Focus Mode also blocks on partitioned sessions', () => {
    // focusProvider at module level in ipc.ts is registered via attachPrivacy (index.ts) —
    // ensures createTabView attaching for containers does not lose Focus Mode
    const focus = new FocusController({ enabled: true, blocklist: ['facebook.com'] })
    const fakeWin: any = { webContents: { session: electronMock.defaultSession } }
    attachPrivacy(fakeWin, {} as any, () => focus)
    createTabView('https://example.com', 'work')
    const ses = electronMock.partitionSessions.get('persist:container-work')
    let result: any = null
    blockerOf(ses).handler({ url: 'https://facebook.com/feed' }, (r: any) => { result = r })
    expect(result).toEqual({ cancel: true })
  })

  it('creating 2 tabs in the same container → filter not attached twice (guard Set)', () => {
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
