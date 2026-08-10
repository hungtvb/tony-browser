// Focus Mode — persist state to disk (pattern follows ai/store.ts)
import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import type { FocusState } from '../../shared/types'

function focusPath(): string {
  return path.join(app.getPath('userData'), 'focus-config.json')
}

function isValidState(v: unknown): v is FocusState {
  if (!v || typeof v !== 'object') return false
  const s = v as Record<string, unknown>
  return (
    typeof s.enabled === 'boolean' &&
    Array.isArray(s.blocklist) && s.blocklist.every((x) => typeof x === 'string') &&
    Array.isArray(s.whitelist) && s.whitelist.every((x) => typeof x === 'string')
  )
}

export function loadFocusState(): FocusState | null {
  try {
    const p = focusPath()
    if (!fs.existsSync(p)) return null
    const data = JSON.parse(fs.readFileSync(p, 'utf-8'))
    return isValidState(data) ? data : null
  } catch {
    return null
  }
}

export function saveFocusState(state: FocusState): void {
  try {
    const p = focusPath()
    fs.mkdirSync(path.dirname(p), { recursive: true })
    fs.writeFileSync(p, JSON.stringify(state, null, 2))
  } catch (e) {
    console.error('Could not save focus state:', e)
  }
}
