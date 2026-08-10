// viewEvents (issues #42/#43) — webContents events are forwarded to the given handlers
import { describe, it, expect, vi } from 'vitest'
import { attachViewEvents } from '../src/main/tabs/viewEvents'

type Listener = (...args: any[]) => void

function fakeView() {
  const listeners = new Map<string, Listener[]>()
  const wc = {
    on: (ev: string, cb: Listener) => {
      const arr = listeners.get(ev) ?? []
      arr.push(cb)
      listeners.set(ev, arr)
    },
    emit: (ev: string, ...args: any[]) => {
      ;(listeners.get(ev) ?? []).forEach(cb => cb(...args))
    },
  }
  return { wc, listeners }
}

describe('attachViewEvents — navigation + loading events forwarded', () => {
  it('did-navigate → onNavigated with the new url', () => {
    const { wc } = fakeView()
    const onNavigated = vi.fn()
    attachViewEvents({ webContents: wc } as any, { onNavigated })
    wc.emit('did-navigate', {}, 'https://siteb.com/page')
    expect(onNavigated).toHaveBeenCalledWith('https://siteb.com/page')
  })

  it('did-navigate-in-page → onNavigated (SPA / hash navigation)', () => {
    const { wc } = fakeView()
    const onNavigated = vi.fn()
    attachViewEvents({ webContents: wc } as any, { onNavigated })
    wc.emit('did-navigate-in-page', {}, 'https://sitea.com#section')
    expect(onNavigated).toHaveBeenCalledWith('https://sitea.com#section')
  })

  it('did-start-loading → onLoading(true); did-stop-loading → onLoading(false)', () => {
    const { wc } = fakeView()
    const onLoading = vi.fn()
    attachViewEvents({ webContents: wc } as any, { onLoading })
    wc.emit('did-start-loading')
    expect(onLoading).toHaveBeenCalledWith(true)
    wc.emit('did-stop-loading')
    expect(onLoading).toHaveBeenCalledWith(false)
  })

  it('did-fail-load → onLoading(false) (loading state must clear on failure)', () => {
    const { wc } = fakeView()
    const onLoading = vi.fn()
    attachViewEvents({ webContents: wc } as any, { onLoading })
    wc.emit('did-start-loading')
    wc.emit('did-fail-load')
    expect(onLoading).toHaveBeenLastCalledWith(false)
  })

  it('no handlers → attaching is a safe no-op', () => {
    const { wc } = fakeView()
    expect(() => attachViewEvents({ webContents: wc } as any, {})).not.toThrow()
  })
})
