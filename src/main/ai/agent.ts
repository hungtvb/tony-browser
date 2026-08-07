// AI — AgentCore: cho AI thao tác trang web qua adapter (Playwright/CDP)
export interface PageAdapter {
  snapshot(): Promise<string>
  exec(action: string, selector: string, value?: string): Promise<{ ok: boolean; error?: string }>
}

export interface AgentResult {
  summary: string
  actionsTaken: string[]
}

const ACTION_TYPES = new Set(['click', 'type', 'scroll', 'navigate', 'wait'])

export function createAgentCore(adapter: PageAdapter) {
  function parseActions(actionsJson: string[]): { type: string; selector?: string; value?: string }[] {
    const parsed: { type: string; selector?: string; value?: string }[] = []
    for (const raw of actionsJson) {
      const json = raw.trim()
      if (!json) continue
      // cho phép JSON nằm trong ``` json ```
      const match = json.match(/```(?:json)?\s*([\s\S]*?)```/)
      const body = match ? match[1] : json
      try {
        const obj = JSON.parse(body)
        const list = Array.isArray(obj) ? obj : [obj]
        for (const a of list) {
          if (a && typeof a.type === 'string' && ACTION_TYPES.has(a.type)) {
            parsed.push({ type: a.type, selector: a.selector, value: a.value })
          }
        }
      } catch {
        // bỏ qua dòng không phải JSON
      }
    }
    return parsed
  }

  async function run(actionsJson: string[]): Promise<AgentResult> {
    const actions = parseActions(actionsJson)
    if (actions.length === 0) {
      return { summary: 'Không tìm thấy thao tác hợp lệ (cần JSON như {"type":"click","selector":"..."})', actionsTaken: [] }
    }
    const taken: string[] = []
    for (const a of actions) {
      if (a.type === 'navigate' && a.value) {
        await adapter.exec('navigate', '', a.value)
        taken.push(`navigate ${a.value}`)
        continue
      }
      if (a.type === 'wait') {
        taken.push('wait')
        continue
      }
      const res = await adapter.exec(a.type, a.selector ?? '', a.value)
      taken.push(`${a.type} ${a.selector ?? ''}`)
      if (!res.ok) {
        return { summary: `Lỗi khi thực hiện ${a.type} ${a.selector}: ${res.error ?? 'không rõ'}`, actionsTaken: taken }
      }
    }
    return { summary: `Đã thực hiện ${taken.length} thao tác: ${taken.join(' → ')}`, actionsTaken: taken }
  }

  async function plan(goal: string): Promise<string> {
    // lấy snapshot để AI "nhìn" trang (lời gọi AI thật nằm ở controller)
    const snap = await adapter.snapshot()
    return snap
  }

  return { run, parseActions, plan }
}