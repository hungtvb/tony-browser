import React from 'react'
import { CONTAINER_COLORS } from '../../shared/types'

interface Tab { id: string; title: string; url: string; container?: string }

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    display: 'flex', flexDirection: 'column', width: 220, background: 'rgba(20,20,22,0.95)',
    backdropFilter: 'saturate(180%) blur(20px)',
    WebkitBackdropFilter: 'saturate(180%) blur(20px)',
    borderRight: '1px solid rgba(255,255,255,0.08)',
    padding: '8px 8px 0', gap: 2, overflowY: 'auto', flexShrink: 0,
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '6px 10px 10px', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.6)',
    letterSpacing: '-0.12px',
  },
  newBtn: {
    width: 24, height: 24, borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.1)',
    color: '#fff', cursor: 'pointer', fontSize: 15, lineHeight: 1,
  },
  tab: {
    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 10,
    cursor: 'pointer', fontSize: 12, color: 'rgba(255,255,255,0.75)', overflow: 'hidden',
    letterSpacing: '-0.08px', transition: 'background 0.12s', border: 'none', background: 'transparent',
    textAlign: 'left', width: '100%',
  },
  active: { background: 'rgba(255,255,255,0.14)', color: '#fff' },
  dot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  title: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  close: { opacity: 0.4, cursor: 'pointer', fontSize: 11, flexShrink: 0, color: 'rgba(255,255,255,0.8)' },
}

export default function Sidebar({ tabs, activeId, onSelect, onClose, onNewTab }: {
  tabs: Tab[]; activeId: string
  onSelect: (id: string) => void; onClose: (id: string) => void
  onNewTab: () => void
}) {
  return (
    <div style={styles.sidebar}>
      <div style={styles.header}>
        <span>☰ Spaces</span>
        <button className="apple-focus" style={styles.newBtn} onClick={onNewTab} title="Tab mới">+</button>
      </div>
      {tabs.length === 0 && <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, padding: '12px 10px' }}>Chưa có tab</div>}
      {tabs.map(t => (
        <button key={t.id} className="apple-focus"
          style={{ ...styles.tab, ...(t.id === activeId ? styles.active : {}) }}
          onClick={() => onSelect(t.id)} title={t.url}>
          <span style={{ ...styles.dot, background: CONTAINER_COLORS[t.container ?? 'default'] ?? '#6b7280' }} />
          <span style={styles.title}>{t.title}</span>
          <span style={styles.close} onClick={(e) => { e.stopPropagation(); onClose(t.id) }}>✕</span>
        </button>
      ))}
    </div>
  )
}