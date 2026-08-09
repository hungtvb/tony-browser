// AI — AgentCore: cho AI thao tác trang web qua adapter (Playwright/CDP)
export interface PageAdapter {
  snapshot(): Promise<string>
  exec(action: string, selector: string, value?: string): Promise<{ ok: boolean; error?: string }>
}

export interface AgentResult {
  summary: string
  actionsTaken: string[]
}

export type ParsedAction = { type: string; selector?: string; value?: string }

const ACTION_TYPES = new Set(['click', 'type', 'scroll', 'navigate', 'wait'])

/** Giới hạn số action AI được thực hiện trong 1 lần run — chặn prompt injection bắt AI loop/hành động dài */
export const MAX_ACTIONS = 8

/** Tách JSON array từ chuỗi LLM trả về — xử lý code fence ```json + prose xung quanh */
export function extractJsonArray(text: string): unknown[] {
  // 1. Bóc phần nằm trong ```json ... ``` nếu có
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const body = (fence ? fence[1] : text).trim()
  // 2. Thử parse nguyên văn (trường hợp JSON thuần, không fence)
  try {
    const v = JSON.parse(body)
    if (Array.isArray(v)) return v
  } catch {
    // rơi xuống bước 3
  }
  // 3. Dò từng cặp [ ... ] tìm array parse được (xử lý prose ở xung quanh).
  //    Ưu tiên array chứa object có `type` hợp lệ -> tránh bắt nhầm array số
  //    (VD prose: "Kết quả: [1,2]" trước array action thật).
  const candidates: unknown[][] = []
  for (let i = 0; i < body.length; i++) {
    if (body[i] !== '[') continue
    for (let j = body.length - 1; j > i; j--) {
      if (body[j] !== ']') continue
      try {
        const v = JSON.parse(body.slice(i, j + 1))
        if (Array.isArray(v)) {
          candidates.push(v)
          if (v.some((x) => x && typeof (x as Record<string, unknown>).type === 'string')) {
            return v
          }
        }
      } catch {
        // đoạn này không phải array hợp lệ, thử đoạn tiếp
      }
    }
  }
  // không tìm thấy array chứa action -> trả array parse được đầu tiên (nếu có)
  return candidates[0] ?? []
}

/** Chuyển chuỗi LLM trả về (hoặc mảng chuỗi JSON) thành danh sách action hợp lệ */
export function parseActions(input: string | string[]): ParsedAction[] {
  const chunks = Array.isArray(input) ? input : [input]
  const parsed: ParsedAction[] = []
  for (const raw of chunks) {
    const list = extractJsonArray(raw)
    for (const a of list) {
      const obj = a as Record<string, unknown>
      if (obj && typeof obj.type === 'string' && ACTION_TYPES.has(obj.type)) {
        parsed.push({
          type: obj.type,
          selector: typeof obj.selector === 'string' ? obj.selector : undefined,
          value: obj.value == null ? undefined : String(obj.value),
        })
      }
    }
  }
  return parsed
}

export function createAgentCore(adapter: PageAdapter) {
  async function run(actions: ParsedAction[]): Promise<AgentResult> {
    if (actions.length === 0) {
      return { summary: 'Không tìm thấy thao tác hợp lệ (cần JSON như {"type":"click","selector":"..."})', actionsTaken: [] }
    }
    const taken: string[] = []
    for (const a of actions) {
      if (taken.length >= MAX_ACTIONS) {
        return { summary: `Đã thực hiện ${taken.length} thao tác (dừng ở MAX_ACTIONS=${MAX_ACTIONS}): ${taken.join(' → ')}`, actionsTaken: taken }
      }
      if (a.type === 'navigate' && a.value) {
        if (!/^https?:\/\//.test(a.value)) {
          return { summary: `navigate bị từ chối: chỉ cho phép http/https (nhận '${a.value}')`, actionsTaken: taken }
        }
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