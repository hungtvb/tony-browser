import { describe, it, expect } from 'vitest'
import { layoutBounds, computeLayoutBounds } from '../src/main/tabs/layout'

describe('Window resize layout', () => {
  it('full-width single view khi không split', () => {
    const [v] = layoutBounds(1, 1200, 800, 92)
    expect(v).toEqual({ x: 0, y: 92, width: 1200, height: 708 })
  })

  it('split 2 view: tổng width = width cửa sổ, không âm', () => {
    const [a, b] = layoutBounds(2, 1920, 1080, 92)
    expect(a.width + (b?.width ?? 0)).toBe(1920)
    expect(a.height).toBe(988)
    expect(b?.y).toBe(92)
    expect(a.width).toBeGreaterThan(0)
    expect(b!.width).toBeGreaterThan(0)
  })

  it('kích thước nhỏ 800x600 vẫn không âm', () => {
    const [a, b] = layoutBounds(2, 800, 600, 92)
    expect(a.width).toBeGreaterThan(0)
    expect(b!.width).toBeGreaterThan(0)
    expect(a.height).toBeGreaterThan(0)
    expect(b!.height).toBeGreaterThan(0)
    expect(a.height).toBe(508)
  })

  it('content height = 0 khi cửa sổ nhỏ hơn toolbar -> không âm', () => {
    const [a] = layoutBounds(1, 400, 50, 92)
    expect(a.height).toBe(0)
    expect(a.width).toBe(400)
  })

  it('computeLayoutBounds: splitIds có 2 id → 2 bounds; 1 id → 1 bounds', () => {
    const ids: string[] = []
    const full = computeLayoutBounds(['a'], 1000, 700, 92)
    expect(full).toHaveLength(1)
    expect(full[0].width).toBe(1000)
    ids.push('a', 'b')
    void ids
    const split = computeLayoutBounds(['a', 'b'], 1000, 700, 92)
    expect(split).toHaveLength(2)
    expect(split[0].width + split[1].width).toBe(1000)
  })
})