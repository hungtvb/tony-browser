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

// 'wait' đã bị loại khỏi ACTION_TYPES (fix #33): nhánh no-op cũ chỉ `taken.push('wait')` mà không
// exec — dead code ngốn 1 slot MAX_ACTIONS. Adapter vẫn giữ case 'wait' (defensive cho lời gọi trực tiếp).
const ACTION_TYPES = new Set(['click', 'type', 'scroll', 'navigate'])

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
  // Guard selector trước khi nội suy vào executeJavaScript — chặn prompt injection
  // (trang độc hại điều khiển LLM trả selector chứa payload). Cùng phong cách nhánh
  // navigate bị từ chối: trả summary rõ ràng, không exec.
  function isSafeSelector(sel: string): boolean {
    return sel.length <= 200 && !/[;`\n]/.test(sel)
  }

  async function run(actions: ParsedAction[]): Promise<AgentResult> {
    if (actions.length === 0) {
      return { summary: 'Không tìm thấy thao tác hợp lệ (cần JSON như {"type":"click","selector":"..."})', actionsTaken: [] }
    }
    const taken: string[] = []
    for (const a of actions) {
      // wait không còn là action hợp lệ — skip không count, không exec (không ngốn MAX_ACTIONS)
      if (a.type === 'wait') continue
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
      const sel = a.selector ?? ''
      if (sel && !isSafeSelector(sel)) {
        return { summary: `${a.type} bị từ chối: selector chứa ký tự không an toàn (; backtick hoặc xuống dòng) hoặc dài > 200 (nhận '${sel.slice(0, 80)}')`, actionsTaken: taken }
      }
      const res = await adapter.exec(a.type, sel, a.value)
      taken.push(`${a.type} ${sel}`)
      if (!res.ok) {
        return { summary: `Lỗi khi thực hiện ${a.type} ${sel}: ${res.error ?? 'không rõ'}`, actionsTaken: taken }
      }
    }
    return { summary: `Đã thực hiện ${taken.length} thao tác: ${taken.join(' → ')}`, actionsTaken: taken }
  }

  // plan() đã bị xóa (fix #61): API chết — chỉ trả adapter.snapshot(), không dùng goal, không gọi LLM,
  // production không ai gọi. Snapshot vẫn lấy trực tiếp qua adapter.snapshot() khi cần.

  return { run, parseActions }
}