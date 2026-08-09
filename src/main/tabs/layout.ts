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