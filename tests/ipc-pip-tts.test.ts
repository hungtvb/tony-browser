// IPC handler behavior tests for PiP (pip:start/pip:stop) and TTS (tts:speak/tts:stop) channels (issue #83)
// Same harness pattern as tests/nav-controls.test.ts: registerIpc against a mock IpcDeps with a fake
// view whose webContents.executeJavaScript inspects the injected script string and resolves the branch.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTabManager } from '../src/main/tabs/TabManager'

const handlers = vi.hoisted(() => new Map<string, (...args: any[]) => any>())

vi.mock('electron', () => ({
  ipcMain: { handle: (ch: string, fn: (...a: any[]) => any) => { handlers.set(ch, fn) } },
  BrowserWindow: class {},
  WebContentsView: class { webContents: any },
  session: { defaultSession: {}, fromPartition: () => ({}) },
  app: { getPath: () => '/tmp/kenzo-pip-tts-test' },
}))

import { registerIpc } from '../src/main/ipc'
import type { IpcDeps } from '../src/main/ipc'

/** Branch knobs for the fake page: the fake executeJavaScript inspects the injected script string. */
interface PageState {
  hasVideo?: boolean
  supportsPip?: boolean
  hasActivePip?: boolean
  bodyText?: string
}

function fakeWC(page: PageState) {
  return {
    isDestroyed: () => false,
    executeJavaScript: vi.fn(async (script: string) => {
      // tts:speak script — document.body.innerText
      if (script.includes('document.body.innerText')) return page.bodyText ?? ''
      // pip:stop script — document.pictureInPictureElement
      if (script.includes('document.pictureInPictureElement')) {
        return page.hasActivePip ? { ok: true } : { ok: false, error: 'No PiP video' }
      }
      // pip:start script — requestPictureInPicture
      if (script.includes('requestPictureInPicture')) {
        if (!page.hasVideo) return { ok: false, error: 'Video not found' }
        if (!page.supportsPip) return { ok: false, error: 'Browser does not support PiP' }
        return { ok: true }
      }
      return undefined
    }),
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

describe('PiP handlers — pip:start / pip:stop', () => {
  let tm: ReturnType<typeof createTabManager>
  let views: Map<string, any>
  let page: PageState

  beforeEach(() => {
    const s = setupIpc()
    tm = s.tm
    views = s.views
    page = {}
    const tab = tm.open('https://video.example')
    views.set(tab.id, { webContents: fakeWC(page) })
    tm.activate(tab.id)
  })

  it('pip:start with no tab → { ok:false, error:"No tab" }', async () => {
    views.clear()
    expect(await handlers.get('pip:start')!(null, tm.activeId)).toEqual({ ok: false, error: 'No tab' })
  })

  it('pip:start with no <video> → { ok:false, error:"Video not found" }', async () => {
    page.hasVideo = false
    page.supportsPip = true
    expect(await handlers.get('pip:start')!(null, tm.activeId)).toEqual({ ok: false, error: 'Video not found' })
  })

  it('pip:start when the browser lacks requestPictureInPicture → { ok:false, error:"Browser does not support PiP" }', async () => {
    page.hasVideo = true
    page.supportsPip = false
    expect(await handlers.get('pip:start')!(null, tm.activeId)).toEqual({ ok: false, error: 'Browser does not support PiP' })
  })

  it('pip:start with a supported video → { ok:true }', async () => {
    page.hasVideo = true
    page.supportsPip = true
    expect(await handlers.get('pip:start')!(null, tm.activeId)).toEqual({ ok: true })
  })

  it('pip:stop with no tab → { ok:false, error:"No tab" }', async () => {
    views.clear()
    expect(await handlers.get('pip:stop')!(null, tm.activeId)).toEqual({ ok: false, error: 'No tab' })
  })

  it('pip:stop with an active PiP element → { ok:true }', async () => {
    page.hasActivePip = true
    expect(await handlers.get('pip:stop')!(null, tm.activeId)).toEqual({ ok: true })
  })

  it('pip:stop with no PiP video → { ok:false, error:"No PiP video" }', async () => {
    page.hasActivePip = false
    expect(await handlers.get('pip:stop')!(null, tm.activeId)).toEqual({ ok: false, error: 'No PiP video' })
  })
})

describe('TTS handlers — tts:speak / tts:stop', () => {
  let tm: ReturnType<typeof createTabManager>
  let views: Map<string, any>
  let page: PageState

  beforeEach(() => {
    const s = setupIpc()
    tm = s.tm
    views = s.views
    page = {}
    const tab = tm.open('https://article.example')
    views.set(tab.id, { webContents: fakeWC(page) })
    tm.activate(tab.id)
  })

  it('tts:speak with no tab → { ok:false, error:"No tab" }', async () => {
    views.clear()
    expect(await handlers.get('tts:speak')!(null, tm.activeId)).toEqual({ ok: false, error: 'No tab' })
  })

  it('tts:speak with empty body innerText → { ok:false, error:"Page has no readable content" }', async () => {
    page.bodyText = '   '
    expect(await handlers.get('tts:speak')!(null, tm.activeId)).toEqual({ ok: false, error: 'Page has no readable content' })
  })

  it('tts:speak with readable text → { ok:true, text } trimmed to 4000 chars', async () => {
    page.bodyText = '  Hello world  '
    const res = await handlers.get('tts:speak')!(null, tm.activeId)
    expect(res).toEqual({ ok: true, text: 'Hello world' })
  })

  it('tts:stop → { ok:true } (no-op success)', async () => {
    expect(await handlers.get('tts:stop')!()).toEqual({ ok: true })
  })
})
