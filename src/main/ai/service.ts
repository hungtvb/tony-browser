// AI — Service: calls the LLM API (OpenAI-compatible) to answer/summarize
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

  /** Call the LLM chat completions endpoint, return the final text */
  async ask(params: AIRequestParams, pageText?: string): Promise<string> {
    const cfg = this.config
    if (!cfg) throw new Error('AI is not configured')
    if (!this.configured) throw new Error('Missing baseUrl/apiKey/model')

    // act-mode needs longer to wait for the LLM plan → 120s; chat/summarize 30s
    const timeoutMs = params.mode === 'act' ? 120_000 : 30_000
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), timeoutMs)

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
        signal: ctrl.signal,
      })

      if (!res.ok) {
        const errText = (await res.text()).slice(0, 200)
        throw new Error(`LLM API error ${res.status}: ${errText}`)
      }

      const data = (await res.json()) as any
      const content: string = data?.choices?.[0]?.message?.content ?? ''
      return content.trim()
    } catch (e) {
      // abort due to timeout → clear error instead of "This operation was aborted"
      if (ctrl.signal.aborted) {
        throw new Error(`LLM API timed out after ${timeoutMs / 1000}s`)
      }
      throw e
    } finally {
      clearTimeout(timer)
      this._busy = false
    }
  }

  private systemPrompt(): string {
    return `You are Kenzo, the AI assistant inside "Tony Browser". Answer concisely, precisely and to the point.
When asked to summarize a webpage, give a coherent summary in Vietnamese (or the language the user is using); if the page is in English, summarize in Vietnamese while keeping important technical terms. Do not invent information that is not in the provided content.`
  }

  private buildUserMessage(params: AIRequestParams, pageText?: string): string {
    const { mode, text } = params
    // Issue #127 — page-context quick actions: explain / translate / fix grammar / summarizeSelection
    if (mode === 'explain') {
      return `Explain the following webpage content in simple terms. Provide a clear explanation (3-5 bullet points) in Vietnamese (or the language the user is using), keeping important technical terms:\n—— PAGE CONTENT ——\n${pageText || '(could not read the content)'}\n—— END ——`
    }
    if (mode === 'translate') {
      return `Translate the following content into Vietnamese (natural, fluent Vietnamese; keep technical terms where appropriate):\n—— CONTENT ——\n${pageText || '(could not read the content)'}\n—— END ——`
    }
    if (mode === 'fixGrammar') {
      return `Fix the grammar, spelling and punctuation of the following text. Return ONLY the corrected copy, without explanations or notes:\n—— TEXT ——\n${text || pageText || ''}\n—— END ——`
    }
    if (mode === 'summarizeSelection') {
      const selection = text || pageText || '(no content)'
      return `Summarize the following selected text concisely (3-5 bullet points) in Vietnamese:\n—— SELECTED TEXT ——\n${selection}\n—— END ——`
    }
    if (mode === 'summarizePage') {
      return `Summarize the following webpage (title/url and content):
—— PAGE CONTENT ——
${pageText || '(could not read the content)'}
—— END ——
Requirement: provide a clear summary (3-6 bullet points) in Vietnamese.`
    }
    if (mode === 'summarizeAll') {
      return `Here is the content of several open tabs in the browser. Combine it into a compact per-tab report, in Vietnamese:
${pageText || '(no content)'}`
    }
    // chat mode
    return pageText
      ? `The user asks: """${text}"""

Below is the current page content (may be relevant to the question):

"""
${pageText}
"""

Please help the user.`
      : text
  }
}
