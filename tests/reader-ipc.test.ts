// Issue #55 — reader:extract must not ship full page HTML over IPC.
// Extraction runs in-page; only the trimmed article payload returns.
import { describe, it, expect, vi } from 'vitest'
import { createTabManager } from '../src/main/tabs/TabManager'

const handlers = vi.hoisted(() => new Map<string, (...args: any[]) => any>())

vi.mock('electron', () => ({
  ipcMain: { handle: (ch: string, fn: (...a: any[]) => any) => { handlers.set(ch, fn) } },
  BrowserWindow: class {},
  WebContentsView: class { webContents: any },
  session: { defaultSession: {}, fromPartition: () => ({}) },
  app: { getPath: () => '/tmp/kenzo-reader-test' },
}))

import { registerIpc } from '../src/main/ipc'
import type { IpcDeps } from '../src/main/ipc'

function setupIpc(wc: { executeJavaScript: ReturnType<typeof vi.fn> }) {
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

describe('Issue #55 — reader:extract extracts in-page (no full HTML over IPC)', () => {
  it('executed script does not contain outerHTML and returns only the trimmed article', async () => {
    const article = { title: 'Bài viết', content: 'Đoạn đầu tiên của bài viết.', length: 26 }
    const executeJavaScript = vi.fn((_script: string) => Promise.resolve(JSON.stringify(article)))
    const s = setupIpc({ executeJavaScript })
    const tab = s.tm.open('https://sitea.com/article')
    s.views.set(tab.id, { webContents: { executeJavaScript } })
    s.tm.activate(tab.id)

    const res = await handlers.get('reader:extract')!({}, tab.id)

    expect(executeJavaScript).toHaveBeenCalledTimes(1)
    const script = executeJavaScript.mock.calls[0][0] as string
    expect(script).not.toContain('outerHTML')
    expect(res).toEqual({ ok: true, article })
  })

  it('returns ok:false when no view exists for the tab', async () => {
    const s = setupIpc({ executeJavaScript: vi.fn() })
    const res = await handlers.get('reader:extract')!({}, 'missing-tab')
    expect(res).toEqual({ ok: false, error: expect.any(String) })
  })
})
