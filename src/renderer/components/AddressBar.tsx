import React, { useState } from 'react'
import UIcon from './UIcon'

const styles: Record<string, React.CSSProperties> = {
  // Aaply: floating white nav card on the gray canvas
  bar: {
    display: 'flex', gap: 6, padding: '6px 10px', background: '#ffffff',
    borderRadius: 5, boxShadow: 'none',
    alignItems: 'center', margin: '4px 12px 8px',
  },
  input: {
    flex: 1, padding: '8px 14px', borderRadius: 16, border: '1px solid #e7e7e7',
    background: '#fdfcf9', color: '#141414', fontSize: 13.5, outline: 'none',
    transition: 'background 0.15s ease, border-color 0.15s ease',
    fontWeight: 500, fontFamily: 'var(--font-body)',
  },
  btn: {
    padding: '8px 16px', borderRadius: 5, border: 'none', background: '#94e130',
    color: '#141414', cursor: 'pointer', fontWeight: 500, fontSize: 13,
    display: 'inline-flex', alignItems: 'center', gap: 5, transition: 'all 0.15s ease',
    fontFamily: 'var(--font-body)',
  },
  btnBlack: {
    padding: '8px 16px', borderRadius: 5, border: 'none', background: '#141414',
    color: '#ffffff', cursor: 'pointer', fontWeight: 500, fontSize: 13,
    display: 'inline-flex', alignItems: 'center', gap: 5, transition: 'all 0.15s ease',
    fontFamily: 'var(--font-body)',
  },
  ai: {
    padding: '7px 10px', borderRadius: 5, border: '1px solid transparent',
    background: 'transparent', cursor: 'pointer', fontSize: 15, color: '#141414',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.15s ease', marginLeft: 2,
  },
  aiHover: { background: '#f4eee5', borderColor: '#e7e7e7' },
  searchIcon: { display: 'flex', color: '#6e6e6e', marginLeft: 4 },
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
  const [draft, setDraft] = useState<string | null>(null)
  const [hoverBtn, setHoverBtn] = useState<string | null>(null)

  const shown = draft ?? value

  function normalize(v: string): string {
    return /^https?:\/\//i.test(v) ? v : `https://${v}`
  }

  function go() {
    const v = draft?.trim() ?? ''
    if (!v) return
    setDraft(null)
    onCommit(normalize(v))
  }

  function cancel() {
    setDraft(null)
  }

  function commitOrRevert() {
    const v = (draft ?? '').trim()
    setDraft(null)
    if (!v) return
    if (normalize(v) === normalize(value.trim())) return
    onCommit(normalize(v))
  }

  const navBtn = (disabled: boolean): React.CSSProperties => ({
    padding: '7px 9px', borderRadius: 5, border: '1px solid transparent',
    background: 'transparent',
    color: disabled ? '#a1a1a1' : '#141414',
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
      {/* Aaply signature: yellow + black button pair */}
      <button className="apple-focus" style={styles.btn} onClick={go}><UIcon name="arrow" size={14} color="#141414" /></button>
      {onReader && <button className="apple-focus" style={{ ...styles.ai, ...(hoverBtn === 'reader' ? styles.aiHover : {}) }} title="Reader Mode" onClick={onReader} onMouseEnter={() => setHoverBtn('reader')} onMouseLeave={() => setHoverBtn(null)}><UIcon name="reader" size={18} /></button>}
      {onPip && <button className="apple-focus" style={{ ...styles.ai, ...(hoverBtn === 'pip' ? styles.aiHover : {}) }} title={pipActive ? 'Stop PiP' : 'Picture-in-Picture'} onClick={onPip} onMouseEnter={() => setHoverBtn('pip')} onMouseLeave={() => setHoverBtn(null)}><UIcon name="pip" size={18} /></button>}
      {onSplit && <button className="apple-focus" style={{ ...styles.ai, ...(hoverBtn === 'split' ? styles.aiHover : {}) }} title="Split View" onClick={onSplit} onMouseEnter={() => setHoverBtn('split')} onMouseLeave={() => setHoverBtn(null)}><UIcon name="split" size={18} /></button>}
      {onTts && <button className="apple-focus" style={{ ...styles.ai, ...(hoverBtn === 'tts' ? styles.aiHover : {}) }} title="Read article / Save page" onClick={onTts} onMouseEnter={() => setHoverBtn('tts')} onMouseLeave={() => setHoverBtn(null)}><UIcon name="tts" size={18} /></button>}
      <button className="apple-focus" style={styles.btnBlack} onClick={onOpenAI} onMouseEnter={() => setHoverBtn('ai')} onMouseLeave={() => setHoverBtn(null)} title="AI Assistant">
        <UIcon name="ai" size={16} color="#ffffff" />
      </button>
    </div>
  )
}
