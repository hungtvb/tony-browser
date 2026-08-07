import { describe, it, expect, beforeEach } from 'vitest'
import { createFocusEngine } from '../src/main/focus/engine'

describe('FocusEngine', () => {
  let engine: ReturnType<typeof createFocusEngine>

  beforeEach(() => {
    engine = createFocusEngine({
      blocklist: ['facebook.com', 'youtube.com', 'tiktok.com', 'news.example.com'],
      whitelist: ['work.facebook.com', 'youtube.com/embed'],
    })
  })

  it('starts disabled by default', () => {
    expect(engine.enabled).toBe(false)
  })

  it('enables and blocks distracting sites', () => {
    engine.setEnabled(true)
    expect(engine.enabled).toBe(true)
    expect(engine.check('https://facebook.com')).toMatchObject({ blocked: true, reason: 'focus' })
    expect(engine.check('https://www.youtube.com/watch?v=abc')).toMatchObject({ blocked: true })
    expect(engine.check('https://tiktok.com/@user')).toMatchObject({ blocked: true })
  })

  it('allows non-blocked sites', () => {
    engine.setEnabled(true)
    expect(engine.check('https://github.com')).toMatchObject({ blocked: false })
    expect(engine.check('https://google.com/search?q=work')).toMatchObject({ blocked: false })
  })

  it('respects whitelist overrides', () => {
    engine.setEnabled(true)
    expect(engine.check('https://work.facebook.com/team')).toMatchObject({ blocked: false })
    expect(engine.check('https://youtube.com/embed/xyz')).toMatchObject({ blocked: false })
  })

  it('does not block when disabled', () => {
    engine.setEnabled(false)
    expect(engine.check('https://facebook.com')).toMatchObject({ blocked: false })
  })

  it('supports dynamic blocklist/whitelist updates', () => {
    engine.setEnabled(true)
    engine.setBlocklist(['new-distraction.com'])
    engine.setWhitelist([])
    expect(engine.check('https://new-distraction.com/feed')).toMatchObject({ blocked: true })
    expect(engine.check('https://facebook.com')).toMatchObject({ blocked: false })
  })

  it('normalizes domains and subdomains', () => {
    engine.setEnabled(true)
    expect(engine.check('https://m.facebook.com/profile')).toMatchObject({ blocked: true })
    expect(engine.check('https://youtube.com')).toMatchObject({ blocked: true })
  })
})