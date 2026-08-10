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

  it('does not expose dead plan() — snapshot available via adapter.snapshot() (fix #61)', async () => {
    // 🔴 RED trước: plan() là API chết (chỉ trả adapter.snapshot(), không dùng goal, không gọi LLM,
    // production không ai gọi). Fix #61: bỏ khỏi return object của createAgentCore.
    expect(agent).not.toHaveProperty('plan')
  })

  it('filters out invalid action types', async () => {
    const actions = parseActions('[{"type":"hack","selector":"#x"},{"type":"click","selector":"#buy"}]')
    expect(actions).toEqual([{ type: 'click', selector: '#buy', value: undefined }])
  })

  it('stops after MAX_ACTIONS (8) actions', async () => {
    const actions = Array.from({ length: 12 }, (_, i) => ({ type: 'click', selector: `#btn${i}` }))
    const result = await agent.run(actions)
    expect(adapter.exec).toHaveBeenCalledTimes(8)
    expect(result.actionsTaken).toHaveLength(8)
    expect(result.summary).toContain('MAX_ACTIONS')
  })

  it('rejects navigate with non-http(s) scheme (file://, javascript:)', async () => {
    const result = await agent.run([{ type: 'navigate', value: 'file:///etc/passwd' }])
    expect(adapter.exec).not.toHaveBeenCalled()
    expect(result.summary).toContain('từ chối')
    const js = await agent.run([{ type: 'navigate', value: 'javascript:alert(1)' }])
    expect(adapter.exec).not.toHaveBeenCalled()
    expect(js.summary).toContain('từ chối')
  })

  it('allows navigate with http/https', async () => {
    const result = await agent.run([{ type: 'navigate', value: 'https://example.com' }])
    expect(adapter.exec).toHaveBeenCalledWith('navigate', '', 'https://example.com')
    expect(result.actionsTaken).toContain('navigate https://example.com')
  })

  it('wait không ngốn MAX_ACTIONS — bị skip, không count, không exec (fix #33)', async () => {
    // 8 click thật + 4 wait lẫn vào → chỉ 8 click được exec, wait không chiếm slot
    const actions = [
      ...Array.from({ length: 8 }, (_, i) => ({ type: 'click' as const, selector: `#btn${i}` })),
      { type: 'wait' as const, value: '1000' },
      { type: 'wait' as const, value: '1000' },
      { type: 'wait' as const, value: '1000' },
      { type: 'wait' as const, value: '1000' },
    ]
    const result = await agent.run(actions)
    expect(adapter.exec).toHaveBeenCalledTimes(8)
    expect(result.actionsTaken).toHaveLength(8)
    expect(result.actionsTaken.some(a => a.includes('wait'))).toBe(false)
    expect(result.summary).not.toContain('MAX_ACTIONS')
  })

  it('rejects selector chứa ký tự không an toàn — prompt injection guard (fix #33)', async () => {
    const badSelectors = [
      '#buy;alert(1)',        // dấu ;
      '#buy`;alert(1)//',     // backtick — phá vỡ template literal của executeJavaScript
      '#buy\nwindow.alert(1)', // xuống dòng
    ]
    for (const sel of badSelectors) {
      const result = await agent.run([{ type: 'click', selector: sel }])
      expect(adapter.exec).not.toHaveBeenCalled()
      expect(result.summary).toContain('từ chối')
      expect(result.summary).toContain('selector')
    }
  })

  it('rejects selector quá dài (> 200 ký tự)', async () => {
    const long = '#btn' + 'a'.repeat(250)
    const result = await agent.run([{ type: 'click', selector: long }])
    expect(adapter.exec).not.toHaveBeenCalled()
    expect(result.summary).toContain('từ chối')
  })

  it('vẫn exec bình thường với selector hợp lệ', async () => {
    const result = await agent.run([{ type: 'click', selector: '#buy' }, { type: 'scroll', selector: undefined }])
    expect(adapter.exec).toHaveBeenCalledWith('click', '#buy', undefined)
    expect(adapter.exec).toHaveBeenCalledWith('scroll', '', undefined)
    expect(result.actionsTaken).toHaveLength(2)
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

  it('keeps numeric value (scroll/size params) as string — regression from reviewer warning', () => {
    // 🔴 Regression cũ: `value: typeof obj.value === 'string' ? obj.value : undefined`
    // drop value number (vd 800) → adapter fallback 400px/1000ms dù LLM yêu cầu khác
    expect(parseActions('[{"type":"scroll","value":800}]')).toEqual([
      { type: 'scroll', selector: undefined, value: '800' },
    ])
    expect(parseActions('[{"type":"type","selector":"#q","value":42}]')).toEqual([
      { type: 'type', selector: '#q', value: '42' },
    ])
  })

  it('filters out wait actions — wait không còn là action hợp lệ (fix #33: no-op từng ngốn slot MAX_ACTIONS)', () => {
    // wait bị loại khỏi ACTION_TYPES → LLM trả wait bị lọc từ parse, không tới run()
    expect(parseActions('[{"type":"wait","value":2000}]')).toEqual([])
    expect(parseActions('[{"type":"wait","value":2000},{"type":"click","selector":"#buy"}]')).toEqual([
      { type: 'click', selector: '#buy', value: undefined },
    ])
  })

  it('prefers action array over numeric array appearing earlier in prose — reviewer nit', () => {
    // Nit: step 3 cũ trả array parse được ĐẦU TIÊN → prose "[1,2]" nuốt mất action thật
    const text = 'Kết quả: [1,2] mục. Các bước: [{"type":"click","selector":"#buy","value":800}]'
    expect(parseActions(text)).toEqual([
      { type: 'click', selector: '#buy', value: '800' },
    ])
  })

  it('falls back to first parseable array when no action array found', () => {
    expect(parseActions('Kết quả: [1,2] mục')).toEqual([])
  })
})