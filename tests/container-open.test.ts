// Issue #54 — tabs:open / tabs:openContainer must pass the container into createRealView
// so container tabs get their own persist:container-<name> session partition.
// Mirrors the existing wake-path test (sleeper-discard.test.ts) which already passes the container.
import { describe, it, expect, vi } from 'vitest'
import { createTabManager } from '../src/main/tabs/TabManager'
import type { Tab } from '../src/main/tabs/TabManager'

const handlers = vi.hoisted(() => new Map<string, (...args: any[]) => any>())

vi.mock('electron', () => ({
  ipcMain: { handle: (ch: string, fn: (...a: any[]) => any) => { handlers.set(ch, fn) } },
  BrowserWindow: class {},
  WebContentsView: class { webContents: any },
  session: { defaultSession: {}, fromPartition: () => ({}) },
  app: { getPath: () => '/tmp/kenzo-container-test' },
}))

import { registerIpc } from '../src/main/ipc'
import type { IpcDeps } from '../src/main/ipc'

function fakeWC() {
  return {
    isDestroyed: vi.fn(() => false),
    close: vi.fn(),
    loadURL: vi.fn((_url: string) => Promise.resolve()),
    setBackgroundThrottling: vi.fn(),
    executeJavaScript: vi.fn(() => Promise.resolve('')),
  }
}

function setupIpc(winGetter: () => any = () => null) {
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
    getWindow: winGetter,
    getTabManager: () => tm,
    trackView: (id, v) => { if (!v) views.delete(id); else views.set(id, v) },
    getActiveView: (id) => views.get(id),
    createRealView: (url: string) => {
      const wc = fakeWC()
      wc.loadURL(url)
      return { webContents: wc } as any
    },
    layoutViews: () => {},
    getSplitIds: () => [],
    setSplitIds: () => {},
    getFocus: () => focusStub as any,
  }
  registerIpc(deps)
  return { tm, views, deps }
}

describe('Issue #54 — container propagates to createRealView on open paths', () => {
  it('tabs:open with a container → createRealView receives the container (partition persist:container-<name>)', () => {
    const { tm, deps } = setupIpc()
    const createRealView = vi.spyOn(deps, 'createRealView')

    const tab = handlers.get('tabs:open')!({}, 'https://sitea.com', 'work')

    expect(createRealView).toHaveBeenCalledWith('https://sitea.com', 'work')
    expect(tab.container).toBe('work')
    // sanity: tab was actually registered with the container
    expect(tm.list().find((t: Tab) => t.url === 'https://sitea.com')?.container).toBe('work')
  })

  it('tabs:open without a container → default container passed through (no regression)', () => {
    const { deps } = setupIpc()
    const createRealView = vi.spyOn(deps, 'createRealView')

    handlers.get('tabs:open')!({}, 'https://sitea.com')

    expect(createRealView).toHaveBeenCalledWith('https://sitea.com', 'default')
  })

  it('tabs:openContainer → createRealView receives the container', () => {
    const { tm, deps } = setupIpc()
    const createRealView = vi.spyOn(deps, 'createRealView')

    const tab = handlers.get('tabs:openContainer')!({}, 'https://sitea.com', 'personal')

    expect(createRealView).toHaveBeenCalledWith('https://sitea.com', 'personal')
    expect(tab.container).toBe('personal')
    expect(tm.list().find((t: Tab) => t.url === 'https://sitea.com')?.container).toBe('personal')
  })
})
