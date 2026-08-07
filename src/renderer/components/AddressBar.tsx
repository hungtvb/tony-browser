import React, { useState } from 'react'
import UIcon from './UIcon'

const styles: Record<string, React.CSSProperties> = {
  bar: {
    display: 'flex', gap: 6, padding: '8px 14px', background: 'rgba(28,28,30,0.85)',
    backdropFilter: 'saturate(180%) blur(20px)',
    WebkitBackdropFilter: 'saturate(180%) blur(20px)',
    borderBottom: '1px solid rgba(255,255,255,0.08)', alignItems: 'center',
  },
  input: {
    flex: 1, padding: '7px 14px', borderRadius: 980, border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: 13, outline: 'none',
    letterSpacing: '-0.12px', transition: 'border-color 0.15s ease, background 0.15s ease',
  },
  btn: {
    padding: '7px 12px', borderRadius: 980, border: 'none', background: 'var(--apple-blue)',
    color: '#fff', cursor: 'pointer', fontWeight: 500, fontSize: 13, letterSpacing: '-0.12px',
    display: 'inline-flex', alignItems: 'center', gap: 5, transition: 'all 0.15s ease',
  },
  ai: {
    padding: '7px 10px', borderRadius: 980, border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.08)', cursor: 'pointer', fontSize: 15, color: '#fff',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.15s ease',
  },
  aiHover: { background: 'rgba(255,255,255,0.16)' },
  searchIcon: { display: 'flex', color: 'rgba(255,255,255,0.4)' },
}

export default function AddressBar({ onNavigate, onOpenAI, onReader, onPip, onSplit, onTts }: {
  onNavigate: (url: string) => void
  onOpenAI: () => void
  onReader?: () => void
  onPip?: () => void
  onSplit?: () => void
  onTts?: () => void
}) {
  const [value, setValue] = useState('')
  const [hoverBtn, setHoverBtn] = useState<string | null>(null)

  function go() {
    const v = value.trim()
    if (!v) return
    const url = /^https?:\/\//i.test(v) ? v : `https://${v}`
    onNavigate(url)
  }

  return (
    <div style={styles.bar}>
      <span style={styles.searchIcon}><UIcon name="search" size={15} /></span>
      <input
        className="apple-focus"
        style={styles.input}
        placeholder="Nhập địa chỉ web hoặc tìm kiếm..."
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && go()}
      />
      <button className="apple-focus" style={styles.btn} onClick={go}><UIcon name="arrow" size={14} /></button>
      {onReader && <button className="apple-focus" style={{ ...styles.ai, ...(hoverBtn === 'reader' ? styles.aiHover : {}) }} title="Reader Mode" onClick={onReader} onMouseEnter={() => setHoverBtn('reader')} onMouseLeave={() => setHoverBtn(null)}><UIcon name="reader" size={18} /></button>}
      {onPip && <button className="apple-focus" style={{ ...styles.ai, ...(hoverBtn === 'pip' ? styles.aiHover : {}) }} title="Picture-in-Picture" onClick={onPip} onMouseEnter={() => setHoverBtn('pip')} onMouseLeave={() => setHoverBtn(null)}><UIcon name="pip" size={18} /></button>}
      {onSplit && <button className="apple-focus" style={{ ...styles.ai, ...(hoverBtn === 'split' ? styles.aiHover : {}) }} title="Split View" onClick={onSplit} onMouseEnter={() => setHoverBtn('split')} onMouseLeave={() => setHoverBtn(null)}><UIcon name="split" size={18} /></button>}
      {onTts && <button className="apple-focus" style={{ ...styles.ai, ...(hoverBtn === 'tts' ? styles.aiHover : {}) }} title="Đọc bài / Lưu trang" onClick={onTts} onMouseEnter={() => setHoverBtn('tts')} onMouseLeave={() => setHoverBtn(null)}><UIcon name="tts" size={18} /></button>}
      <button className="apple-focus" style={{ ...styles.ai, ...(hoverBtn === 'ai' ? styles.aiHover : {}) }} title="Trợ lý AI" onClick={onOpenAI} onMouseEnter={() => setHoverBtn('ai')} onMouseLeave={() => setHoverBtn(null)}><UIcon name="ai" size={18} /></button>
    </div>
  )
}