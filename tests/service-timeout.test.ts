import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AIService } from '../src/main/ai/service'

vi.mock('electron', () => ({ app: { getPath: () => '/tmp/kenzo-ai-test' } }))

const CFG = { baseUrl: 'https://llm.example.com/v1', apiKey: 'k', model: 'm' }

/** Mock fetch treo vô hạn nhưng reject khi signal abort (giống fetch thật) */
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

  it('fetch treo (không bao giờ resolve) → throw timeout, busy reset về false', async () => {
    vi.stubGlobal('fetch', hangingFetchMock())
    const svc = new AIService()
    svc.setConfig(CFG)

    const p = svc.ask({ mode: 'chat', text: 'hi' }).catch((e) => e)
    expect(svc.busy).toBe(true)
    // 30s chat timeout → abort → fetch reject → ask throw timeout
    const err = await vi.advanceTimersByTimeAsync(30_000).then(() => p)
    expect(err).toBeInstanceOf(Error)
    expect((err as Error).message).toMatch(/timeout/i)
    expect(svc.busy).toBe(false)
  })

  it('mode act dùng timeout dài hơn (120s)', async () => {
    vi.stubGlobal('fetch', hangingFetchMock())
    const svc = new AIService()
    svc.setConfig(CFG)

    const p = svc.ask({ mode: 'act', text: 'bấm nút' }).catch((e) => e)
    // 30s chưa abort ở act mode
    await vi.advanceTimersByTimeAsync(30_000)
    expect(svc.busy).toBe(true)
    // tổng 120s → abort
    const err = await vi.advanceTimersByTimeAsync(90_000).then(() => p)
    expect((err as Error).message).toMatch(/timeout/i)
    expect(svc.busy).toBe(false)
  })

  it('response nhanh bình thường — clearTimeout, không throw, busy reset', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'chào bạn' } }] }),
      })),
    )
    const svc = new AIService()
    svc.setConfig(CFG)

    const result = await svc.ask({ mode: 'chat', text: 'hi' })
    // đẩy thêm 31s — timer đã clear, không throw
    await vi.advanceTimersByTimeAsync(31_000)
    expect(result).toBe('chào bạn')
    expect(svc.busy).toBe(false)
  })
})