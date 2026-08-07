// Save page — bộ sưu tập trang đã lưu (in-memory, JSON serialize)
export interface SavedPage {
  id: string
  url: string
  title: string
  container: string
  savedAt: number
}

export function createCollection() {
  const pages: SavedPage[] = []
  let counter = 0

  function add(url: string, title: string, container = 'default'): SavedPage {
    const p: SavedPage = { id: `saved-${++counter}-${Date.now()}`, url, title, container, savedAt: Date.now() }
    pages.unshift(p)
    return p
  }

  function remove(id: string) {
    const i = pages.findIndex(p => p.id === id)
    if (i >= 0) pages.splice(i, 1)
  }

  function list(): SavedPage[] {
    return [...pages]
  }

  function save(): string {
    return JSON.stringify(pages)
  }

  function load(json: string) {
    try {
      const arr = JSON.parse(json) as SavedPage[]
      pages.length = 0
      pages.push(...arr)
    } catch { /* ignore */ }
  }

  return { add, remove, list, save, load }
}