import React, { useEffect, useState } from 'react'
import UIcon from './UIcon'

const styles: Record<string, React.CSSProperties> = {
  bar: {
    display: 'flex', gap: 6, padding: '6px 14px', background: 'rgba(28,28,30,0.7)',
    borderBottom: '1px solid rgba(255,255,255,0.06)', alignItems: 'center',
    backdropFilter: 'saturate(180%) blur(12px)',
    WebkitBackdropFilter: 'saturate(180%) blur(12px)',
  },
  chip: {
    padding: '4px 11px', borderRadius: 980, fontSize: 11, cursor: 'pointer',
    border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.06)',
    color: 'rgba(255,255,255,0.8)', letterSpacing: '-0.08px', transition: 'all 0.15s ease',
    display: 'flex', alignItems: 'center', gap: 4,
  },
  chipStatic: {
    padding: '4px 11px', borderRadius: 980, fontSize: 11, border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.64)', letterSpacing: '-0.08px',
    display: 'flex', alignItems: 'center', gap: 4,
  },
  active: { background: 'var(--apple-blue)', borderColor: 'var(--apple-blue)', color: '#fff' },
  warn: { color: '#ff9f0a' },
  brand: {
    marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 7,
    fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.85)', letterSpacing: '-0.2px',
    padding: '3px 10px', borderRadius: 980, background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.08)', userSelect: 'none',
  },
  brandDot: {
    width: 8, height: 8, borderRadius: '50%',
    background: 'linear-gradient(135deg, #2997ff, #0071e3)',
    boxShadow: '0 0 8px rgba(0,113,227,0.6)',
  },
  brandVer: { fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 400, marginLeft: 2 },
}

export default function FeatureBar({ layout, onToggleLayout }: {
  layout: 'top' | 'side'
  onToggleLayout: () => void
}) {
  const [focusOn, setFocusOn] = useState(false)
  const [sleeping, setSleeping] = useState(0)
  const [warnings, setWarnings] = useState<string[]>([])

  useEffect(() => {
    window.tony?.focus.state().then(s => setFocusOn(s.enabled)).catch(() => {})
    const iv = setInterval(() => {
      window.tony?.sleeper.evaluate().then(r => {
        setSleeping(r.sleeping)
        setWarnings(r.warnings)
      }).catch(() => {})
    }, 10000)
    return () => clearInterval(iv)
  }, [])

  function toggleFocus() {
    const next = !focusOn
    setFocusOn(next)
    window.tony?.focus.toggle(next)
  }

  return (
    <div style={styles.bar}>
      <button className="apple-focus" style={{ ...styles.chip, ...(focusOn ? styles.active : {}) }} onClick={toggleFocus}>
        <UIcon name="focus" size={13} /> {focusOn ? 'Focus Bật' : 'Focus Tắt'}
      </button>
      <span style={styles.chipStatic}><UIcon name="sleep" size={13} /> {sleeping} tab ngủ</span>
      {warnings.length > 0 && <span style={{ ...styles.chipStatic, ...styles.warn }}><UIcon name="lock" size={13} /> {warnings.length} nặng RAM</span>}
      <button className="apple-focus" style={styles.chip} onClick={onToggleLayout} title="Chuyển layout tab">
        <UIcon name="layout" size={13} /> {layout === 'side' ? 'Dọc' : 'Ngang'}
      </button>
      <span style={styles.brand} title="Tony Browser">
        <span style={styles.brandDot} />
        Tony Browser<span style={styles.brandVer}>v0.11</span>
      </span>
    </div>
  )
}