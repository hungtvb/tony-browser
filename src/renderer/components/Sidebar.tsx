import React, { useState } from 'react'
import { CONTAINER_COLORS } from '../../shared/types'
import UIcon from './UIcon'

interface Tab { id: string; title: string; url: string; favicon?: string; loading?: boolean; container?: string }

const styles: Record<string, React.CSSProperties> = {
  // Aaply: floating white card on the gray canvas — one soft shadow, no thick borders
  sidebar: {
    display: 'flex', flexDirection: 'column', width: 236, background: '#ffffff',
    borderRadius: 10, boxShadow: 'none',
    padding: '14px 10px 10px', gap: 2, overflowY: 'auto', flexShrink: 0,
    margin: '0 0 10px 12px',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '4px 6px 10px', fontSize: 13, fontWeight: 600, color: '#141414',
    fontFamily: 'var(--font-display)', letterSpacing: '-0.2px',
  },
  newBtn: {
    width: 28, height: 28, borderRadius: 52, border: '1px solid #e7e7e7', background: '#ffffff',
    color: '#141414', cursor: 'pointer', fontSize: 15, lineHeight: 1, fontWeight: 500,
    transition: 'all 0.15s var(--ease-out)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
  },
  tab: {
    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 5,
    cursor: 'pointer', fontSize: 12.5, color: '#141414', overflow: 'hidden',
    transition: 'background 0.12s var(--ease-out)', background: 'transparent',
    textAlign: 'left', width: '100%', fontWeight: 500, border: 'none', fontFamily: 'var(--font-body)',
  },
  active: { background: '#94e130', color: '#141414', fontWeight: 600 },
  dot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  favicon: { width: 16, height: 16, borderRadius: 4, flexShrink: 0, objectFit: 'contain', background: '#f4eee5' },
  title: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  close: { opacity: 0, cursor: 'pointer', fontSize: 11, flexShrink: 0, color: '#141414', transition: 'opacity 0.12s ease' },
}

export default function Sidebar({ tabs, activeId, onSelect, onClose, onNewTab }: {
  tabs: Tab[]; activeId: string
  onSelect: (id: string) => void; onClose: (id: string) => void
  onNewTab: () => void
}) {
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [hoverNew, setHoverNew] = useState(false)

  return (
    <div style={styles.sidebar}>
      <div style={styles.header}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><UIcon name="menu" size={13} /> Spaces</span>
        <button className="apple-focus" style={{ ...styles.newBtn, ...(hoverNew ? { background: '#94e130', borderColor: '#94e130', transform: 'scale(1.08)' } : {}) }}
          onClick={onNewTab} title="New Tab"
          onMouseEnter={() => setHoverNew(true)} onMouseLeave={() => setHoverNew(false)}><UIcon name="plus" size={15} /></button>
      </div>
      {tabs.length === 0 && <div style={{ color: '#6e6e6e', fontSize: 12, padding: '12px 10px' }}>No tabs yet</div>}
      {tabs.map(t => (
        <button key={t.id} className="apple-focus"
          style={{
            ...styles.tab,
            ...(t.id === activeId ? styles.active : {}),
            ...(hoverId === t.id && t.id !== activeId ? { background: '#f4eee5' } : {}),
          }}
          onClick={() => onSelect(t.id)} title={t.url}
          onMouseEnter={() => setHoverId(t.id)} onMouseLeave={() => setHoverId(null)}>
          {t.favicon ? (
            <img src={t.favicon} style={styles.favicon} alt="" draggable={false}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
          ) : (
            <span style={{ ...styles.dot, background: CONTAINER_COLORS[t.container ?? 'default'] ?? '#6b7280' }} />
          )}
          <span style={styles.title}>{t.title}</span>
          <span style={{ ...styles.close, ...(hoverId === t.id || t.id === activeId ? { opacity: 1 } : {}) }}
            onClick={(e) => { e.stopPropagation(); onClose(t.id) }}><UIcon name="close" size={11} /></span>
        </button>
      ))}
    </div>
  )
}
