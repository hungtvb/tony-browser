import React, { useEffect, useState } from 'react'
import UIcon from './UIcon'

const styles: Record<string, React.CSSProperties> = {
  // Aaply: chips float on the gray canvas — white pills, hairline borders
  bar: {
    display: 'flex', gap: 6, padding: '8px 14px 4px',
    background: 'transparent', alignItems: 'center',
  },
  chip: {
    padding: '4px 12px', borderRadius: 52, fontSize: 11, cursor: 'pointer',
    border: '1px solid rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.66)',
    backdropFilter: 'blur(14px) saturate(1.3)', WebkitBackdropFilter: 'blur(14px) saturate(1.3)',
    color: '#141414', transition: 'all 0.15s ease',
    display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500, fontFamily: 'var(--font-body)',
  },
  chipStatic: {
    padding: '4px 12px', borderRadius: 52, fontSize: 11, border: '1px solid rgba(255,255,255,0.6)',
    background: 'rgba(255,255,255,0.66)',
    backdropFilter: 'blur(14px) saturate(1.3)', WebkitBackdropFilter: 'blur(14px) saturate(1.3)',
    color: '#6e6e6e',
    display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500, fontFamily: 'var(--font-body)',
  },
  active: { background: '#94e130', borderColor: '#94e130', color: '#141414', fontWeight: 600, backdropFilter: 'none', WebkitBackdropFilter: 'none' },
  warn: { background: '#94e130', borderColor: '#94e130', color: '#141414', fontWeight: 600, backdropFilter: 'none', WebkitBackdropFilter: 'none' },
  brand: {
    marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 7,
    fontSize: 12, fontWeight: 600, color: '#141414', fontFamily: 'var(--font-display)', letterSpacing: '-0.2px',
    padding: '4px 12px', borderRadius: 52, background: 'rgba(255,255,255,0.66)', border: '1px solid rgba(255,255,255,0.6)',
    backdropFilter: 'blur(14px) saturate(1.3)', WebkitBackdropFilter: 'blur(14px) saturate(1.3)', userSelect: 'none',
  },
  brandMark: {
    width: 14, height: 14, borderRadius: 5, background: '#94e130',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#141414', fontSize: 10, fontWeight: 600, fontFamily: 'var(--font-body)', lineHeight: 1,
  },
  brandVer: { fontSize: 10, color: '#6e6e6e', fontWeight: 400, marginLeft: 2, fontFamily: 'var(--font-body)' },
}

export default function FeatureBar({ layout, onToggleLayout, warnedIds, onWarned }: {
  layout: 'top' | 'side'
  onToggleLayout: () => void
  warnedIds: string[]
  onWarned: (ids: string[]) => void
}) {
  const [focusOn, setFocusOn] = useState(false)
  const [sleeping, setSleeping] = useState(0)

  useEffect(() => {
    window.tony?.focus.state().then(s => setFocusOn(s.enabled)).catch(() => {})
    const iv = setInterval(() => {
      window.tony?.sleeper.evaluate().then(r => {
        setSleeping(r.sleeping)
        onWarned(r.warnings)
      }).catch(() => {})
    }, 10000)
    const offWarnings = window.tony?.sleeper.onWarnings(onWarned)
    return () => { clearInterval(iv); offWarnings?.() }
  }, [onWarned])

  function toggleFocus() {
    const next = !focusOn
    setFocusOn(next)
    window.tony?.focus.toggle(next)
  }

  return (
    <div style={styles.bar}>
      <button className="apple-focus" style={{ ...styles.chip, ...(focusOn ? styles.active : {}) }} onClick={toggleFocus}>
        <UIcon name="focus" size={13} color={focusOn ? '#141414' : undefined} /> {focusOn ? 'Focus On' : 'Focus Off'}
      </button>
      <span style={styles.chipStatic}><UIcon name="sleep" size={13} /> {sleeping} tabs asleep</span>
      {warnedIds.length > 0 && <span style={{ ...styles.chip, ...styles.warn }}><UIcon name="lock" size={13} color="#ffffff" /> {warnedIds.length} RAM-heavy tabs</span>}
      <button className="apple-focus" style={styles.chip} onClick={onToggleLayout} title="Switch tab layout">
        <UIcon name="layout" size={13} /> {layout === 'side' ? 'Vertical' : 'Horizontal'}
      </button>
      <span style={styles.brand} title="Tony Browser">
        <span style={styles.brandMark}>T</span>
        Tony Browser<span style={styles.brandVer}>v0.12</span>
      </span>
    </div>
  )
}
