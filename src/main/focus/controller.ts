// Focus Mode — controller: holds the engine + state, exposes via IPC
import { createFocusEngine, type FocusEngine } from '../focus/engine'
import { saveFocusState } from '../focus/store'
import type { FocusState } from '../../shared/types'

export const DEFAULT_BLOCKLIST = ['facebook.com', 'youtube.com', 'tiktok.com', 'instagram.com', 'news.vn', 'zingnews.vn', 'dantri.com.vn', 'vnexpress.net', 'tuoitre.vn']

export class FocusController {
  private engine: FocusEngine
  private _enabled = false
  private blocklist: string[] = DEFAULT_BLOCKLIST
  private whitelist: string[] = []
  private _blockedCount = 0

  constructor(initial?: Partial<Pick<FocusState, 'enabled' | 'blocklist' | 'whitelist'>>) {
    if (initial) {
      if (initial.enabled !== undefined) this._enabled = initial.enabled
      // keep [] when the user intentionally sets an empty blocklist (do not replace with DEFAULT)
      if (initial.blocklist !== undefined) this.blocklist = initial.blocklist
      if (initial.whitelist !== undefined) this.whitelist = initial.whitelist
    }
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

  // counter for focus blocks — incremented when attachPrivacy blocks a request (kept separate from adblock)
  incrementBlocked() {
    this._blockedCount++
  }

  getBlockedCount(): number {
    return this._blockedCount
  }
}