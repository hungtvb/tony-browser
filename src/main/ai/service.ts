// AI — Service: gọi LLM API (OpenAI-compatible) để trả lời/tóm tắt
import type { AIConfig, AIRequestParams } from '../../shared/types'

export class AIService {
  private config: AIConfig | null = null
  private _busy = false

  setConfig(cfg: AIConfig) {
    this.config = cfg
  }

  getConfig(): AIConfig | null {
    return this.config
  }

  get configured() {
    return !!this.config?.baseUrl && !!this.config?.apiKey && !!this.config?.model
  }

  get busy() {
    return this._busy
  }

  /** Gọi LLM chat completions, trả text cuối */
  async ask(params: AIRequestParams, pageText?: string): Promise<string> {
    const cfg = this.config
    if (!cfg) throw new Error('AI chưa được cấu hình')
    if (!this.configured) throw new Error('Thiếu baseUrl/apiKey/model')

    this._busy = true
    try {
      const system = this.systemPrompt()
      const user = this.buildUserMessage(params, pageText)
      const body = {
        model: cfg.model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: 0.3,
      }

      const endpoint = cfg.baseUrl.replace(/\/+$/, '') + '/chat/completions'
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cfg.apiKey}`,
        },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const errText = (await res.text()).slice(0, 200)
        throw new Error(`LLM API lỗi ${res.status}: ${errText}`)
      }

      const data = (await res.json()) as any
      const content: string = data?.choices?.[0]?.message?.content ?? ''
      return content.trim()
    } finally {
      this._busy = false
    }
  }

  private systemPrompt(): string {
    return `Bạn là Kenzo, trợ lý AI trong "Tony Browser". Trả lời ngắn gọn, súc tích, đúng trọng tâm.
Khi được yêu cầu tóm tắt trang web, hãy đưa ra bản tóm tắt mạch lạc bằng tiếng Việt (hoặc ngôn ngữ người dùng dùng), nếu trang là tiếng Anh thì tóm tắt bằng tiếng Việt có giữ nguyên thuật ngữ chuyên môn quan trọng. Không bịa thông tin không có trong nội dung cung cấp.`
  }

  private buildUserMessage(params: AIRequestParams, pageText?: string): string {
    const { mode, text } = params
    if (mode === 'summarizePage') {
      return `Tóm tắt trang web sau (title/url và nội dung):
—— NỘI DUNG TRANG ——
${pageText || '(không đọc được nội dung)'}
—— HẾT ——
Yêu cầu: đưa tóm tắt rõ ràng (3-6 gạch đầu dòng) bằng tiếng Việt.`
    }
    if (mode === 'summarizeAll') {
      return `Đây là nội dung nhiều tab đang mở trong trình duyệt. Tổng hợp thành 1 báo cáo gọn theo từng tab, bằng tiếng Việt:
${pageText || '(không có nội dung)'}`
    }
    // chat mode
    return pageText
      ? `Người dùng hỏi: """${text}"""

Dưới đây là nội dung trang hiện tại (có thể liên quan câu hỏi):
"""
${pageText}
"""

Trả lời giúp người dùng.`
      : text
  }
}