// Nav controls (issue #41) — tabs:goBack / tabs:goForward / tabs:reload / tabs:navState act on the active tab view
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTabManager } from '../src/main/tabs/TabManager'

const handlers = vi.hoisted(() => new Map<string, (...args: any[]) => any>())

vi.mock('electron', () => ({
  ipcMain: { handle: (ch: string, fn: (...a: any[]) => any) => { handlers.set(ch, fn) } },
  BrowserWindow: class {},
  WebContentsView: class { webContents: any },
  session: { defaultSession: {}, fromPartition: () => ({}) },
  app: { getPath: () => '/tmp/kenzo-nav-test' },
}))

import { registerIpc } from '../src/main/ipc'
import type { IpcDeps } from '../src/main/ipc'

function fakeNav() {
  return {
    canGoBack: vi.fn(() => false),
    goBack: vi.fn(),
    canGoForward: vi.fn(() => false),
    goForward: vi.fn(),
  }
}

function fakeWC(nav: ReturnType<typeof fakeNav>) {
  return {
    isDestroyed: vi.fn(() => false),
    navigationHistory: nav,
    canGoBack: nav.canGoBack,
    goBack: nav.goBack,
    canGoForward: nav.canGoForward,
    goForward: nav.goForward,
    reload: vi.fn(),
    isLoading: vi.fn(() => false),
  }
}

function setupIpc() {
  handlers.clear()
  const views = new Map<string, any>()
  const tm = createTabManager(() => ({ id: '', loadURL: () => {}, destroy: () => {} }))
  const focusStub = {
    getState: () => ({ blocklist: [] as string[], whitelist: [] as string[], enabled: false }),
    setEnabled: () => {},
    setBlocklist: () => {},
    setWhitelist: () => {},
    getBlockedCount: () => 0,
  }
  const deps: IpcDeps = {
    getWindow: () => null,
    getTabManager: () => tm,
    trackView: (id, v) => { if (!v) views.delete(id); else views.set(id, v) },
    getActiveView: (id) => views.get(id),
    createRealView: (() => ({ webContents: {} })) as any,
    layoutViews: () => {},
    getSplitIds: () => [],
    setSplitIds: () => {},
    getFocus: () => focusStub as any,
  }
  registerIpc(deps)
  return { tm, views }
}

describe('Nav controls — tabs:goBack / tabs:goForward / tabs:reload / tabs:navState', () => {
  let tm: ReturnType<typeof createTabManager>
  let views: Map<string, any>
  let nav: ReturnType<typeof fakeNav>
  let wc: ReturnType<typeof fakeWC>

  beforeEach(() => {
    const s = setupIpc()
    tm = s.tm
    views = s.views
    nav = fakeNav()
    wc = fakeWC(nav)
    const tab = tm.open('https://sitea.com')
    views.set(tab.id, { webContents: wc })
    tm.activate(tab.id)
  })

  it('tabs:goBack → navigationHistory.goBack() called when canGoBack, returns true', async () => {
    nav.canGoBack.mockReturnValue(true)
    const res = await handlers.get('tabs:goBack')!()
    expect(nav.goBack).toHaveBeenCalledTimes(1)
    expect(res).toBe(true)
  })

  it('tabs:goBack → not called at the history edge (canGoBack false), returns false', async () => {
    const res = await handlers.get('tabs:goBack')!()
    expect(nav.goBack).not.toHaveBeenCalled()
    expect(res).toBe(false)
  })

  it('tabs:goForward → navigationHistory.goForward() called when canGoForward, returns true', async () => {
    nav.canGoForward.mockReturnValue(true)
    const res = await handlers.get('tabs:goForward')!()
    expect(nav.goForward).toHaveBeenCalledTimes(1)
    expect(res).toBe(true)
  })

  it('tabs:goForward → not called at the history edge, returns false', async () => {
    const res = await handlers.get('tabs:goForward')!()
    expect(nav.goForward).not.toHaveBeenCalled()
    expect(res).toBe(false)
  })

  it('tabs:reload → webContents.reload() called, returns true', async () => {
    const res = await handlers.get('tabs:reload')!()
    expect(wc.reload).toHaveBeenCalledTimes(1)
    expect(res).toBe(true)
  })

  it('tabs:navState → { canGoBack, canGoForward, isLoading } from the active view', async () => {
    nav.canGoBack.mockReturnValue(true)
    nav.canGoForward.mockReturnValue(true)
    wc.isLoading.mockReturnValue(true)
    const state = await handlers.get('tabs:navState')!()
    expect(state).toEqual({ canGoBack: true, canGoForward: true, isLoading: true })
  })

  it('tabs:navState with no active view → all false (safe defaults)', async () => {
    views.clear()
    const state = await handlers.get('tabs:navState')!()
    expect(state).toEqual({ canGoBack: false, canGoForward: false, isLoading: false })
  })

  it('nav handlers are safe when the active view is destroyed', async () => {
    wc.isDestroyed.mockReturnValue(true)
    expect(await handlers.get('tabs:goBack')!()).toBe(false)
    expect(await handlers.get('tabs:reload')!()).toBe(false)
    expect(await handlers.get('tabs:navState')!()).toEqual({ canGoBack: false, canGoForward: false, isLoading: false })
  })
})
