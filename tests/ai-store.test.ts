import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { loadAIConfig, saveAIConfig } from '../src/main/ai/store'
import type { AIConfig } from '../src/shared/types'

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-store-test-'))

vi.mock('electron', () => ({ app: { getPath: () => tmpDir } }))

const cfgPath = () => path.join(tmpDir, 'tony-config.json')

describe('ai/store config', () => {
  const sample: AIConfig = {
    baseUrl: 'https://api.example.com/v1',
    apiKey: 'sk-test-123',
    model: 'gpt-4o-mini',
  }

  beforeAll(() => {
    fs.mkdirSync(tmpDir, { recursive: true })
  })

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('loadAIConfig returns null when no file exists', () => {
    fs.rmSync(cfgPath(), { force: true })
    expect(loadAIConfig()).toBeNull()
  })

  it('loadAIConfig returns null on corrupt JSON without throwing', () => {
    fs.writeFileSync(cfgPath(), '{ not valid json !!!')
    expect(() => loadAIConfig()).not.toThrow()
    expect(loadAIConfig()).toBeNull()
  })

  it('saveAIConfig then loadAIConfig round-trips the config', () => {
    fs.rmSync(cfgPath(), { force: true })
    saveAIConfig(sample)
    expect(loadAIConfig()).toEqual(sample)
  })

  it('saveAIConfig preserves unrelated top-level fields already in the file', () => {
    fs.rmSync(cfgPath(), { force: true })
    fs.writeFileSync(cfgPath(), JSON.stringify({ version: 2, metadata: { owner: 'tony' } }))
    saveAIConfig(sample)
    const data = JSON.parse(fs.readFileSync(cfgPath(), 'utf-8'))
    expect(data.version).toBe(2)
    expect(data.metadata).toEqual({ owner: 'tony' })
    expect(data.aiConfig).toEqual(sample)
    expect(loadAIConfig()).toEqual(sample)
  })

  it('saveAIConfig writes atomically — no leftover .tmp file', () => {
    fs.rmSync(cfgPath(), { force: true })
    saveAIConfig(sample)
    expect(fs.existsSync(cfgPath() + '.tmp')).toBe(false)
  })
})
