import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AIController } from '../src/main/ai/controller'
import { AIService } from '../src/main/ai/service'
import * as reader from '../src/main/ai/reader'

vi.mock('electron', () => ({ app: { getPath: () => '/tmp/kenzo-ai-test' } }))

describe('AIController summarizeAll (parallelization)', () => {
  function makeDeps(tabs: { id: string; title: string; url: string }[]) {
    const views = new Map(
      tabs.map((t) => [
        t.id,
        { webContents: { getTitle: () => t.title, getURL: () => t.url } },
      ]),
    )
    const deps = {
      getWindow: () => null,
      getTabManager: () => ({ list: () => tabs.map((t) => ({ id: t.id, title: t.title, url: t.url })) }),
      trackView: () => {},
      getActiveView: (tabId: string) => views.get(tabId),
      createRealView: () => ({} as any),
    }
    return deps
  }

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('RED: 3 tabs run IN PARALLEL — total time < sequential total time, 1 failing tab still yields a summary', async () => {
    const deps = makeDeps([
      { id: 't1', title: 'Tab 1', url: 'https://a.com' },
      { id: 't2', title: 'Tab 2', url: 'https://b.com' },
      { id: 't3', title: 'Tab 3', url: 'https://c.com' },
    ])
    // extractPageText returns a Promise delayed 80ms per tab (simulating slow executeJavaScript)
    // Count extracts running concurrently — a quantitative assertion, not wall-time dependent (anti-flaky CI)
    let concurrent = 0
    let maxConcurrent = 0
    vi.spyOn(reader, 'extractPageText').mockImplementation(async () => {
      concurrent++
      maxConcurrent = Math.max(maxConcurrent, concurrent)
      await new Promise((r) => setTimeout(r, 80))
      concurrent--
      return 'tab content'
    })
    // Tab t2 extract fails → rejected promise
    const wc2 = deps.getActiveView('t2')?.webContents
    if (!wc2) throw new Error('test setup: missing view t2')
    vi.spyOn(reader, 'extractPageMeta').mockImplementation(async (wc: any) => {
      if (wc === wc2) throw new Error('webContents destroyed')
      return { title: wc.getTitle(), url: wc.getURL() }
    })
    const askSpy = vi.spyOn(AIService.prototype, 'ask').mockResolvedValue('Summary complete')
    const ctrl = new AIController(deps as any)

    const result = await ctrl.ask({ tabId: 't1', mode: 'summarizeAll', text: '' })

    // real parallelism: 3 extracts must overlap at some point (sequential would give maxConcurrent = 1)
    expect(maxConcurrent).toBeGreaterThanOrEqual(2)
    // 2 tabs succeed (t2 failure is skipped), no throw
    expect(result).toBe('Summary complete')
    expect(askSpy).toHaveBeenCalledTimes(1)
    const pageText = askSpy.mock.calls[0][1] as string
    // correct order by index: t1 before t3
    expect(pageText.indexOf('Tab 1')).toBeLessThan(pageText.indexOf('Tab 3'))
    expect(pageText).not.toContain('Tab 2')
  })

  it('caps at 10 tabs — processes at most 10 tabs per run', async () => {
    const tabs = Array.from({ length: 14 }, (_, i) => ({
      id: `t${i}`,
      title: `Tab ${i}`,
      url: `https://site${i}.com`,
    }))
    const deps = makeDeps(tabs)
    vi.spyOn(reader, 'extractPageText').mockImplementation(async () => 'content')
    vi.spyOn(reader, 'extractPageMeta').mockImplementation(async (wc: any) => ({
      title: wc.getTitle(),
      url: wc.getURL(),
    }))
    const askSpy = vi.spyOn(AIService.prototype, 'ask').mockResolvedValue('Summary complete')
    const ctrl = new AIController(deps as any)

    await ctrl.ask({ tabId: 't1', mode: 'summarizeAll', text: '' })
    const pageText = askSpy.mock.calls[0][1] as string
    // only the first 10 tabs are included in the prompt
    expect(pageText).toContain('Tab 0')
    expect(pageText).toContain('Tab 9')
    expect(pageText).not.toContain('Tab 10')
  })
})