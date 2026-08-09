// TabSleeper — discard: ngủ tab phải giải phóng RAM thật (đóng webContents chứ không chỉ setBackgroundThrottling),
// wake phải tạo lại view + load lại url gốc. Electron 31 không có webContents.discard() →
// dùng close() + gỡ view (tương đương discard: unload renderer, giữ tab entry).
import { describe, it, expect, vi } from 'vitest'
import { createTabManager } from '../src/main/tabs/TabManager'
import { SleeperController } from '../src/main/perf/controller'
import type { Tab } from '../src/main/tabs/TabManager'

// mock electron: registerIpc cần ipcMain.handle; app.getPath cho AIController/focus store khởi tạo
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
    // giống createTabView thật: tạo view + load url ngay
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

describe('TabSleeper — giải phóng RAM thật qua IPC (sleeper:evaluate + tabs:activate)', () => {
  it('tab nền idle 11 phút → sleeper:evaluate đóng webContents (free RAM) + gỡ view khỏi track', async () => {
    const { tm, views } = setupIpc()
    const wc = fakeWC()
    tm.open('https://sitea.com')
    tm.open('https://siteb.com') // b active → a là tab nền
    const a = tm.list().find(t => t.url === 'https://sitea.com')!
    a.lastActive = Date.now() - 11 * 60 * 1000
    views.set(a.id, { webContents: wc })

    await handlers.get('sleeper:evaluate')!()

    expect(wc.close).toHaveBeenCalledTimes(1) // đóng webContents → renderer bị unload, RAM trả về
    expect(views.has(a.id)).toBe(false)       // view không còn được track
  })

  it('wake tab đang ngủ (view đã bị đóng) → tabs:activate tạo view mới + load url gốc', async () => {
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

    expect(createRealView).toHaveBeenCalledWith('https://sitea.com') // url gốc từ tm.get(wid)
    const newView = views.get(a.id)
    expect(newView).toBeDefined()
    expect(newView.webContents.loadURL).toHaveBeenCalledWith('https://sitea.com')
  })

  it('wake tab đang ngủ nhưng view còn sống → chỉ gỡ throttle, không tạo view mới', async () => {
    const { tm, views, deps } = setupIpc()
    const wc = fakeWC()
    tm.open('https://sitea.com')
    tm.open('https://siteb.com')
    const a = tm.list().find(t => t.url === 'https://sitea.com')!
    a.lastActive = Date.now() - 11 * 60 * 1000
    views.set(a.id, { webContents: wc })
    // view đã bị destroy (lý do onSleep không close được) → vẫn được track
    wc.isDestroyed.mockReturnValue(true)
    await handlers.get('sleeper:evaluate')!()
    expect(views.has(a.id)).toBe(true)

    // view "sống lại" trước khi activate → chỉ gỡ throttle, không dựng view mới
    wc.isDestroyed.mockReturnValue(false)
    const createRealView = vi.spyOn(deps, 'createRealView')
    handlers.get('tabs:activate')!({}, a.id)
    expect(createRealView).not.toHaveBeenCalled()
    expect(wc.setBackgroundThrottling).toHaveBeenCalledWith(false)
  })
})

describe('SleeperController — đánh dấu sleeping sau khi onSleep (discard) xong + wake không reset deadline', () => {
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

  it('onSleep chưa hoàn tất → chưa đánh dấu sleeping; await xong mới đánh dấu', async () => {
    const c = new SleeperController()
    const old = Date.now() - 11 * 60 * 1000
    let release!: () => void
    const gate = new Promise<void>(r => { release = r })
    const p = c.evaluate([makeTab('a', old)], 'b', [], [], () => gate)
    expect(c.isSleeping('a')).toBe(false) // discard còn treo → chưa ngủ
    release()
    await p
    expect(c.isSleeping('a')).toBe(true)
  })

  it('wake KHÔNG reset deadline tracker — lastActive vẫn cũ → evaluate tiếp ngủ lại', async () => {
    const c = new SleeperController()
    const old = Date.now() - 11 * 60 * 1000
    await c.evaluate([makeTab('a', old)], 'b', [], [], () => {})
    expect(c.isSleeping('a')).toBe(true)

    c.wake('a')
    expect(c.isSleeping('a')).toBe(false)

    // tm.activate không chạy (wake ngoài luồng tabs:activate) → lastActive vẫn cũ
    // → wake không được âm thầm reset deadline 10 phút
    const r = await c.evaluate([makeTab('a', old)], 'b', [], [], () => {})
    expect(r.sleeping).toBe(1)
  })
})
