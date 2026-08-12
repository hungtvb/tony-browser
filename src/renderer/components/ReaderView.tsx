import React, { useRef, useState } from 'react'
import UIcon from './UIcon'

const LIGHT = { bg: '#f5f5f7', fg: '#1d1d1f', barBg: 'rgba(245,245,247,0.9)', barBorder: 'rgba(0,0,0,0.08)', text: 'rgba(0,0,0,0.8)' }
const DARK = { bg: '#101110', fg: '#e5e5e7', barBg: 'rgba(16,17,16,0.9)', barBorder: 'rgba(255,255,255,0.1)', text: 'rgba(229,229,231,0.85)' }

function useTheme() {
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem('readerTheme') === 'dark' } catch { return false }
  })
  const toggle = () => {
    setDark(d => {
      const next = !d
      try { localStorage.setItem('readerTheme', next ? 'dark' : 'light') } catch { /* ignore */ }
      return next
    })
  }
  return { dark, toggle }
}

function useReadingProgress(ref: React.RefObject<HTMLElement | null>) {
  const [progress, setProgress] = useState(0)
  const raf = useRef(0)
  const onScroll = () => {
    cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(() => {
      const el = ref.current
      if (!el) return
      const max = el.scrollHeight - el.clientHeight
      setProgress(max > 0 ? Math.min(1, el.scrollTop / max) : 0)
    })
  }
  return { progress, onScroll }
}

export default function ReaderView({ title, content, onClose }: {
  title: string
  content: string
  onClose: () => void
}) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const { dark, toggle } = useTheme()
  const { progress, onScroll } = useReadingProgress(overlayRef)
  const t = dark ? DARK : LIGHT

  const styles: Record<string, React.CSSProperties> = {
    overlay: {
      position: 'fixed', inset: 0, zIndex: 150,
      background: t.bg, color: t.fg,
      overflow: 'auto', display: 'flex', flexDirection: 'column',
    },
    bar: {
      position: 'sticky', top: 0, display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 24px', background: t.barBg,
      backdropFilter: 'saturate(180%) blur(20px)', borderBottom: `1px solid ${t.barBorder}`,
    },
    btn: {
      padding: '5px 14px', borderRadius: 980, border: 'none', background: 'rgba(212,255,64,0.12)',
      color: '#0066cc', cursor: 'pointer', fontSize: 13,
    },
    themeBtn: {
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '6px 10px', borderRadius: 980, border: 'none',
      background: 'rgba(212,255,64,0.12)', color: '#0066cc', cursor: 'pointer', fontSize: 13,
    },
    progress: {
      position: 'sticky', top: 0, zIndex: 1, height: 3,
      width: `${Math.round(progress * 100)}%`,
      background: '#d4ff40', transition: 'width 0.1s linear',
    },
    title: { fontSize: 14, fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
    body: { maxWidth: 680, margin: '0 auto', padding: '40px 24px', width: '100%' },
    h1: { fontSize: 32, fontWeight: 600, lineHeight: 1.2, letterSpacing: '-0.28px', marginBottom: 24 },
    text: { fontSize: 17, lineHeight: 1.6, letterSpacing: '-0.374px', color: t.text },
  }

  return (
    <div ref={overlayRef} style={styles.overlay} onScroll={onScroll}>
      <div style={styles.progress} data-reader-progress />
      <div style={styles.bar}>
        <span style={styles.title}>📖 {title || 'Reader Mode'}</span>
        <button className="apple-focus" style={styles.themeBtn} onClick={toggle} aria-label={dark ? 'Toggle light theme' : 'Toggle dark theme'}>
          <UIcon name={dark ? 'light_mode' : 'dark_mode'} size={16} color="#0066cc" />
          {dark ? 'Light' : 'Dark'}
        </button>
        <button className="apple-focus" style={styles.btn} onClick={onClose}>✕ Close</button>
      </div>
      <div style={styles.body}>
        <h1 style={styles.h1}>{title}</h1>
        <div style={styles.text}>{content}</div>
      </div>
    </div>
  )
}