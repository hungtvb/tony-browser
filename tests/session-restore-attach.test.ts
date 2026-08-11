// Issue #82 — restored tabs beyond the first never display: the restore path only
// attached the FIRST restored view to the window, and tabs:activate never re-attached
// a live view that exists in viewByTab but is not a child of the window.
import { describe, it, expect, vi } from 'vitest'
import { createTabManager } from '../src/main/tabs/TabManager'

const handlers = vi.hoisted(() => new Map<string, (...args: any[]) => any>())

vi.mock('electron', () => ({
  ipcMain: { handle: (ch: string, fn: (...a: any[]) => any) => { handlers.set(ch, fn) } },
  BrowserWindow: class {},
  WebContentsView: class { webContents: any },
  session: { defaultSession: {}, fromPartition: () => ({}) },
  app: { getPath: () => '/tmp/kenzo-session-restore-ipc-test' },
}))

import { registerIpc } from '../src/main/ipc'
import type { IpcDeps } from '../src/main/ipc'

function makeView() {
  return {
    webContents: {
      isDestroyed: () => false,
      setBackgroundThrottling: () => {},
      loadURL: () => Promise.resolve(),
      close: () => {},
    },
    setBounds: vi.fn(),
    setVisible: vi.fn(),
  }
}

function makeWindow() {
  const children: any[] = []
  return {
    contentView: {
      children,
      addChildView: (v: any) => { if (!children.includes(v)) children.push(v) },
      removeChildView: (v: any) => { const i = children.indexOf(v); if (i >= 0) children.splice(i, 1) },
    },
    getContentSize: () => [1280, 800],
    isDestroyed: () => false,
    webContents: { isDestroyed: () => false, send: () => {} },
  }
}

function setup() {
  handlers.clear()
  const views = new Map<string, any>()
  const tm = createTabManager(() => ({ id: '', loadURL: () => {}, destroy: () => {} }))
  const win = makeWindow()
  const focusStub = {
    getState: () => ({ blocklist: [] as string[], whitelist: [] as string[], enabled: false }),
    setEnabled: () => {},
    setBlocklist: () => {},
    setWhitelist: () => {},
    getBlockedCount: () => 0,
  }
  const deps: IpcDeps = {
    getWindow: () => win as any,
    getTabManager: () => tm,
    trackView: (id, v) => { if (!v) views.delete(id); else views.set(id, v) },
    getActiveView: (id) => views.get(id),
    createRealView: () => makeView() as any,
    layoutViews: () => {},
    getSplitIds: () => [],
    setSplitIds: () => {},
    getFocus: () => focusStub as any,
  }
  registerIpc(deps)
  return { tm, views, win }
}

describe('Issue #82 — restored tabs beyond the first get attached to the window', () => {
  it('tabs:activate re-attaches a live view that is in viewByTab but not a window child (restored-tab case)', () => {
    const s = setup()
    // Simulate a restored session: two tabs, both have views tracked in viewByTab,
    // but only the FIRST view was ever added to the window (the pre-fix restore bug).
    const t1 = s.tm.open('https://a.com')
    const t2 = s.tm.open('https://b.com')
    const v1 = makeView()
    const v2 = makeView()
    s.views.set(t1.id, v1)
    s.views.set(t2.id, v2)
    s.win.contentView.addChildView(v1) // only the first tab was attached on restore
    s.tm.activate(t1.id)

    // Activating the second restored tab must attach its view to the window.
    handlers.get('tabs:activate')!({}, t2.id)

    expect(s.win.contentView.children).toContain(v2)
    expect(s.win.contentView.children).toContain(v1)
  })

  it('tabs:activate does not double-attach a view that is already a window child', () => {
    const s = setup()
    const t1 = s.tm.open('https://a.com')
    const t2 = s.tm.open('https://b.com')
    const v1 = makeView()
    const v2 = makeView()
    s.views.set(t1.id, v1)
    s.views.set(t2.id, v2)
    // both views properly attached (normal flow)
    s.win.contentView.addChildView(v1)
    s.win.contentView.addChildView(v2)
    s.tm.activate(t1.id)

    handlers.get('tabs:activate')!({}, t2.id)

    // still exactly two children — no duplicate add
    expect(s.win.contentView.children).toEqual([v1, v2])
  })

  it('tabs:activate re-attaches a view that was detached by the sleeper (sleep → wake path)', () => {
    const s = setup()
    const t1 = s.tm.open('https://a.com')
    const t2 = s.tm.open('https://b.com')
    const v1 = makeView()
    const v2 = makeView()
    s.views.set(t1.id, v1)
    s.views.set(t2.id, v2)
    s.win.contentView.addChildView(v1)
    s.win.contentView.addChildView(v2)
    s.tm.activate(t1.id)

    // sleeper detached v2 (RAM freed) but did NOT untrack it (teardown pending)
    s.win.contentView.removeChildView(v2)

    handlers.get('tabs:activate')!({}, t2.id)

    expect(s.win.contentView.children).toContain(v2)
  })
})
