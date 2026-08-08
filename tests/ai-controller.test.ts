import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AIController } from '../src/main/ai/controller'
import { AIService } from '../src/main/ai/service'

vi.mock('electron', () => ({ app: { getPath: () => '/tmp/kenzo-ai-test' } }))

describe('AIController act-mode', () => {
  function makeDeps() {
    const wc = {
      isDestroyed: () => false,
      executeJavaScript: vi.fn(async () => ({ ok: true })),
      loadURL: vi.fn(async () => {}),
    }
    const view = { webContents: wc }
    const deps = {
      getWindow: () => null,
      getTabManager: () => ({ list: () => [] }),
      trackView: () => {},
      getActiveView: (tabId: string) => (tabId === 't1' ? view : undefined),
      createRealView: () => ({} as any),
    }
    return { deps, wc }
  }

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('executes actions when LLM returns JSON inside ```json fence with trailing prose', async () => {
    // RED thật: regex greedy /\[[\s\S]*\]/ của extractJsonArray ăn từ [ đầu
    // (mở array JSON) tới ] cuối (sau prose "[1,2],[3]") → JSON.parse fail → trả []
    const { deps, wc } = makeDeps()
    vi.spyOn(AIService.prototype, 'ask').mockResolvedValue(
      '```json\n[{"type":"click","selector":"#buy"}]\n```\nĐã thực hiện xong, còn lại: [1,2] mục và [3] việc khác.',
    )
    const ctrl = new AIController(deps as any)
    const result = await ctrl.ask({ tabId: 't1', mode: 'act', text: 'Bấm nút mua' })

    expect(result).toContain('click #buy')
    expect(wc.executeJavaScript).toHaveBeenCalled()
  })

  it('executes actions when LLM returns plain JSON array (no fence)', async () => {
    const { deps, wc } = makeDeps()
    vi.spyOn(AIService.prototype, 'ask').mockResolvedValue(
      '[{"type":"click","selector":"#buy"},{"type":"scroll","value":400}]',
    )
    const ctrl = new AIController(deps as any)
    const result = await ctrl.ask({ tabId: 't1', mode: 'act', text: 'Bấm nút mua' })

    expect(result).toContain('click #buy')
    expect(result).toContain('scroll')
    expect(wc.executeJavaScript).toHaveBeenCalled()
  })

  it('reports failure when LLM returns junk (no valid actions)', async () => {
    const { deps, wc } = makeDeps()
    vi.spyOn(AIService.prototype, 'ask').mockResolvedValue('Xin lỗi, tôi không hiểu')
    const ctrl = new AIController(deps as any)
    const result = await ctrl.ask({ tabId: 't1', mode: 'act', text: 'Bấm nút mua' })

    expect(result).toContain('Không xác định được hành động')
    // snapshot() vẫn gọi executeJavaScript (hợp lệ) — chỉ không thực thi action cụ thể nào
    expect(wc.executeJavaScript).toHaveBeenCalledTimes(1)
  })
})