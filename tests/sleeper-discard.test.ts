// TabSleeper — discard: sleeping a tab must really free RAM (close webContents, not just setBackgroundThrottling),
// wake must recreate the view + reload the original url. Electron 31 has no webContents.discard() →
// use close() + untrack the view (equivalent to discard: unload the renderer, keep the tab entry).
import { describe, it, expect, vi } from 'vitest'
import { createTabManager } from '../src/main/tabs/TabManager'
import { SleeperController } from '../src/main/perf/controller'
import type { Tab } from '../src/main/tabs/TabManager'

// mock electron: registerIpc needs ipcMain.handle; app.getPath for AIController/focus store init
const handlers = vi.hoisted(() => new Map<string, (...args: any[]) => any>())

vi.mock('electron', () => ({
  ipcMain: { handle: (ch: string, fn: (...a: any[]) => any) => { handlers.set(ch, fn) } },
  BrowserWindow: class {},
  WebContentsView: class { webContents: any },
  session: { defaultSession: {}, fromPartition: () => ({}) },
  app: { getPath: () => '/tmp/kenzo-sleeper-test' },
}))

import { registerIpc } from '../src/main/ipc'
import type { IpcDeps } from '../src/main/ipc'

function fakeWC() {
  return {
    isDestroyed: vi.fn(() => false),
    close: vi.fn(),
    loadURL: vi.fn((_url: string) => Promise.resolve()),
    setBackgroundThrottling: vi.fn(),
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
    // like the real createTabView: create the view + load the url immediately
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

describe('TabSleeper — real RAM release through IPC (sleeper:evaluate + tabs:activate)', () => {
  it('background tab idle 11 min → sleeper:evaluate closes webContents (frees RAM) + untracks the view', async () => {
    const { tm, views } = setupIpc()
    const wc = fakeWC()
    tm.open('https://sitea.com')
    tm.open('https://siteb.com') // b is active → a is the background tab
    const a = tm.list().find(t => t.url === 'https://sitea.com')!
    a.lastActive = Date.now() - 11 * 60 * 1000
    views.set(a.id, { webContents: wc })

    await handlers.get('sleeper:evaluate')!()

    expect(wc.close).toHaveBeenCalledTimes(1) // close webContents → renderer unloaded, RAM returned
    expect(views.has(a.id)).toBe(false)       // view no longer tracked
  })

  it('wake a sleeping tab (view was closed) → tabs:activate creates a new view + loads the original url', async () => {
    const { tm, views, deps } = setupIpc()
    const wc = fakeWC()
    tm.open('https://sitea.com')
    tm.open('https://siteb.com')
    const a = tm.list().find(t => t.url === 'https://sitea.com')!
    a.lastActive = Date.now() - 11 * 60 * 1000
    views.set(a.id, { webContents: wc })
    await handlers.get('sleeper:evaluate')!()
    expect(views.has(a.id)).toBe(false)

    const createRealView = vi.spyOn(deps, 'createRealView')
    handlers.get('tabs:activate')!({}, a.id)

    expect(createRealView).toHaveBeenCalledWith('https://sitea.com', 'default') // original url + container (default)
    const newView = views.get(a.id)
    expect(newView).toBeDefined()
    expect(newView.webContents.loadURL).toHaveBeenCalledWith('https://sitea.com')
  })

  it('wake a CONTAINER tab (view closed) → createRealView receives the container to keep its own partition (review warning: container isolation)', async () => {
    const { tm, views, deps } = setupIpc()
    const wc = fakeWC()
    tm.open('https://sitea.com', 'work') // container tab — its own persist:container-work session
    tm.open('https://siteb.com')
    const a = tm.list().find(t => t.url === 'https://sitea.com')!
    a.lastActive = Date.now() - 11 * 60 * 1000
    views.set(a.id, { webContents: wc })
    await handlers.get('sleeper:evaluate')!()
    expect(views.has(a.id)).toBe(false)

    const createRealView = vi.spyOn(deps, 'createRealView')
    handlers.get('tabs:activate')!({}, a.id)

    // the container must be passed intact — otherwise the tab loses its container cookies/login (recreated in defaultSession)
    expect(createRealView).toHaveBeenCalledWith('https://sitea.com', 'work')
  })

  it('sleep: view is detached from contentView BEFORE close — no dead view stuck in the tree (review warning 2)', async () => {
    const removeChildView = vi.fn()
    const fakeWin = {
      isDestroyed: () => false,
      getContentSize: () => [1000, 800],
      contentView: { addChildView: vi.fn(), removeChildView },
      webContents: { isDestroyed: () => false, send: vi.fn() },
    } as any
    const { tm, views } = setupIpc(() => fakeWin)
    const wc = fakeWC()
    tm.open('https://sitea.com')
    tm.open('https://siteb.com')
    const a = tm.list().find(t => t.url === 'https://sitea.com')!
    a.lastActive = Date.now() - 11 * 60 * 1000
    const view = { webContents: wc, setBounds: vi.fn(), setVisible: vi.fn() } as any
    views.set(a.id, view)

    await handlers.get('sleeper:evaluate')!()

    // like tabs:close — detachView before close, never leave a destroyed view as a child of contentView
    expect(removeChildView).toHaveBeenCalledWith(view)
    expect(wc.close).toHaveBeenCalledTimes(1)
  })

  it('sleep: both close attempts fail → view is re-attached to contentView so it is not lost (review suggestion)', async () => {
    const addChildView = vi.fn()
    const fakeWin = {
      isDestroyed: () => false,
      getContentSize: () => [1000, 800],
      contentView: { addChildView, removeChildView: vi.fn() },
      webContents: { isDestroyed: () => false, send: vi.fn() },
    } as any
    const { tm, views } = setupIpc(() => fakeWin)
    const wc = fakeWC()
    wc.close.mockImplementation(() => { throw new Error('cannot close') }) // both attempts throw
    tm.open('https://sitea.com')
    tm.open('https://siteb.com')
    const a = tm.list().find(t => t.url === 'https://sitea.com')!
    a.lastActive = Date.now() - 11 * 60 * 1000
    const view = { webContents: wc, setBounds: vi.fn(), setVisible: vi.fn() } as any
    views.set(a.id, view)

    await handlers.get('sleeper:evaluate')!()

    expect(wc.close).toHaveBeenCalledTimes(2)          // close() + fallback close() both tried
    expect(addChildView).toHaveBeenCalledWith(view)    // re-attached — view is detached but alive
    expect(views.has(a.id)).toBe(true)                 // still tracked (never closed)
  })

  it('wake recreate fails → logged + tab requeued as sleeping → next activate retries and succeeds', async () => {
    const { tm, views, deps } = setupIpc()
    const wc = fakeWC()
    tm.open('https://sitea.com')
    tm.open('https://siteb.com')
    const a = tm.list().find(t => t.url === 'https://sitea.com')!
    a.lastActive = Date.now() - 11 * 60 * 1000
    views.set(a.id, { webContents: wc })
    await handlers.get('sleeper:evaluate')!()
    expect(views.has(a.id)).toBe(false)

    // first activate: createRealView throws → recreate fails
    const spy = vi.spyOn(deps, 'createRealView').mockImplementationOnce(() => { throw new Error('recreate boom') })
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    handlers.get('tabs:activate')!({}, a.id)
    expect(warnSpy).toHaveBeenCalled()                 // failure is logged, not swallowed
    expect(views.has(a.id)).toBe(false)                // still viewless after the failed attempt

    // second activate: tab is still sleeping → retry succeeds
    handlers.get('tabs:activate')!({}, a.id)
    expect(spy).toHaveBeenCalledTimes(2)
    expect(views.has(a.id)).toBe(true)                 // view recreated
    warnSpy.mockRestore()
  })

  it('wake a sleeping tab with a live view → only unthrottles, does not create a new view', async () => {
    const { tm, views, deps } = setupIpc()
    const wc = fakeWC()
    tm.open('https://sitea.com')
    tm.open('https://siteb.com')
    const a = tm.list().find(t => t.url === 'https://sitea.com')!
    a.lastActive = Date.now() - 11 * 60 * 1000
    views.set(a.id, { webContents: wc })
    // view was destroyed (why onSleep could not close it) → still tracked
    wc.isDestroyed.mockReturnValue(true)
    await handlers.get('sleeper:evaluate')!()
    expect(views.has(a.id)).toBe(true)

    // view "comes back" before activate → only unthrottle, no new view
    wc.isDestroyed.mockReturnValue(false)
    const createRealView = vi.spyOn(deps, 'createRealView')
    handlers.get('tabs:activate')!({}, a.id)
    expect(createRealView).not.toHaveBeenCalled()
    expect(wc.setBackgroundThrottling).toHaveBeenCalledWith(false)
  })
})

describe('SleeperController — marks sleeping only after onSleep (discard) finishes + wake does not reset the deadline', () => {
  function makeTab(id: string, lastActive: number): Tab {
    return {
      id,
      url: `https://site${id}.com`,
      title: `Site ${id}`,
      loading: false,
      view: { id, loadURL: () => {}, destroy: () => {} },
      container: 'default',
      lastActive,
    }
  }

  it('onSleep not finished → not yet marked sleeping; marked only after the await resolves', async () => {
    const c = new SleeperController()
    const old = Date.now() - 11 * 60 * 1000
    let release!: () => void
    const gate = new Promise<void>(r => { release = r })
    const p = c.evaluate([makeTab('a', old)], 'b', [], [], () => gate)
    expect(c.isSleeping('a')).toBe(false) // discard still pending → not sleeping yet
    release()
    await p
    expect(c.isSleeping('a')).toBe(true)
  })

  it('race guard: tab activated while onSleep is pending → NOT marked sleeping (review item 1)', async () => {
    const c = new SleeperController()
    const old = Date.now() - 11 * 60 * 1000
    let active = false
    let release!: () => void
    const gate = new Promise<void>(r => { release = r })
    // activeId is a live getter — the tab becomes active mid-teardown, re-validation must catch it
    const p = c.evaluate([makeTab('a', old)], () => (active ? 'a' : 'b'), [], [], () => gate)
    expect(c.isSleeping('a')).toBe(false)
    active = true  // user activates tab a while onSleep is still pending
    release()
    await p
    expect(c.isSleeping('a')).toBe(false) // never marked sleeping although onSleep completed
  })

  it('wake() during pending onSleep is not silently dropped — onWake fires, tab never marked sleeping', async () => {
    const c = new SleeperController()
    const old = Date.now() - 11 * 60 * 1000
    let release!: () => void
    const gate = new Promise<void>(r => { release = r })
    const woken: string[] = []
    const p = c.evaluate([makeTab('a', old)], 'b', [], [], () => gate)
    c.wake('a', (id) => woken.push(id))   // activation lands while teardown is still pending
    expect(woken).toEqual(['a'])          // wake is honored immediately
    release()
    await p
    expect(c.isSleeping('a')).toBe(false) // and the pending sleep is cancelled
  })

  it('rejected onSleep does not abort the loop — other tabs still sleep, failing one is skipped', async () => {
    const c = new SleeperController()
    const old = Date.now() - 11 * 60 * 1000
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const slept: string[] = []
    await c.evaluate(
      [makeTab('a', old), makeTab('b', old)],
      'c',
      [],
      [],
      (id) => {
        if (id === 'a') throw new Error('teardown failed for a')
        slept.push(id)
      },
    )
    expect(warnSpy).toHaveBeenCalled()     // failure is logged
    expect(slept).toEqual(['b'])           // a's rejection did not block b
    expect(c.isSleeping('a')).toBe(false)
    expect(c.isSleeping('b')).toBe(true)
    warnSpy.mockRestore()
  })

  it('wake does NOT reset the deadline tracker — lastActive stays old → next evaluate sleeps again', async () => {
    const c = new SleeperController()
    const old = Date.now() - 11 * 60 * 1000
    await c.evaluate([makeTab('a', old)], 'b', [], [], () => {})
    expect(c.isSleeping('a')).toBe(true)

    c.wake('a')
    expect(c.isSleeping('a')).toBe(false)

    // tm.activate does not run (wake outside the tabs:activate flow) → lastActive still old
    // → wake must not silently reset the 10-minute deadline
    const r = await c.evaluate([makeTab('a', old)], 'b', [], [], () => {})
    expect(r.sleeping).toBe(1)
  })
})
