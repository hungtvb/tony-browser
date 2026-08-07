import React, { useEffect, useState } from 'react'

const styles: Record<string, React.CSSProperties> = {
  bar: {
    display: 'flex', gap: 6, padding: '6px 10px', background: '#14161c',
    borderBottom: '1px solid #2a2e39', alignItems: 'center',
  },
  chip: {
    padding: '4px 10px', borderRadius: 12, fontSize: 12, cursor: 'pointer',
    border: '1px solid #2a2e39', background: '#1a1d24', color: '#c9ced8',
  },
  active: { background: '#2f9e44', borderColor: '#2f9e44', color: '#fff' },
  label: { fontSize: 12, color: '#6b7280', marginLeft: 'auto' },
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
      <button style={{ ...styles.chip, ...(focusOn ? styles.active : {}) }} onClick={toggleFocus}>
        {focusOn ? '🧘 Focus: BẬT' : '🧘 Focus: TẮT'}
      </button>
      <span style={{ ...styles.chip, cursor: 'default' }}>💤 {sleeping} tab ngủ</span>
      {warnings.length > 0 && <span style={{ ...styles.chip, cursor: 'default', color: '#f0a020' }}>⚠️ {warnings.length} tab nặng RAM</span>}
      <span style={styles.label}>v0.4 — Tony Browser</span>
    </div>
  )
}