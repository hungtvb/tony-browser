import { describe, it, expect, beforeEach } from 'vitest'
import { createSmartTab, type GroupedTab } from '../src/main/smarttab/grouping'
import { SmartTabController } from '../src/main/smarttab/controller'
import { createSessionPersist } from '../src/main/save/session-store'
import type { TabSessionInfo } from '../src/shared/types'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

const tabs = [
  { id: 'a', url: 'https://github.com/facebook/react', title: 'facebook/react: The library' },
  { id: 'b', url: 'https://github.com/vercel', title: 'vercel' },
  { id: 'c', url: 'https://docs.google.com/spreadsheets', title: 'Google Sheets - data' },
  { id: 'd', url: 'https://youtube.com/watch?v=abc', title: 'YouTube - video' },
  { id: 'e', url: 'https://mail.google.com/', title: 'Gmail' },
]

function tmpFile(): string {
  return path.join(os.tmpdir(), `smarttab-test-${Date.now()}-${Math.random().toString(36).slice(2)}.json`)
}

describe('SmartTab grouping', () => {
  it('groups by domain', () => {
    const g = createSmartTab()
    const groups: GroupedTab[] = g.groupByDomain(tabs as any[])
    expect(groups.length).toBe(4) // github (a,b), google (c,e), youtube (d)
    const gh = groups.find(x => x.label === 'github.com')!
    expect(gh.tabs.length).toBe(2)
  })

  it('labels groups with theme', () => {
    const g = createSmartTab()
    const groups = g.groupByTheme(tabs as any[])
    // github code tabs + google docs + youtube
    expect(groups.some(x => x.label.toLowerCase().includes('code'))).toBe(true)
  })

  it('round-trips sessions (save/restore)', () => {
    const g = createSmartTab()
    const session = g.saveSession(tabs as any[], 'Buổi sáng')
    expect(session.name).toBe('Buổi sáng')
    expect(session.tabs.length).toBe(5)
    const restored = g.restoreSession(session)
    expect(restored.map(t => t.url)).toEqual(tabs.map(t => t.url))
  })
})

describe('SmartTabController persist', () => {
  let file: string
  let mem: TabSessionInfo[]
  let saved: number
  let persist: { save: (list: TabSessionInfo[]) => void; load: () => TabSessionInfo[] }

  beforeEach(() => {
    file = tmpFile()
    mem = []
    saved = 0
    persist = {
      save: (list) => { saved++; mem = list.map(s => JSON.parse(JSON.stringify(s))) },
      load: () => mem.map(s => JSON.parse(JSON.stringify(s))),
    }
  })

  function tab(url: string, title: string) {
    return { id: url, url, title, loading: false, container: 'default' }
  }

  it('saves session to disk and loads back on restart', () => {
    const c = new SmartTabController(persist)
    c.saveSession([tab('https://github.com', 'GitHub')] as any, 'sáng')
    c.saveSession([tab('https://mail.google.com', 'Gmail'), tab('https://docs.google.com', 'Docs')] as any, 'chiều')
    expect(c.listSessions().length).toBe(2)

    // "restart app" — controller mới với cùng persist
    const c2 = new SmartTabController(persist)
    const loaded = c2.listSessions()
    expect(loaded.length).toBe(2)
    expect(loaded[0].name).toBe('chiều') // mới nhất trước
    expect(loaded.map(s => s.name)).toEqual(['chiều', 'sáng'])
    const gmail = loaded.find(s => s.name === 'chiều')!
    expect(gmail.tabs.map(t => t.url)).toEqual(['https://mail.google.com', 'https://docs.google.com'])
  })

  it('persist.save được gọi mỗi lần saveSession (ghi disk)', () => {
    const c = new SmartTabController(persist)
    expect(saved).toBe(0)
    c.saveSession([tab('https://youtube.com', 'YT')] as any, 'x')
    c.saveSession([tab('https://x.com', 'X')] as any, 'y')
    expect(saved).toBe(2)
  })

  it('cap 10 sessions vẫn giữ khi persist (persist nhận list đã cắt)', () => {
    const c = new SmartTabController(persist)
    for (let i = 0; i < 15; i++) c.saveSession([tab(`https://site${i}.com`, `S${i}`)] as any, `s${i}`)
    expect(c.listSessions().length).toBe(10)
    expect(mem.length).toBe(10) // persist thấy đúng list đã cap
    const c2 = new SmartTabController(persist)
    expect(c2.listSessions().length).toBe(10)
  })

  it('file hỏng (JSON invalid) → load trả [] không crash', () => {
    const badPersist = {
      save: () => {},
      load: () => { throw new Error('JSON.parse: unexpected token') },
    }
    expect(() => new SmartTabController(badPersist)).not.toThrow()
    expect(new SmartTabController(badPersist).listSessions()).toEqual([])
  })

  it('createSessionPersist thật: save ghi file, load đọc lại, file hỏng → []', () => {
    const p = createSessionPersist<TabSessionInfo>(file)
    const list: TabSessionInfo[] = [
      { name: 'a', createdAt: 1, tabs: [{ url: 'https://a.com', title: 'A' }] },
      { name: 'b', createdAt: 2, tabs: [{ url: 'https://b.com', title: 'B' }] },
    ]
    p.save(list)
    expect(fs.existsSync(file)).toBe(true)
    expect(p.load()).toEqual(list)

    fs.writeFileSync(file, '{corrupt json!!!', 'utf-8')
    expect(p.load()).toEqual([])
    fs.rmSync(file, { force: true })
    expect(p.load()).toEqual([]) // file không tồn tại → []
  })
})
