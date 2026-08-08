import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createAgentCore, parseActions, type PageAdapter } from '../src/main/ai/agent'

describe('AgentCore', () => {
  let adapter: PageAdapter
  let agent: ReturnType<typeof createAgentCore>

  beforeEach(() => {
    adapter = {
      snapshot: vi.fn(async () => 'HTML: <button id="buy">Mua ngay</button>'),
      exec: vi.fn(async () => ({ ok: true })),
    }
    agent = createAgentCore(adapter)
  })

  it('parses valid actions and executes', async () => {
    const result = await agent.run([{ type: 'click', selector: '#buy' }])
    expect(adapter.exec).toHaveBeenCalledWith('click', '#buy', undefined)
    expect(result.summary).toContain('click #buy')
  })

  it('reports when no valid actions found', async () => {
    const result = await agent.run([])
    expect(result.summary).toContain('Không tìm thấy')
    expect(adapter.exec).not.toHaveBeenCalled()
  })

  it('plans with snapshot', async () => {
    await agent.plan('Mua sản phẩm')
    expect(adapter.snapshot).toHaveBeenCalled()
  })

  it('filters out invalid action types', async () => {
    const actions = parseActions('[{"type":"hack","selector":"#x"},{"type":"click","selector":"#buy"}]')
    expect(actions).toEqual([{ type: 'click', selector: '#buy', value: undefined }])
  })
})

describe('parseActions', () => {
  it('parses raw LLM reply inside fenced code with trailing prose', () => {
    const text = '```json\n[{"type":"click","selector":"#buy"}]\n```\nĐã thực hiện xong, còn lại: [1,2] mục và [3] việc khác.'
    expect(parseActions(text)).toEqual([{ type: 'click', selector: '#buy', value: undefined }])
  })

  it('parses plain JSON array string', () => {
    expect(parseActions('[{"type":"scroll","value":"400"}]')).toEqual([
      { type: 'scroll', selector: undefined, value: '400' },
    ])
  })

  it('returns empty for junk', () => {
    expect(parseActions('Xin lỗi, tôi không hiểu')).toEqual([])
  })
})