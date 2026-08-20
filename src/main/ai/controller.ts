// AI — Controller: coordinates reader + service + store + agent, exposes via IPC
import type { IpcDeps } from '../ipc'
import { AIService } from './service'
import { extractPageText, extractPageMeta } from './reader'
import { loadAIConfig, saveAIConfig } from './store'
import { createAgentCore, parseActions } from './agent'
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

    // ─── AI Actions: real page actions ───
    if (params.mode === 'act') {
      if (!wc) throw new Error('No active tab to act on')
      const adapter = createWebContentsAdapter(() => wc)
      const agent = createAgentCore(adapter)
      // snapshot the page so the AI can "see"
      const snap = await adapter.snapshot()
      const goal = params.text || ''
      // use the LLM to decide actions from the snapshot
      const planText = await this.service.ask(
        { mode: 'chat', text: `You are an AI that controls the browser. Current page:\n${snap}\n\nTask: ${goal}\nReturn a JSON array of actions: [{"type":"click","selector":"#id"},{"type":"type","selector":"#id","value":"..."},{"type":"scroll","value":400}]. Only use selectors present in the page.` },
        undefined,
      )
      // parse JSON from the LLM response (handle code fences + surrounding prose)
      const actions = parseActions(planText)
      if (actions.length === 0) return `No actions could be determined. AI returned: ${planText.slice(0, 300)}`
      const result = await agent.run(actions)
      return result.summary
    }

    let pageText: string | undefined

    if (params.mode === 'summarizePage' || params.mode === 'explain' || params.mode === 'translate') {
      if (!wc) throw new Error(`No active tab to ${params.mode === 'summarizePage' ? 'summarize' : 'read'} — open a page first`)
      const [text, meta] = await Promise.all([
        extractPageText(wc),
        extractPageMeta(wc),
      ])
      pageText = `Title: ${meta.title}\nURL: ${meta.url}\n\n${text}`
    }

    if (params.mode === 'summarizeAll') {
      const tm = this.deps.getTabManager()
      const tabs = tm.list().slice(0, 10) // cap 10 tabs/run — avoid a parallel explosion
      const results = await Promise.allSettled(
        tabs.map(async (tab) => {
          const v = this.deps.getActiveView(tab.id)
          if (!v) return null
          const [text, meta] = await Promise.all([
            extractPageText(v.webContents, 8000),
            extractPageMeta(v.webContents),
          ])
          return `### ${meta.title || tab.title} (${meta.url})\n${text.slice(0, 8000)}`
        }),
      )
      // allSettled keeps input order → merge by index, drop rejected (log one line per failed tab)
      const parts: string[] = []
      results.forEach((r, i) => {
        if (r.status === 'fulfilled' && r.value) {
          parts.push(r.value)
        } else if (r.status === 'rejected') {
          console.warn(`summarizeAll: skipping failed tab "${tabs[i]?.title ?? tabs[i]?.id ?? i}"`, r.reason)
        }
      })
      pageText = parts.join('\n\n')
    }

    return this.service.ask(params, pageText)
  }
}