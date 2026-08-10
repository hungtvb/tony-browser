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
    // Real RED: the greedy regex /\[[\s\S]*\]/ in extractJsonArray eats from the first [
    // (JSON array opening) to the final ] (after the prose "[1,2],[3]") → JSON.parse fails → returns []
    const { deps, wc } = makeDeps()
    vi.spyOn(AIService.prototype, 'ask').mockResolvedValue(
      '```json\n[{"type":"click","selector":"#buy"}]\n```\nDone, remaining: [1,2] items and [3] other tasks.',
    )
    const ctrl = new AIController(deps as any)
    const result = await ctrl.ask({ tabId: 't1', mode: 'act', text: 'Click the buy button' })

    expect(result).toContain('click #buy')
    expect(wc.executeJavaScript).toHaveBeenCalled()
  })

  it('executes actions when LLM returns plain JSON array (no fence)', async () => {
    const { deps, wc } = makeDeps()
    vi.spyOn(AIService.prototype, 'ask').mockResolvedValue(
      '[{"type":"click","selector":"#buy"},{"type":"scroll","value":400}]',
    )
    const ctrl = new AIController(deps as any)
    const result = await ctrl.ask({ tabId: 't1', mode: 'act', text: 'Click the buy button' })

    expect(result).toContain('click #buy')
    expect(result).toContain('scroll')
    expect(wc.executeJavaScript).toHaveBeenCalled()
  })

  it('reports failure when LLM returns junk (no valid actions)', async () => {
    const { deps, wc } = makeDeps()
    vi.spyOn(AIService.prototype, 'ask').mockResolvedValue('Sorry, I do not understand')
    const ctrl = new AIController(deps as any)
    const result = await ctrl.ask({ tabId: 't1', mode: 'act', text: 'Click the buy button' })

    expect(result).toContain('No actions could be determined')
    // snapshot() still calls executeJavaScript (valid) — it just does not execute any specific action
    expect(wc.executeJavaScript).toHaveBeenCalledTimes(1)
  })
})