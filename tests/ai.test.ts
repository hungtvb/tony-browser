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
    await expect(service.ask({ text: 'hi', mode: 'chat' })).rejects.toThrow(/not configured|Missing/)
  })

  it('calls chat/completions and returns content', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'Hello!' } }] }),
    })
    vi.stubGlobal('fetch', fetchMock)

    service.setConfig({ baseUrl: 'https://api.example.com/v1', apiKey: 'secret', model: 'gpt-x' })
    const out = await service.ask({ text: 'hello', mode: 'chat' })

    expect(out).toBe('Hello!')
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer secret' }),
      }),
    )
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.model).toBe('gpt-x')
    expect(body.messages[1].content).toBe('hello')
  })

  it('handles API errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401, text: async () => 'unauthorized' }))
    service.setConfig({ baseUrl: 'https://api.example.com/v1', apiKey: 'bad', model: 'm' })
    await expect(service.ask({ text: 'x', mode: 'chat' })).rejects.toThrow(/401/)
  })

  it('includes page text in summarize mode', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'Summary' } }] }),
    })
    vi.stubGlobal('fetch', fetchMock)
    service.setConfig({ baseUrl: 'https://api.example.com/v1', apiKey: 'k', model: 'm' })
    await service.ask({ text: '', mode: 'summarizePage' }, 'This is the long page content...')
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.messages[1].content).toContain('This is the long page content')
    expect(body.messages[1].content).toContain('PAGE CONTENT')
  })
})