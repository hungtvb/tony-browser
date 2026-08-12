import React, { useState } from 'react'
import UIcon from './UIcon'

const styles: Record<string, React.CSSProperties> = {
  bar: {
    display: 'flex', gap: 6, padding: '8px 14px', background: 'rgba(14,16,12,0.38)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(212,255,64,0.10)',
    backdropFilter: 'saturate(180%) blur(24px)',
    WebkitBackdropFilter: 'saturate(180%) blur(24px)',
    alignItems: 'center',
  },
  input: {
    flex: 1, padding: '7px 14px', borderRadius: 980, border: 'none',
    background: 'rgba(255,255,255,0.14)', color: '#fff', fontSize: 13, outline: 'none',
    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)',
    letterSpacing: '-0.12px', transition: 'background 0.15s ease',
  },
  btn: {
    padding: '7px 12px', borderRadius: 980, border: 'none', background: 'var(--apple-blue)',
    color: '#0a0a0a', cursor: 'pointer', fontWeight: 600, fontSize: 13, letterSpacing: '-0.12px',
    display: 'inline-flex', alignItems: 'center', gap: 5, transition: 'all 0.15s ease',
    boxShadow: '0 0 14px rgba(212,255,64,0.28)',
  },
  ai: {
    padding: '7px 10px', borderRadius: 980, border: 'none',
    background: 'transparent', cursor: 'pointer', fontSize: 15, color: 'rgba(255,255,255,0.72)',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.15s ease', marginLeft: 2,
  },
  aiHover: { background: 'rgba(255,255,255,0.14)', color: '#fff' },
  searchIcon: { display: 'flex', color: 'rgba(255,255,255,0.4)' },
}

export interface NavControls {
  canGoBack: boolean
  canGoForward: boolean
  onBack: () => void
  onForward: () => void
  onReload: () => void
}

/**
 * Controlled address bar (issue #42 + #45): shows the ACTIVE tab URL as its value,
 * plus optional back/forward/reload nav controls (issue #45).
 * While focused/typing a local draft is shown; Enter commits, Escape reverts,
 * blur commits (non-empty draft) or reverts to the active URL.
 */
export default function AddressBar({ value, onCommit, onOpenAI, onReader, onPip, onSplit, onTts, nav, pipActive }: {
  value: string
  onCommit: (url: string) => void
  onOpenAI: () => void
  onReader?: () => void
  onPip?: () => void
  onSplit?: () => void
  onTts?: () => void
  nav?: NavControls
  pipActive?: boolean
}) {
  // null = not editing → show `value`; string = user's in-progress draft
  const [draft, setDraft] = useState<string | null>(null)
  const [hoverBtn, setHoverBtn] = useState<string | null>(null)

  const shown = draft ?? value

  function normalize(v: string): string {
    return /^https?:\/\//i.test(v) ? v : `https://${v}`
  }

  function go() {
    // Only act on a real draft. When the input is not being edited (draft === null)
    // the blur handler already committed/reverted — navigating with stale `value`
    // would send the user back to the previous page (issue #42 review fix).
    const v = draft?.trim() ?? ''
    if (!v) return
    setDraft(null)
    onCommit(normalize(v))
  }

  function cancel() {
    setDraft(null) // Escape → revert to the active tab URL
  }

  function commitOrRevert() {
    const v = (draft ?? '').trim()
    setDraft(null)
    if (!v) return // empty draft on blur → just revert to the active URL
    // No-op blur (focus then blur without editing) must not re-navigate to the
    // current URL — that would cause a needless page reload (issue #42 review fix).
    if (normalize(v) === normalize(value.trim())) return
    onCommit(normalize(v))
  }

  const navBtn = (disabled: boolean): React.CSSProperties => ({
    padding: '7px 9px', borderRadius: 980, border: 'none', background: 'transparent',
    color: disabled ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.75)',
    cursor: disabled ? 'default' : 'pointer', fontSize: 15, lineHeight: 1,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.15s ease', flexShrink: 0,
  })

  return (
    <div style={styles.bar}>
      {nav && (
        <>
          <button className="apple-focus" style={navBtn(!nav.canGoBack)} title="Back" disabled={!nav.canGoBack}
            onClick={nav.onBack} onMouseEnter={() => setHoverBtn('back')} onMouseLeave={() => setHoverBtn(null)}>
            <UIcon name="arrow-back" size={17} />
          </button>
          <button className="apple-focus" style={navBtn(!nav.canGoForward)} title="Forward" disabled={!nav.canGoForward}
            onClick={nav.onForward} onMouseEnter={() => setHoverBtn('forward')} onMouseLeave={() => setHoverBtn(null)}>
            <UIcon name="arrow-forward" size={17} />
          </button>
          <button className="apple-focus" style={navBtn(false)} title="Reload"
            onClick={nav.onReload} onMouseEnter={() => setHoverBtn('reload')} onMouseLeave={() => setHoverBtn(null)}>
            <UIcon name="refresh" size={17} />
          </button>
        </>
      )}
      <span style={styles.searchIcon}><UIcon name="search" size={15} /></span>
      <input
        className="apple-focus"
        style={styles.input}
        placeholder="Enter a web address or search..."
        value={shown}
        onChange={e => setDraft(e.target.value)}
        onFocus={e => { setDraft(e.target.value); e.target.select() }}
        onKeyDown={e => {
          if (e.key === 'Enter') go()
          else if (e.key === 'Escape') cancel()
        }}
        onBlur={commitOrRevert}
      />
      <button className="apple-focus" style={styles.btn} onClick={go}><UIcon name="arrow" size={14} color="#0a0a0a" /></button>
      {onReader && <button className="apple-focus" style={{ ...styles.ai, ...(hoverBtn === 'reader' ? styles.aiHover : {}) }} title="Reader Mode" onClick={onReader} onMouseEnter={() => setHoverBtn('reader')} onMouseLeave={() => setHoverBtn(null)}><UIcon name="reader" size={18} /></button>}
      {onPip && <button className="apple-focus" style={{ ...styles.ai, ...(hoverBtn === 'pip' ? styles.aiHover : {}) }} title={pipActive ? 'Stop PiP' : 'Picture-in-Picture'} onClick={onPip} onMouseEnter={() => setHoverBtn('pip')} onMouseLeave={() => setHoverBtn(null)}><UIcon name="pip" size={18} /></button>}
      {onSplit && <button className="apple-focus" style={{ ...styles.ai, ...(hoverBtn === 'split' ? styles.aiHover : {}) }} title="Split View" onClick={onSplit} onMouseEnter={() => setHoverBtn('split')} onMouseLeave={() => setHoverBtn(null)}><UIcon name="split" size={18} /></button>}
      {onTts && <button className="apple-focus" style={{ ...styles.ai, ...(hoverBtn === 'tts' ? styles.aiHover : {}) }} title="Read article / Save page" onClick={onTts} onMouseEnter={() => setHoverBtn('tts')} onMouseLeave={() => setHoverBtn(null)}><UIcon name="tts" size={18} /></button>}
      <button className="apple-focus" style={{ ...styles.ai, ...(hoverBtn === 'ai' ? styles.aiHover : {}) }} title="AI Assistant" onClick={onOpenAI} onMouseEnter={() => setHoverBtn('ai')} onMouseLeave={() => setHoverBtn(null)}><UIcon name="ai" size={18} /></button>
    </div>
  )
}
