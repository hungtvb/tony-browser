import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createCollection } from '../src/main/save/collection'

// Shared fake IPC handler registry (same pattern as nav-controls.test.ts)
const handlers = vi.hoisted(() => new Map<string, (...args: any[]) => any>())

vi.mock('electron', () => ({
  ipcMain: { handle: (ch: string, fn: (...a: any[]) => any) => { handlers.set(ch, fn) } },
  BrowserWindow: class {},
  WebContentsView: class { webContents: any },
  session: { defaultSession: {}, fromPartition: () => ({}) },
  app: { getPath: () => '/tmp/kenzo-collection-test' },
}))

describe('Save page collection', () => {
  let col: ReturnType<typeof createCollection>

  beforeEach(() => { col = createCollection() })

  it('adds a page', () => {
    const p = col.add('https://example.com', 'Example', 'default')
    expect(p.id).toBeDefined()
    expect(col.list()).toHaveLength(1)
  })

  it('removes a page', () => {
    const p = col.add('https://a.com', 'A', 'default')
    col.remove(p.id)
    expect(col.list()).toHaveLength(0)
  })

  it('persists via save/load round-trip', () => {
    col.add('https://b.com', 'B', 'work')
    const saved = col.save()
    const col2 = createCollection()
    col2.load(saved)
    expect(col2.list()).toHaveLength(1)
    expect(col2.list()[0].container).toBe('work')
  })
})

describe('save:page IPC wiring (fix #57)', () => {
  const FILE = '/tmp/kenzo-collection-test/collection.json'

  beforeEach(async () => {
    // hermetic tests — start from an empty collection dir every time
    const fs = await import('fs')
    fs.rmSync('/tmp/kenzo-collection-test', { recursive: true, force: true })
  })

  async function setupIpc() {
    handlers.clear()
    const { registerIpc } = await import('../src/main/ipc')
    const { createTabManager } = await import('../src/main/tabs/TabManager')
    const tm = createTabManager(() => ({ id: '', loadURL: () => {}, destroy: () => {} }))
    const focusStub = {
      getState: () => ({ blocklist: [] as string[], whitelist: [] as string[], enabled: false }),
      setEnabled: () => {}, setBlocklist: () => {}, setWhitelist: () => {},
      getBlockedCount: () => 0,
    }
    registerIpc({
      getWindow: () => null,
      getTabManager: () => tm,
      trackView: () => {},
      getActiveView: () => undefined,
      createRealView: (() => ({ webContents: {} })) as any,
      layoutViews: () => {},
      getSplitIds: () => [],
      setSplitIds: () => {},
      getFocus: () => focusStub as any,
    })
  }

  it('save:page persists to disk and returns the saved entry', async () => {
    const fs = await import('fs')
    await setupIpc()
    const saveHandler = handlers.get('save:page')
    expect(saveHandler).toBeDefined()

    const saved = await saveHandler!({}, 'https://example.com', 'Example Page', 'work')
    expect(saved).toMatchObject({ url: 'https://example.com', title: 'Example Page', container: 'work' })

    // persisted to disk right away
    expect(fs.existsSync(FILE)).toBe(true)
    const disk = JSON.parse(fs.readFileSync(FILE, 'utf-8'))
    expect(disk).toHaveLength(1)
    expect(disk[0]).toMatchObject({ url: 'https://example.com', title: 'Example Page', container: 'work' })
  })

  it('loads the collection file at boot — new save lands after the boot-loaded page', async () => {
    const fs = await import('fs')
    fs.mkdirSync('/tmp/kenzo-collection-test', { recursive: true })
    fs.writeFileSync(FILE, JSON.stringify([{ id: 'saved-1-1', url: 'https://old.com', title: 'Old', container: 'default', savedAt: 1 }]), 'utf-8')

    await setupIpc()
    const saved = await handlers.get('save:page')!({}, 'https://new.com', 'New', 'default')
    expect(saved.url).toBe('https://new.com')
    const disk = JSON.parse(fs.readFileSync(FILE, 'utf-8'))
    expect(disk).toHaveLength(2)
    expect(disk.map((p: any) => p.url)).toEqual(['https://new.com', 'https://old.com'])
  })
})
