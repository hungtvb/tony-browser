import React, { useState } from 'react'
import { CONTAINER_COLORS } from '../../shared/types'

interface Tab { id: string; title: string; url: string; loading?: boolean; container?: string }

const styles: Record<string, React.CSSProperties> = {
  bar: {
    display: 'flex', gap: 4, padding: '8px 12px', minHeight: 44,
    background: 'rgba(14,16,12,0.38)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(212,255,64,0.12)',
    backdropFilter: 'saturate(180%) blur(24px)',
    WebkitBackdropFilter: 'saturate(180%) blur(24px)',
    alignItems: 'center', overflowX: 'auto',
  },
  tab: {
    padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 400,
    cursor: 'pointer', background: 'transparent', color: 'rgba(255,255,255,0.75)',
    whiteSpace: 'nowrap', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis',
    flexShrink: 0, letterSpacing: '-0.12px', border: 'none',
    display: 'flex', alignItems: 'center', gap: 6,
    transition: 'background 0.2s var(--ease-out), color 0.2s var(--ease-out), transform 0.15s var(--ease-out)',
  },
  active: { background: 'rgba(212,255,64,0.18)', color: '#fff' },
  dot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0, transition: 'transform 0.2s var(--ease-out)' },
  // Issue #43: border-based spinner replaces the container dot while the tab is loading
  spinner: {
    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
    border: '2px solid rgba(255,255,255,0.25)', borderTopColor: '#fff',
    animation: 'tony-spin 0.8s linear infinite',
  },
  close: { marginLeft: 6, opacity: 0, cursor: 'pointer', fontSize: 11, transition: 'opacity 0.15s ease', padding: '0 2px', borderRadius: 4 },
  closeHover: { opacity: 1 },
  plus: {
    padding: '4px 12px', background: 'transparent', border: 'none', borderRadius: 8,
    cursor: 'pointer', color: 'rgba(255,255,255,0.8)', fontSize: 16, lineHeight: 1,
    transition: 'background 0.2s var(--ease-out), transform 0.15s var(--ease-out)',
  },
}

export default function TabBar({ tabs, activeId, onSelect, onClose, onNewTab }: {
  tabs: Tab[]; activeId: string
  onSelect: (id: string) => void; onClose: (id: string) => void
  onNewTab?: () => void
}) {
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [hoverPlus, setHoverPlus] = useState(false)

  return (
    <div style={styles.bar}>
      <button className="apple-focus" style={{ ...styles.plus, ...(hoverPlus ? { background: 'rgba(255,255,255,0.1)', transform: 'scale(1.08)' } : {}) }}
        title="Tab mới (Ctrl+T)" onClick={() => onNewTab?.()}
        onMouseEnter={() => setHoverPlus(true)} onMouseLeave={() => setHoverPlus(false)}>+</button>
      {tabs.map(t => (
        <button
          key={t.id}
          className="apple-focus"
          style={{
            ...styles.tab,
            ...(t.id === activeId ? styles.active : {}),
            ...(hoverId === t.id && t.id !== activeId ? { background: 'rgba(255,255,255,0.08)' } : {}),
          }}
          onClick={() => onSelect(t.id)}
          onMouseEnter={() => setHoverId(t.id)}
          onMouseLeave={() => setHoverId(null)}
          title={t.url}
        >
          <span style={t.loading ? styles.spinner : { ...styles.dot, background: CONTAINER_COLORS[t.container ?? 'default'] ?? '#6b7280' }} />
          {t.title}
          <span style={{ ...styles.close, ...(hoverId === t.id || t.id === activeId ? styles.closeHover : {}) }}
            onClick={(e) => { e.stopPropagation(); onClose(t.id) }}>✕</span>
        </button>
      ))}
    </div>
  )
}