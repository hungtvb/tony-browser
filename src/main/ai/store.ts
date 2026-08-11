// AI — store config in a simple JSON file (avoids ESM-only deps like electron-store)
import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import type { AIConfig } from '../../shared/types'

function configPath(): string {
  return path.join(app.getPath('userData'), 'tony-config.json')
}

export function loadAIConfig(): AIConfig | null {
  try {
    const p = configPath()
    if (!fs.existsSync(p)) return null
    const data = JSON.parse(fs.readFileSync(p, 'utf-8'))
    return (data?.aiConfig ?? null) as AIConfig | null
  } catch {
    return null
  }
}

export function saveAIConfig(cfg: AIConfig): void {
  try {
    const p = configPath()
    let data: Record<string, unknown> = { aiConfig: cfg }
    // Read-modify-write of the WHOLE file: preserve any other top-level fields
    // (metadata, version, future keys) instead of re-emitting only aiConfig.
    try {
      const parsed = JSON.parse(fs.readFileSync(p, 'utf-8'))
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        data = { ...parsed, aiConfig: cfg }
      }
    } catch {
      // No file yet or corrupt JSON — start fresh with just aiConfig.
    }
    fs.mkdirSync(path.dirname(p), { recursive: true })
    // Atomic write: write to .tmp then rename so a crash mid-write never
    // leaves a corrupt/partial config file (rename is atomic on same fs).
    const tmp = `${p}.tmp`
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2))
    fs.renameSync(tmp, p)
  } catch (e) {
    console.error('Could not save config:', e)
  }
}