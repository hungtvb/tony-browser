// AI — lưu cấu hình bằng file JSON đơn giản (tránh dependency ESM như electron-store)
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
    const existing = loadAIConfig()
    const payload = { ...(existing ? { aiConfig: existing } : {}), aiConfig: cfg }
    fs.mkdirSync(path.dirname(p), { recursive: true })
    fs.writeFileSync(p, JSON.stringify(payload, null, 2))
  } catch (e) {
    console.error('Không lưu được config:', e)
  }
}