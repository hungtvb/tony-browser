import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AIController } from '../src/main/ai/controller'
import { AIService } from '../src/main/ai/service'
import * as reader from '../src/main/ai/reader'

vi.mock('electron', () => ({ app: { getPath: () => '/tmp/kenzo-ai-test' } }))

describe('AIController summarizeAll (song song hóa)', () => {
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

  it('RED: 3 tab chạy SONG SONG — tổng thời gian < tổng thời gian tuần tự, 1 tab fail vẫn ra summary', async () => {
    const deps = makeDeps([
      { id: 't1', title: 'Tab 1', url: 'https://a.com' },
      { id: 't2', title: 'Tab 2', url: 'https://b.com' },
      { id: 't3', title: 'Tab 3', url: 'https://c.com' },
    ])
    // extractPageText trả Promise trễ 80ms mỗi tab (mô phỏng executeJavaScript chậm)
    vi.spyOn(reader, 'extractPageText').mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 80))
      return 'nội dung tab'
    })
    // Tab t2 extract fail → rejected promise
    const wc2 = deps.getActiveView('t2')?.webContents
    if (!wc2) throw new Error('test setup: missing view t2')
    vi.spyOn(reader, 'extractPageMeta').mockImplementation(async (wc: any) => {
      if (wc === wc2) throw new Error('webContents destroyed')
      return { title: wc.getTitle(), url: wc.getURL() }
    })
    const askSpy = vi.spyOn(AIService.prototype, 'ask').mockResolvedValue('Tổng hợp xong')
    const ctrl = new AIController(deps as any)

    const start = Date.now()
    const result = await ctrl.ask({ tabId: 't1', mode: 'summarizeAll', text: '' })
    const elapsed = Date.now() - start

    // song song: 3 tab × 80ms nhưng chạy đồng thời → ~80-160ms, không phải 240ms+
    expect(elapsed).toBeLessThan(220)
    // 2 tab thành công (t2 fail bị bỏ qua), không throw
    expect(result).toBe('Tổng hợp xong')
    expect(askSpy).toHaveBeenCalledTimes(1)
    const pageText = askSpy.mock.calls[0][1] as string
    // thứ tự đúng theo index: t1 trước t3
    expect(pageText.indexOf('Tab 1')).toBeLessThan(pageText.indexOf('Tab 3'))
    expect(pageText).not.toContain('Tab 2')
  })

  it('cap 10 tab — chỉ xử lý tối đa 10 tab/lần', async () => {
    const tabs = Array.from({ length: 14 }, (_, i) => ({
      id: `t${i}`,
      title: `Tab ${i}`,
      url: `https://site${i}.com`,
    }))
    const deps = makeDeps(tabs)
    vi.spyOn(reader, 'extractPageText').mockImplementation(async () => 'nội dung')
    vi.spyOn(reader, 'extractPageMeta').mockImplementation(async (wc: any) => ({
      title: wc.getTitle(),
      url: wc.getURL(),
    }))
    const askSpy = vi.spyOn(AIService.prototype, 'ask').mockResolvedValue('Tổng hợp xong')
    const ctrl = new AIController(deps as any)

    await ctrl.ask({ tabId: 't1', mode: 'summarizeAll', text: '' })
    const pageText = askSpy.mock.calls[0][1] as string
    // chỉ 10 tab đầu được đưa vào prompt
    expect(pageText).toContain('Tab 0')
    expect(pageText).toContain('Tab 9')
    expect(pageText).not.toContain('Tab 10')
  })
})