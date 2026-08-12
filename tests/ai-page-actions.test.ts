// Issue #127 — page-context quick actions: explain / translate / fix grammar / summarizeSelection
// RED first: service must build per-mode prompts (pageText or selection) and keep 30s timeout.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AIService } from '../src/main/ai/service'

vi.mock('electron', () => ({ app: { getPath: () => '/tmp/kenzo-ai-test' } }))

const CFG = { baseUrl: 'https://llm.example.com/v1', apiKey: 'k', model: 'm' }

/** fetch mock that records the request body and returns a canned reply */
function captureFetch() {
  const calls: any[] = []
  const fn = vi.fn(async (url: string, opts?: any) => {
    calls.push({ url, body: JSON.parse(opts?.body ?? '{}') })
    return { ok: true, json: async () => ({ choices: [{ message: { content: 'Reply' } }] }) }
  })
  return { fn, calls }
}

describe('AIService page-context actions (issue #127)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('explain mode builds a prompt with the page text and asks for a bullet explanation', async () => {
    const { fn, calls } = captureFetch()
    vi.stubGlobal('fetch', fn)
    const svc = new AIService()
    svc.setConfig(CFG)

    const result = await svc.ask({ mode: 'explain', text: '' }, 'PAGE BODY HERE')
    expect(result).toBe('Reply')
    expect(calls).toHaveLength(1)
    const user = calls[0].body.messages[1].content as string
    expect(user).toMatch(/explain/i)
    expect(user).toContain('PAGE BODY HERE')
  })

  it('translate mode builds a prompt that asks for a Vietnamese translation', async () => {
    const { fn, calls } = captureFetch()
    vi.stubGlobal('fetch', fn)
    const svc = new AIService()
    svc.setConfig(CFG)

    await svc.ask({ mode: 'translate', text: '' }, 'PAGE BODY HERE')
    const user = calls[0].body.messages[1].content as string
    expect(user).toMatch(/translate/i)
    expect(user).toMatch(/vietnamese/i)
    expect(user).toContain('PAGE BODY HERE')
  })

  it('fixGrammar mode builds a prompt that returns the corrected copy only', async () => {
    const { fn, calls } = captureFetch()
    vi.stubGlobal('fetch', fn)
    const svc = new AIService()
    svc.setConfig(CFG)

    await svc.ask({ mode: 'fixGrammar', text: '' }, 'PAGE BODY HERE')
    const user = calls[0].body.messages[1].content as string
    expect(user).toMatch(/grammar/i)
    expect(user).toMatch(/correct/i)
    expect(user).toContain('PAGE BODY HERE')
  })

  it('summarizeSelection uses the selected text (params.text) when provided, not the page text', async () => {
    const { fn, calls } = captureFetch()
    vi.stubGlobal('fetch', fn)
    const svc = new AIService()
    svc.setConfig(CFG)

    await svc.ask({ mode: 'summarizeSelection', text: 'SELECTED PARA' }, 'PAGE BODY HERE')
    const user = calls[0].body.messages[1].content as string
    expect(user).toMatch(/summar/i)
    expect(user).toContain('SELECTED PARA')
    expect(user).not.toContain('PAGE BODY HERE')
  })

  it('summarizeSelection falls back to page text when there is no selection', async () => {
    const { fn, calls } = captureFetch()
    vi.stubGlobal('fetch', fn)
    const svc = new AIService()
    svc.setConfig(CFG)

    await svc.ask({ mode: 'summarizeSelection', text: '' }, 'PAGE BODY HERE')
    const user = calls[0].body.messages[1].content as string
    expect(user).toContain('PAGE BODY HERE')
  })

  it('new modes keep the 30s timeout (not the 120s act timeout)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, opts?: { signal?: AbortSignal }) => {
        return new Promise((_resolve, reject) => {
          opts?.signal?.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted', 'AbortError'))
          })
        })
      }),
    )
    const svc = new AIService()
    svc.setConfig(CFG)

    const p = svc.ask({ mode: 'translate', text: '' }, 'x').catch((e) => e)
    // 30s is enough to abort — same as chat/summarize, NOT the 120s act window
    const err = await vi.advanceTimersByTimeAsync(30_000).then(() => p)
    expect((err as Error).message).toMatch(/timed out|timeout/i)
    expect(svc.busy).toBe(false)
  })
})
