import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createAgentCore, type PageAdapter } from '../src/main/ai/agent'

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

  it('parses valid action JSON and executes', async () => {
    const result = await agent.run(['{"type":"click","selector":"#buy"}'])
    expect(adapter.exec).toHaveBeenCalledWith('click', '#buy', undefined)
    expect(result.summary).toContain('click #buy')
  })

  it('reports when no valid actions found', async () => {
    const result = await agent.run(['not json'])
    expect(result.summary).toContain('Không tìm thấy')
    expect(adapter.exec).not.toHaveBeenCalled()
  })

  it('plans with snapshot', async () => {
    await agent.plan('Mua sản phẩm')
    expect(adapter.snapshot).toHaveBeenCalled()
  })
})