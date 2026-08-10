// AI — AgentCore: lets the AI operate the web page through an adapter (Playwright/CDP)
export interface PageAdapter {
  snapshot(): Promise<string>
  exec(action: string, selector: string, value?: string): Promise<{ ok: boolean; error?: string }>
}

export interface AgentResult {
  summary: string
  actionsTaken: string[]
}

export type ParsedAction = { type: string; selector?: string; value?: string }

// 'wait' was removed from ACTION_TYPES (fix #33): the old no-op branch only did
// `taken.push('wait')` without exec — dead code that wasted a MAX_ACTIONS slot. The adapter
// still keeps the 'wait' case (defensive for direct calls).
const ACTION_TYPES = new Set(['click', 'type', 'scroll', 'navigate'])

/** Limit the number of actions the AI can take in one run — blocks prompt injection that makes the AI loop or act for too long */
export const MAX_ACTIONS = 8

/** Extract a JSON array from the LLM response string — handles ```json code fences + surrounding prose */
export function extractJsonArray(text: string): unknown[] {
  // 1. Strip the part inside ```json ... ``` if present
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const body = (fence ? fence[1] : text).trim()
  // 2. Try parsing the whole string (plain JSON, no fence)
  try {
    const v = JSON.parse(body)
    if (Array.isArray(v)) return v
  } catch {
    // fall through to step 3
  }
  // 3. Scan each [ ... ] pair for a parseable array (handles surrounding prose).
  //    Prefer an array containing an object with a valid type -> avoid matching a number array
  //    (e.g. prose "Result: [1,2]" before the real action array).
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
        // this chunk is not a valid array, try the next one
      }
    }
  }
  // no action array found -> return the first parseable array (if any)
  return candidates[0] ?? []
}

/** Convert the LLM response string (or array of JSON strings) into a list of valid actions */
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
  // Guard the selector before interpolating it into executeJavaScript — blocks prompt injection
  // (a malicious page steering the LLM to return a selector containing a payload). Same style as
  // the rejected navigate branch: return a clear summary, do not exec.
  function isSafeSelector(sel: string): boolean {
    return sel.length <= 200 && !/[;`\n]/.test(sel)
  }

  async function run(actions: ParsedAction[]): Promise<AgentResult> {
    if (actions.length === 0) {
      return { summary: 'Could not determine the action (need JSON like {"type":"click","selector":"..."})', actionsTaken: [] }
    }
    const taken: string[] = []
    for (const a of actions) {
      // wait is no longer a valid action — skip without counting or exec (does not consume MAX_ACTIONS)
      if (a.type === 'wait') continue
      if (taken.length >= MAX_ACTIONS) {
        return { summary: `Executed ${taken.length} actions (stopped at MAX_ACTIONS=${MAX_ACTIONS}): ${taken.join(' → ')}`, actionsTaken: taken }
      }
      if (a.type === 'navigate' && a.value) {
        if (!/^https?:\/\//.test(a.value)) {
          return { summary: `navigate rejected: only http/https allowed (got '${a.value}')`, actionsTaken: taken }
        }
        await adapter.exec('navigate', '', a.value)
        taken.push(`navigate ${a.value}`)
        continue
      }
      const sel = a.selector ?? ''
      if (sel && !isSafeSelector(sel)) {
        return { summary: `${a.type} rejected: selector contains unsafe characters (; backtick or newline) or is longer than 200 chars (got '${sel.slice(0, 80)}')`, actionsTaken: taken }
      }
      const res = await adapter.exec(a.type, sel, a.value)
      taken.push(`${a.type} ${sel}`)
      if (!res.ok) {
        return { summary: `Error executing ${a.type} ${sel}: ${res.error ?? 'unknown'}`, actionsTaken: taken }
      }
    }
    return { summary: `Executed ${taken.length} actions: ${taken.join(' → ')}`, actionsTaken: taken }
  }

// plan() was removed (fix #61): dead API — it only returned adapter.snapshot(), never used
  // goal, never called the LLM, and nothing in production called it. Snapshots are still taken
  // directly via adapter.snapshot() when needed.

  return { run, parseActions }
}
