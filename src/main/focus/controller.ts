// Focus Mode — controller: giữ engine + state, expose qua IPC
import { createFocusEngine, type FocusEngine } from '../focus/engine'
import { saveFocusState } from '../focus/store'
import type { FocusState } from '../../shared/types'

const DEFAULT_BLOCKLIST = ['facebook.com', 'youtube.com', 'tiktok.com', 'instagram.com', 'news.vn', 'zingnews.vn', 'dantri.com.vn', 'vnexpress.net', 'tuoitre.vn']

export class FocusController {
  private engine: FocusEngine
  private _enabled: boolean
  private blocklist: string[]
  private whitelist: string[]

  constructor(initial?: FocusState) {
    this._enabled = initial?.enabled ?? false
    const bl = initial?.blocklist
    this.blocklist = bl !== undefined ? bl : DEFAULT_BLOCKLIST
    this.whitelist = initial?.whitelist ?? []
    this.engine = createFocusEngine({ blocklist: this.blocklist, whitelist: this.whitelist })
    this.engine.setEnabled(this._enabled)
  }

  getState(): FocusState {
    return { enabled: this.enabled, blocklist: [...this.blocklist], whitelist: [...this.whitelist] }
  }

  get enabled() { return this._enabled }

  setEnabled(on: boolean) {
    this._enabled = on
    this.engine.setEnabled(on)
    saveFocusState(this.getState())
  }

  setBlocklist(list: string[]) {
    this.blocklist = list
    this.engine.setBlocklist(list)
    saveFocusState(this.getState())
  }

  setWhitelist(list: string[]) {
    this.whitelist = list
    this.engine.setWhitelist(list)
    saveFocusState(this.getState())
  }

  check(url: string) {
    return this.engine.check(url)
  }
}
