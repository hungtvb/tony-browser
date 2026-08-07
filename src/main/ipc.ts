// Đăng ký các IPC handler giữa renderer ↔ main
import { ipcMain, BrowserWindow, WebContentsView } from 'electron'
import { attachView, detachView, TOOLBAR_HEIGHT, createTabView } from './window'
import { createBlocklist } from './privacy/blocklist'
import blocklistDomains from './privacy/blocklist.json'
import type { TabState, PrivacyStats, AIConfig, AIStatus, AIRequestParams } from '../shared/types'
import type { createTabManager } from './tabs/TabManager'
import { AIController } from './ai/controller'
import { FocusController } from './focus/controller'
import { SmartTabController } from './smarttab/controller'
import { SleeperController } from './perf/controller'

export interface IpcDeps {
  getWindow: () => BrowserWindow | null
  getTabManager: () => ReturnType<typeof createTabManager>
  trackView: (tabId: string, view: WebContentsView | null) => void
  getActiveView: (tabId: string) => WebContentsView | undefined
  createRealView: (url: string) => WebContentsView
}

// Privacy filter state
let privacyFilterOn = true
let blockedCount = 0
let listSize = 0

type TM = ReturnType<typeof createTabManager>

function tabToState(t: any): TabState {
  return { id: t.id, url: t.url, title: t.title, loading: t.loading }
}

export function attachPrivacy(win: BrowserWindow, _deps: IpcDeps) {
  const { session } = win.webContents
  const bl = createBlocklist(blocklistDomains)
  listSize = bl.size

  session.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, callback) => {
    if (privacyFilterOn && bl.shouldBlock(details.url)) {
      blockedCount++
      callback({ cancel: true })
    } else {
      callback({})
    }
  })
}

export function registerIpc(deps: IpcDeps) {
  const tm = deps.getTabManager()
  const win = deps.getWindow

  // ─── tabs ───
  ipcMain.handle('tabs:list', () => tm.list().map(tabToState))

  ipcMain.handle('tabs:open', (_e, url: string) => {
    const tab = tm.open(url)
    // tạo view thật
    const view = deps.createRealView(tab.url)
    deps.trackView(tab.id, view)
    const w = win()
    if (w) attachView(w, view)
    return tabToState(tab)
  })

  ipcMain.handle('tabs:close', (_e, id: string) => {
    const view = deps.getActiveView(id)
    if (view) {
      const w = win()
      if (w) detachView(w, view)
      if (!view.webContents.isDestroyed()) view.webContents.close()
      deps.trackView(id, null)
    }
    tm.close(id)
    broadcastTabs()
    return true
  })

  ipcMain.handle('tabs:activate', (_e, id: string) => {
    tm.activate(id)
    // ẩn/hiện view theo active
    const w = win()
    if (w) {
      for (const tab of tm.list()) {
        const v = deps.getActiveView(tab.id)
        if (v) v.setVisible(tab.id === id)
      }
    }
    broadcastTabs()
    return true
  })

  // ─── privacy ───
  ipcMain.handle('privacy:stats', (): PrivacyStats => ({ blocked: blockedCount, listSize }))
  ipcMain.handle('privacy:toggle', (_e, on: boolean) => { privacyFilterOn = on; return on })

  // ─── ai ───
  const ai = new AIController(deps)
  ipcMain.handle('ai:config', () => ai.getConfig())
  ipcMain.handle('ai:saveConfig', (_e, cfg: AIConfig) => ai.saveConfig(cfg))
  ipcMain.handle('ai:status', (): AIStatus => ai.status())
  ipcMain.handle('ai:ask', async (_e, params: AIRequestParams) => {
    const text = await ai.ask(params)
    return { text }
  })

  // ─── focus ───
  const focus = new FocusController()
  ipcMain.handle('focus:state', () => focus.getState())
  ipcMain.handle('focus:toggle', (_e, on: boolean) => { focus.setEnabled(on); return focus.getState() })
  ipcMain.handle('focus:setBlocklist', (_e, list: string[]) => { focus.setBlocklist(list); return focus.getState() })
  ipcMain.handle('focus:setWhitelist', (_e, list: string[]) => { focus.setWhitelist(list); return focus.getState() })

  // ─── smarttab ───
  const smart = new SmartTabController()
  ipcMain.handle('smarttab:groups', (_e, mode: 'domain' | 'theme') => {
    const tabs = tm.list()
    return mode === 'theme' ? smart.groupByTheme(tabs) : smart.groupByDomain(tabs)
  })
  ipcMain.handle('smarttab:saveSession', (_e, name?: string) => smart.saveSession(tm.list(), name))
  ipcMain.handle('smarttab:sessions', () => smart.listSessions())
  ipcMain.handle('smarttab:restoreSession', (_e, name: string) => smart.restoreSession(name))

  // ─── sleeper ───
  const sleeper = new SleeperController()
  ipcMain.handle('sleeper:evaluate', () => {
    return sleeper.evaluate(tm.list(), tm.activeId, [], undefined, (id) => {
      const view = deps.getActiveView(id)
      if (view && !view.webContents.isDestroyed()) {
        try { view.webContents.setBackgroundThrottling(true) } catch {}
      }
    })
  })
  ipcMain.handle('sleeper:activity', (_e, id: string) => sleeper.recordActivity(id))

  // helper broadcast — dùng webContents send của window
  function broadcastTabs() {
    const w = win()
    if (w && !w.webContents.isDestroyed()) {
      w.webContents.send('tabs:changed', tm.list().map(tabToState))
    }
  }
  tm.on('changed', broadcastTabs)

  return { broadcastTabs }
}

export { blocklistDomains, TOOLBAR_HEIGHT }