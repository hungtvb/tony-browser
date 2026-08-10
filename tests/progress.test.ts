// Issue #43 — progress bar state machine: loading → 90% → done → 100% + fade.
import { describe, it, expect } from 'vitest'
import { nextPhase, phaseStyle, PROGRESS_LOADING_WIDTH } from '../src/renderer/progress'

describe('nextPhase — progress bar state machine', () => {
  it('isLoading true → loading phase (from any phase)', () => {
    expect(nextPhase('idle', true)).toBe('loading')
    expect(nextPhase('done', true)).toBe('loading')
  })

  it('idle + not loading → stays idle', () => {
    expect(nextPhase('idle', false)).toBe('idle')
  })

  it('loading + not loading → done (snap to 100%)', () => {
    expect(nextPhase('loading', false)).toBe('done')
  })

  it('done + not loading → back to idle (after fade)', () => {
    expect(nextPhase('done', false)).toBe('idle')
  })
})

describe('phaseStyle — width/opacity per phase', () => {
  it('loading → 90% width, fully visible', () => {
    expect(phaseStyle('loading')).toEqual({ width: `${PROGRESS_LOADING_WIDTH}%`, opacity: 1 })
  })

  it('done → 100% width, faded out', () => {
    expect(phaseStyle('done')).toEqual({ width: '100%', opacity: 0 })
  })

  it('idle → hidden 0%', () => {
    expect(phaseStyle('idle')).toEqual({ width: '0%', opacity: 0 })
  })
})
