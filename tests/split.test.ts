import { describe, it, expect } from 'vitest'
import { computeSplitBounds } from '../src/main/tabs/split'

describe('Split View bounds', () => {
  it('splits width evenly for two views', () => {
    const [a, b] = computeSplitBounds(1200, 800, 92)
    expect(a.x).toBe(0)
    expect(a.y).toBe(92)
    expect(a.width).toBe(600)
    expect(b?.x).toBe(600)
    expect(b?.width).toBe(600)
    expect(a.height).toBe(708)
  })

  it('returns single full width when no split', () => {
    const [a] = computeSplitBounds(1200, 800, 92, false)
    expect(a.width).toBe(1200)
  })

  it('handles uneven split ratio', () => {
    const [a, b] = computeSplitBounds(900, 600, 92, true, 0.6)
    expect(a.width).toBe(540)
    expect(b?.x).toBe(540)
  })
})