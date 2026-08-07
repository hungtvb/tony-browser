// AI — Controller: phối hợp reader + service + store, expose qua IPC
import type { IpcDeps } from '../ipc'
import { AIService } from './service'
import { extractPageText, extractPageMeta } from './reader'
import { loadAIConfig, saveAIConfig } from './store'
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

    let pageText: string | undefined

    if (params.mode === 'summarizePage' && wc) {
      const [text, meta] = await Promise.all([
        extractPageText(wc),
        extractPageMeta(wc),
      ])
      pageText = `Title: ${meta.title}\nURL: ${meta.url}\n\n${text}`
    }

    if (params.mode === 'summarizeAll') {
      // Gom nội dung tất cả tab
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
}
