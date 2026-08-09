// Split View — tính bounds chia màn hình cho 2 tab song song
export interface Bounds { x: number; y: number; width: number; height: number }

export function computeSplitBounds(
  viewWidth: number,
  viewHeight: number,
  toolbarHeight = 92,
  split = true,
  ratio = 0.5,
): [Bounds, Bounds?] {
  const contentW = viewWidth
  const contentH = Math.max(viewHeight - toolbarHeight, 0)
  if (!split) {
    return [{ x: 0, y: toolbarHeight, width: contentW, height: contentH }]
  }
  const w1 = Math.round(contentW * ratio)
  const w2 = contentW - w1
  return [
    { x: 0, y: toolbarHeight, width: w1, height: contentH },
    { x: w1, y: toolbarHeight, width: w2, height: contentH },
  ]
}