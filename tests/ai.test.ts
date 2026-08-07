import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AIService } from '../src/main/ai/service'

describe('AIService', () => {
  let service: AIService

  beforeEach(() => {
    service = new AIService()
    vi.restoreAllMocks()
  })

  it('reports not configured when empty', () => {
    expect(service.configured).toBe(false)
  })

  it('reports configured after setConfig', () => {
    service.setConfig({ baseUrl: 'https://api.example.com/v1', apiKey: 'k', model: 'm' })
    expect(service.configured).toBe(true)
  })

  it('throws when asking without config', async () => {
    await expect(service.ask({ text: 'hi', mode: 'chat' })).rejects.toThrow(/chưa được cấu hình|Thiếu/)
  })

  it('calls chat/completions and returns content', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'Xin chào!' } }] }),
    })
    vi.stubGlobal('fetch', fetchMock)

    service.setConfig({ baseUrl: 'https://api.example.com/v1', apiKey: 'secret', model: 'gpt-x' })
    const out = await service.ask({ text: 'chào', mode: 'chat' })

    expect(out).toBe('Xin chào!')
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer secret' }),
      }),
    )
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.model).toBe('gpt-x')
    expect(body.messages[1].content).toBe('chào')
  })

  it('handles API errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401, text: async () => 'unauthorized' }))
    service.setConfig({ baseUrl: 'https://api.example.com/v1', apiKey: 'bad', model: 'm' })
    await expect(service.ask({ text: 'x', mode: 'chat' })).rejects.toThrow(/401/)
  })

  it('includes page text in summarize mode', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'Tóm tắt' } }] }),
    })
    vi.stubGlobal('fetch', fetchMock)
    service.setConfig({ baseUrl: 'https://api.example.com/v1', apiKey: 'k', model: 'm' })
    await service.ask({ text: '', mode: 'summarizePage' }, 'Đây là nội dung trang dài...')
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.messages[1].content).toContain('Đây là nội dung trang')
    expect(body.messages[1].content).toContain('NỘI DUNG TRANG')
  })
})