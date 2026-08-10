// Session restore — mở lại toàn bộ tab đã lưu (bỏ magic number slice(0,10))
export interface RestorableTab {
  url: string
  title?: string
  container?: string
  favicon?: string
}

/**
 * Mở lại tất cả tab đã lưu trong session, theo đúng thứ tự lưu.
 * @param saved    danh sách tab đọc từ disk (session.json)
 * @param onOpen   callback mở 1 tab — để index.ts nối vào TabManager + tạo view
 * @returns số tab đã mở
 */
export function openRestoredTabs(saved: RestorableTab[], onOpen: (tab: RestorableTab) => void): number {
  if (!saved.length) return 0
  for (const s of saved) {
    onOpen(s)
  }
  return saved.length
}