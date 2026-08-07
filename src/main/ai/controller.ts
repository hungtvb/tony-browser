// AI — Controller: phối hợp reader + service + store + agent, expose qua IPC
import type { IpcDeps } from '../ipc'
import { AIService } from './service'
import { extractPageText, extractPageMeta } from './reader'
import { loadAIConfig, saveAIConfig } from './store'
import { createAgentCore } from './agent'
import { createWebContentsAdapter } from './agent-adapter'
import type { AIConfig, AIRequestParams, AIStatus } from '../../shared/types'

export class AIController {
  private service = new AIService()

  constructor(private deps: IpcDeps) {
    const cfg = loadAIConfig()
    if (cfg) this.service.setConfig(cfg)
  }

  getConfig(): AIConfig | null {
    return this.service.getConfig()
  }

  saveConfig(cfg: AIConfig): boolean {
    this.service.setConfig(cfg)
    saveAIConfig(cfg)
    return true
  }

  status(): AIStatus {
    return { configured: this.service.configured, busy: this.service.busy }
  }

  async ask(params: AIRequestParams): Promise<string> {
    const tabId = params.tabId
    const view = tabId ? this.deps.getActiveView(tabId) : undefined
    const wc = view?.webContents

    // ─── AI Actions: thao tác trang thật ───
    if (params.mode === 'act') {
      if (!wc) throw new Error('Không có tab hoạt động để thao tác')
      const adapter = createWebContentsAdapter(() => wc)
      const agent = createAgentCore(adapter)
      // snapshot trang để AI "nhìn"
      const snap = await adapter.snapshot()
      const goal = params.text || ''
      // dùng LLM để quyết định hành động từ snapshot
      const planText = await this.service.ask(
        { mode: 'chat', text: `Bạn là AI điều khiển trình duyệt. Trang hiện tại:\n${snap}\n\nNhiệm vụ: ${goal}\nHãy trả về JSON array các hành động: [{"type":"click","selector":"#id"},{"type":"type","selector":"#id","value":"..."},{"type":"scroll","value":400}]. Chỉ dùng selector có trong trang.` },
        undefined,
      )
      // parse JSON từ LLM response
      const actions = this.extractJsonArray(planText)
      if (actions.length === 0) return `Không xác định được hành động. AI trả: ${planText.slice(0, 300)}`
      const result = await agent.run(actions.map(a => JSON.stringify(a)))
      return result.summary
    }

    let pageText: string | undefined

    if (params.mode === 'summarizePage' && wc) {
      const [text, meta] = await Promise.all([
        extractPageText(wc),
        extractPageMeta(wc),
      ])
      pageText = `Title: ${meta.title}\nURL: ${meta.url}\n\n${text}`
    }

    if (params.mode === 'summarizeAll') {
      const tm = this.deps.getTabManager()
      const parts: string[] = []
      for (const tab of tm.list()) {
        const v = this.deps.getActiveView(tab.id)
        if (!v) continue
        const [text, meta] = await Promise.all([
          extractPageText(v.webContents, 8000),
          extractPageMeta(v.webContents),
        ])
        parts.push(`### ${meta.title || tab.title} (${meta.url})\n${text.slice(0, 8000)}`)
      }
      pageText = parts.join('\n\n')
    }

    return this.service.ask(params, pageText)
  }

  /** Trích JSON array từ chuỗi LLM trả về (có thể bọc trong code block) */
  private extractJsonArray(text: string): any[] {
    const match = text.match(/\[[\s\S]*\]/)
    if (!match) return []
    try {
      const arr = JSON.parse(match[0])
      return Array.isArray(arr) ? arr : []
    } catch {
      return []
    }
  }
}