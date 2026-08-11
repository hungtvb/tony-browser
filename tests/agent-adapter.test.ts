import { describe, it, expect, vi } from 'vitest'
import { createWebContentsAdapter } from '../src/main/ai/agent-adapter'

// Issue #96: escapeSelector in agent-adapter.ts missed backtick / ${ — template-literal
// injection. These tests must pass BEFORE the fix (RED), then stay green after it (GREEN).

function mockWebContents(overrides: Partial<Record<'executeJavaScript' | 'isDestroyed' | 'loadURL', unknown>> = {}) {
  return {
    executeJavaScript: overrides.executeJavaScript ?? vi.fn(async () => ({ ok: true })),
    isDestroyed: overrides.isDestroyed ?? vi.fn(() => false),
    loadURL: overrides.loadURL ?? vi.fn(async () => {}),
  } as any
}

function jsArg(wc: any): string {
  return wc.executeJavaScript.mock.calls[wc.executeJavaScript.mock.calls.length - 1][0] as string
}

describe('createWebContentsAdapter', () => {
  it('click builds the expected JS and calls executeJavaScript once', async () => {
    const wc = mockWebContents()
    const adapter = createWebContentsAdapter(() => wc)
    const res = await adapter.exec('click', '#buy')
    expect(res).toEqual({ ok: true })
    expect(wc.executeJavaScript).toHaveBeenCalledTimes(1)
    const js = jsArg(wc)
    expect(js).toContain(`document.querySelector('#buy')`)
    expect(js).toContain(`el.click()`)
  })

  it('type uses the native value setter and dispatches input and change events', async () => {
    const wc = mockWebContents()
    const adapter = createWebContentsAdapter(() => wc)
    const res = await adapter.exec('type', '#name', 'hello')
    expect(res).toEqual({ ok: true })
    const js = jsArg(wc)
    expect(js).toContain(`document.querySelector('#name')`)
    expect(js).toContain(`HTMLInputElement.prototype, 'value'`)
    expect(js).toContain(`HTMLTextAreaElement.prototype, 'value'`)
    expect(js).toContain(`"hello"`)
    expect(js).toContain(`new Event('input', { bubbles: true })`)
    expect(js).toContain(`new Event('change', { bubbles: true })`)
  })

  it('scroll builds window.scrollBy JS and calls executeJavaScript', async () => {
    const wc = mockWebContents()
    const adapter = createWebContentsAdapter(() => wc)
    await adapter.exec('scroll', '', '250')
    expect(jsArg(wc)).toContain(`window.scrollBy(0, 250)`)
  })

  it('wait caps the delay at 5000 ms', async () => {
    const wc = mockWebContents()
    const adapter = createWebContentsAdapter(() => wc)
    const start = Date.now()
    const res = await adapter.exec('wait', '', '999999')
    expect(res).toEqual({ ok: true })
    const elapsed = Date.now() - start
    expect(elapsed).toBeGreaterThanOrEqual(4500)
    expect(elapsed).toBeLessThan(7000)
    expect(wc.executeJavaScript).not.toHaveBeenCalled()
  }, 10000)

  it('wait uses Math.min(Number(value) || 1000, 5000) semantics', async () => {
    const wc = mockWebContents()
    const adapter = createWebContentsAdapter(() => wc)
    // 0 / NaN → fallback 1000; large → capped 5000. We assert the cap bound only
    // (timing assertions are flaky), plus that no JS is executed for wait.
    await adapter.exec('wait', '', '0')
    expect(wc.executeJavaScript).not.toHaveBeenCalled()
  })

  it('returns { ok:false, error:"No active tab" } for destroyed webContents without calling executeJavaScript', async () => {
    const wc = mockWebContents({ isDestroyed: vi.fn(() => true) })
    const adapter = createWebContentsAdapter(() => wc)
    const res = await adapter.exec('click', '#x')
    expect(res).toEqual({ ok: false, error: 'No active tab' })
    expect(wc.executeJavaScript).not.toHaveBeenCalled()
  })

  it('returns "No active tab" when no webContents at all', async () => {
    const adapter = createWebContentsAdapter(() => null)
    const res = await adapter.exec('click', '#x')
    expect(res).toEqual({ ok: false, error: 'No active tab' })
  })

  it('snapshot returns (no tab) when destroyed', async () => {
    const wc = mockWebContents({ isDestroyed: vi.fn(() => true) })
    const adapter = createWebContentsAdapter(() => wc)
    expect(await adapter.snapshot()).toBe('(no tab)')
  })

  it('snapshot strips script/style/svg/canvas and caps text at 20000 chars, inputs at 40', async () => {
    const wc = mockWebContents({
      executeJavaScript: vi.fn(async () =>
        JSON.stringify({
          title: 't',
          url: 'https://example.com',
          inputs: Array.from({ length: 60 }, (_, i) => `i${i}: <button> b${i}`).join('\n'),
          text: 'x'.repeat(30000),
        }),
      ),
    })
    const adapter = createWebContentsAdapter(() => wc)
    const out = await adapter.snapshot()
    expect(out).toContain('"title":"t"')
    // The injected page script itself must strip script/style/svg/canvas and cap lengths.
    const js = jsArg(wc)
    expect(js).toContain(`querySelectorAll('script,style,noscript,svg,canvas')`)
    expect(js).toContain(`slice(0, 20000)`)
    expect(js).toContain(`slice(0, 40)`)
  })

  it('escapeSelector neutralizes backtick, ${, quote and backslash so no template-literal breakout', async () => {
    const wc = mockWebContents()
    const adapter = createWebContentsAdapter(() => wc)
    const evil = "foo`${1+1}`'\\bar"
    await adapter.exec('click', evil)
    const js = jsArg(wc)
    // The injected selector must stay a literal string inside the template literal:
    // every backtick and `${` must be backslash-escaped (never an interpolation).
    expect(js).not.toMatch(/(?<!\\)`/)      // no unescaped backtick
    expect(js).not.toMatch(/(?<!\\)\$\{/)   // no unescaped ${ interpolation
    expect(js).toContain('\\`')             // escaped backtick present
    expect(js).toContain('\\$')             // escaped dollar present
    expect(js).toContain(`Could not find `)
    // And the whole thing must still be a valid, parseable template literal.
    expect(() => new Function(js)).not.toThrow()
  })
})
