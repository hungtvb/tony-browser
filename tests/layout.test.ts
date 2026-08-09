import { describe, it, expect } from 'vitest'
import { layoutBounds, computeLayoutBounds, planLayout } from '../src/main/tabs/layout'

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
    const full = computeLayoutBounds(['a'], 1000, 700, 92)
    expect(full).toHaveLength(1)
    expect(full[0].width).toBe(1000)
    const split = computeLayoutBounds(['a', 'b'], 1000, 700, 92)
    expect(split).toHaveLength(2)
    expect(split[0].width + split[1].width).toBe(1000)
  })
})

describe('planLayout — gán bounds theo danh sách hiển thị, không theo index tm.list()', () => {
  const W = 1200
  const H = 800
  const TB = 92
  const FULL = { x: 0, y: 92, width: 1200, height: 708 }

  it('full: active tab KHÔNG phải tab đầu danh sách vẫn nhận bounds full', () => {
    // tabs mở theo thứ tự [a, b, c], active = c (index 2) — bug cũ gán bounds[2] = undefined
    const plan = planLayout(['a', 'b', 'c'], [], 'c', W, H, TB)
    const c = plan.find(p => p.id === 'c')!
    expect(c.visible).toBe(true)
    expect(c.bounds).toEqual(FULL)
    expect(plan.find(p => p.id === 'a')!.visible).toBe(false)
    expect(plan.find(p => p.id === 'b')!.visible).toBe(false)
  })

  it('split: 2 tab split KHÔNG nằm ở 2 vị trí đầu vẫn nhận bounds trái/phải đúng', () => {
    // split a + c (b ở giữa) — bug cũ: c ở index 2 không có bounds
    const plan = planLayout(['a', 'b', 'c'], ['a', 'c'], 'a', W, H, TB)
    const a = plan.find(p => p.id === 'a')!
    const c = plan.find(p => p.id === 'c')!
    expect(a.visible).toBe(true)
    expect(c.visible).toBe(true)
    expect(a.bounds).toEqual({ x: 0, y: 92, width: 600, height: 708 })
    expect(c.bounds).toEqual({ x: 600, y: 92, width: 600, height: 708 })
    expect(plan.find(p => p.id === 'b')!.visible).toBe(false)
  })

  it('split: đóng 1 tab split (id chết trong splitIds) → coi như full, active nhận bounds full', () => {
    // splitIds còn id đã đóng ('a') + id sống ('b') → splitIds.length >= 2 nhưng 'a' không còn tồn tại
    const plan = planLayout(['b'], ['a', 'b'], 'b', W, H, TB)
    expect(plan).toHaveLength(1)
    expect(plan[0].visible).toBe(true)
    expect(plan[0].bounds).toEqual(FULL)
  })

  it('split: tổng width 2 view = width cửa sổ', () => {
    const plan = planLayout(['a', 'b'], ['a', 'b'], 'a', W, H, TB)
    const [a, b] = plan
    expect(a.bounds.width + b.bounds.width).toBe(W)
  })
})