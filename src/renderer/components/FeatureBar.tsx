import React, { useEffect, useState } from 'react'

const styles: Record<string, React.CSSProperties> = {
  bar: {
    display: 'flex', gap: 6, padding: '6px 14px', background: 'rgba(28,28,30,0.7)',
    borderBottom: '1px solid rgba(255,255,255,0.06)', alignItems: 'center',
    backdropFilter: 'saturate(180%) blur(12px)',
    WebkitBackdropFilter: 'saturate(180%) blur(12px)',
  },
  chip: {
    padding: '3px 11px', borderRadius: 980, fontSize: 11, cursor: 'pointer',
    border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.06)',
    color: 'rgba(255,255,255,0.8)', letterSpacing: '-0.08px', transition: 'all 0.15s ease',
  },
  chipStatic: {
    padding: '3px 11px', borderRadius: 980, fontSize: 11, border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.64)', letterSpacing: '-0.08px',
  },
  active: { background: 'var(--apple-blue)', borderColor: 'var(--apple-blue)', color: '#fff' },
  warn: { color: '#ff9f0a' },
  label: { fontSize: 11, color: 'rgba(255,255,255,0.48)', marginLeft: 'auto', letterSpacing: '-0.08px' },
}

export default function FeatureBar() {
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
        {focusOn ? '🧘 Focus Bật' : '🧘 Focus Tắt'}
      </button>
      <span style={styles.chipStatic}>💤 {sleeping} tab ngủ</span>
      {warnings.length > 0 && <span style={{ ...styles.chipStatic, ...styles.warn }}>⚠️ {warnings.length} nặng RAM</span>}
      <span style={styles.label}>tony-browser v0.4</span>
    </div>
  )
}