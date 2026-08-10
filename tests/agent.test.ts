import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createAgentCore, parseActions, type PageAdapter } from '../src/main/ai/agent'

describe('AgentCore', () => {
  let adapter: PageAdapter
  let agent: ReturnType<typeof createAgentCore>

  beforeEach(() => {
    adapter = {
      snapshot: vi.fn(async () => 'HTML: <button id="buy">Buy now</button>'),
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
    expect(result.summary).toContain('Could not determine the action')
    expect(adapter.exec).not.toHaveBeenCalled()
  })

  it('does not expose dead plan() — snapshot available via adapter.snapshot() (fix #61)', async () => {
    // 🔴 RED first: plan() was a dead API (it only returned adapter.snapshot(), never used
    // goal, never called the LLM, nothing in production called it). Fix #61: removed it from
    // createAgentCore's return object.
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
    expect(result.summary).toContain('rejected')
    const js = await agent.run([{ type: 'navigate', value: 'javascript:alert(1)' }])
    expect(adapter.exec).not.toHaveBeenCalled()
    expect(js.summary).toContain('rejected')
  })

  it('allows navigate with http/https', async () => {
    const result = await agent.run([{ type: 'navigate', value: 'https://example.com' }])
    expect(adapter.exec).toHaveBeenCalledWith('navigate', '', 'https://example.com')
    expect(result.actionsTaken).toContain('navigate https://example.com')
  })

  it('wait does not consume MAX_ACTIONS — skipped, not counted, not executed (fix #33)', async () => {
    // 8 real clicks + 4 waits mixed in → only 8 clicks are executed, wait takes no slot
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

  it('rejects selectors with unsafe characters — prompt injection guard (fix #33)', async () => {
    const badSelectors = [
      '#buy;alert(1)',        // semicolon
      '#buy`;alert(1)//',     // backtick — breaks the template literal of executeJavaScript
      '#buy\nwindow.alert(1)', // newline
    ]
    for (const sel of badSelectors) {
      const result = await agent.run([{ type: 'click', selector: sel }])
      expect(adapter.exec).not.toHaveBeenCalled()
      expect(result.summary).toContain('rejected')
      expect(result.summary).toContain('selector')
    }
  })

  it('rejects over-long selectors (> 200 chars)', async () => {
    const long = '#btn' + 'a'.repeat(250)
    const result = await agent.run([{ type: 'click', selector: long }])
    expect(adapter.exec).not.toHaveBeenCalled()
    expect(result.summary).toContain('rejected')
  })

  it('still executes normally with valid selectors', async () => {
    const result = await agent.run([{ type: 'click', selector: '#buy' }, { type: 'scroll', selector: undefined }])
    expect(adapter.exec).toHaveBeenCalledWith('click', '#buy', undefined)
    expect(adapter.exec).toHaveBeenCalledWith('scroll', '', undefined)
    expect(result.actionsTaken).toHaveLength(2)
  })
})

describe('parseActions', () => {
  it('parses raw LLM reply inside fenced code with trailing prose', () => {
    const text = '```json\n[{"type":"click","selector":"#buy"}]\n```\nDone, remaining: [1,2] items and [3] other tasks.'
    expect(parseActions(text)).toEqual([{ type: 'click', selector: '#buy', value: undefined }])
  })

  it('parses plain JSON array string', () => {
    expect(parseActions('[{"type":"scroll","value":"400"}]')).toEqual([
      { type: 'scroll', selector: undefined, value: '400' },
    ])
  })

  it('returns empty for junk', () => {
    expect(parseActions('Sorry, I do not understand')).toEqual([])
  })

  it('keeps numeric value (scroll/size params) as string — regression from reviewer warning', () => {
    // 🔴 Old regression: `value: typeof obj.value === 'string' ? obj.value : undefined`
    // dropped numeric value (e.g. 800) → adapter fell back to 400px/1000ms even when the LLM asked for something else
    expect(parseActions('[{"type":"scroll","value":800}]')).toEqual([
      { type: 'scroll', selector: undefined, value: '800' },
    ])
    expect(parseActions('[{"type":"type","selector":"#q","value":42}]')).toEqual([
      { type: 'type', selector: '#q', value: '42' },
    ])
  })

  it('filters out wait actions — wait is no longer a valid action (fix #33: the no-op used to consume a MAX_ACTIONS slot)', () => {
    // wait removed from ACTION_TYPES → wait returned by the LLM is filtered during parse, never reaches run()
    expect(parseActions('[{"type":"wait","value":2000}]')).toEqual([])
    expect(parseActions('[{"type":"wait","value":2000},{"type":"click","selector":"#buy"}]')).toEqual([
      { type: 'click', selector: '#buy', value: undefined },
    ])
  })

  it('prefers action array over numeric array appearing earlier in prose — reviewer nit', () => {
    // Nit: old step 3 returned the FIRST parseable array → prose "[1,2]" swallowed the real action
    const text = 'Result: [1,2] items. Steps: [{"type":"click","selector":"#buy","value":800}]'
    expect(parseActions(text)).toEqual([
      { type: 'click', selector: '#buy', value: '800' },
    ])
  })

  it('falls back to first parseable array when no action array found', () => {
    expect(parseActions('Result: [1,2] items')).toEqual([])
  })
})