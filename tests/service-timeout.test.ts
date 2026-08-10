import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AIService } from '../src/main/ai/service'

vi.mock('electron', () => ({ app: { getPath: () => '/tmp/kenzo-ai-test' } }))

const CFG = { baseUrl: 'https://llm.example.com/v1', apiKey: 'k', model: 'm' }

/** Mock fetch that hangs forever but rejects when the signal aborts (like real fetch) */
function hangingFetchMock() {
  return vi.fn((_url: string, opts?: { signal?: AbortSignal }) => {
    return new Promise((_resolve, reject) => {
      opts?.signal?.addEventListener('abort', () => {
        reject(new DOMException('The operation was aborted', 'AbortError'))
      })
    })
  })
}

describe('AIService.ask timeout', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('hanging fetch (never resolves) → throws timeout, busy resets to false', async () => {
    vi.stubGlobal('fetch', hangingFetchMock())
    const svc = new AIService()
    svc.setConfig(CFG)

    const p = svc.ask({ mode: 'chat', text: 'hi' }).catch((e) => e)
    expect(svc.busy).toBe(true)
    // 30s chat timeout → abort → fetch reject → ask throw timeout
    const err = await vi.advanceTimersByTimeAsync(30_000).then(() => p)
    expect(err).toBeInstanceOf(Error)
    expect((err as Error).message).toMatch(/timed out|timeout/i)
    expect(svc.busy).toBe(false)
  })

  it('act mode uses a longer timeout (120s)', async () => {
    vi.stubGlobal('fetch', hangingFetchMock())
    const svc = new AIService()
    svc.setConfig(CFG)

    const p = svc.ask({ mode: 'act', text: 'click button' }).catch((e) => e)
    // 30s does not abort in act mode
    await vi.advanceTimersByTimeAsync(30_000)
    expect(svc.busy).toBe(true)
    // 120s total → abort
    const err = await vi.advanceTimersByTimeAsync(90_000).then(() => p)
    expect((err as Error).message).toMatch(/timed out|timeout/i)
    expect(svc.busy).toBe(false)
  })

  it('fast normal response — clearTimeout, no throw, busy reset', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'Hello' } }] }),
      })),
    )
    const svc = new AIService()
    svc.setConfig(CFG)

    const result = await svc.ask({ mode: 'chat', text: 'hi' })
    // advance 31s more — timer already cleared, no throw
    await vi.advanceTimersByTimeAsync(31_000)
    expect(result).toBe('Hello')
    expect(svc.busy).toBe(false)
  })
})