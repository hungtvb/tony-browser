// Layout chung cho WebContentsView — tính bounds theo kích thước cửa sổ hiện tại
// Dùng cho cả resize, split, mở/đóng tab. Tránh setBounds thủ công rải rác.
import { computeSplitBounds, type Bounds } from './split'

/** Số view đang hiển thị: 1 (full) hoặc 2 (split) */
export function layoutBounds(
  viewCount: 1 | 2,
  winWidth: number,
  winHeight: number,
  toolbarHeight = 92,
): [Bounds, Bounds?] {
  if (viewCount === 2) return computeSplitBounds(winWidth, winHeight, toolbarHeight, true)
  return computeSplitBounds(winWidth, winHeight, toolbarHeight, false)
}

/**
 * Tính bounds cho danh sách view theo trạng thái split hiện tại.
 * splitIds: danh sách id tab đang split (độ dài 2 → split; 1 → full).
 * Trả về mảng bounds cùng độ dài với số view hiển thị.
 */
export function computeLayoutBounds(
  splitIds: string[],
  winWidth: number,
  winHeight: number,
  toolbarHeight = 92,
): Bounds[] {
  const [a, b] = layoutBounds(splitIds.length >= 2 ? 2 : 1, winWidth, winHeight, toolbarHeight)
  return b ? [a, b] : [a]
}

/**
 * Lập kế hoạch layout cho TẤT CẢ tab: tab nào hiển thị, bounds ra sao, tab nào ẩn.
 * Bounds gán theo vị trí trong DANH SÁCH HIỂN THỊ (full → [activeId], split → splitIds),
 * KHÔNG theo index của tab trong tm.list() — tránh lỗi gán nhầm bounds khi active
 * tab không phải tab đầu danh sách (bug #14 còn sót).
 */
export function planLayout(
  tabIds: string[],
  splitIds: string[],
  activeId: string,
  winWidth: number,
  winHeight: number,
  toolbarHeight = 92,
): { id: string; bounds: Bounds; visible: boolean }[] {
  // split chỉ khi đủ 2 id còn tồn tại trong tabIds — nếu 1 id đã chết (đóng tab giữa chừng) thì coi là full
  const split = splitIds.length >= 2 && splitIds.every(id => tabIds.includes(id))
  const showIds = split ? splitIds : [activeId]
  const bounds = computeLayoutBounds(showIds, winWidth, winHeight, toolbarHeight)
  return tabIds.map(id => {
    const idx = showIds.indexOf(id)
    const visible = idx >= 0
    return {
      id,
      bounds: visible ? bounds[idx] : bounds[0],
      visible,
    }
  })
}