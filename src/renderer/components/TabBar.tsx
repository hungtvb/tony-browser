import React, { useRef, useState } from 'react'
import { CONTAINER_COLORS } from '../../shared/types'
import UIcon from './UIcon'
import { isMiddleClickClose, wheelDeltaToDirection, nextTabId, createWheelGate } from '../tabGestures'

interface Tab { id: string; title: string; url: string; favicon?: string; loading?: boolean; container?: string }

const styles: Record<string, React.CSSProperties> = {
  // Aaply: floating white card on gray canvas — rounded, one soft shadow
  bar: {
    display: 'flex', gap: 4, padding: '8px 12px', minHeight: 48,
    background: 'rgba(255,255,255,0.66)', borderRadius: 10, boxShadow: 'none',
    backdropFilter: 'blur(18px) saturate(1.3)', WebkitBackdropFilter: 'blur(18px) saturate(1.3)',
    alignItems: 'center', overflowX: 'auto', margin: '8px 12px 0', border: '1px solid rgba(255,255,255,0.55)',
  },
  tab: {
    padding: '6px 12px', borderRadius: 52, fontSize: 12, fontWeight: 500,
    cursor: 'pointer', background: 'transparent', color: '#141414',
    whiteSpace: 'nowrap', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis',
    flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6,
    transition: 'background 0.15s var(--ease-out), transform 0.15s var(--ease-out)',
    border: 'none', fontFamily: 'var(--font-body)',
  },
  active: { background: '#94e130', color: '#141414', fontWeight: 600 },
  dot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0, transition: 'transform 0.2s var(--ease-out)' },
  favicon: { width: 16, height: 16, borderRadius: 4, flexShrink: 0, objectFit: 'contain', background: '#f4eee5' },
  miniDot: { width: 4, height: 4, borderRadius: '50%', flexShrink: 0, position: 'absolute', right: -1, bottom: -1, border: '1px solid #fff' },
  faviconWrap: { position: 'relative', display: 'inline-flex', flexShrink: 0 },
  spinner: {
    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
    border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#141414',
    animation: 'tony-spin 0.8s linear infinite',
  },
  close: { marginLeft: 6, opacity: 0, cursor: 'pointer', fontSize: 11, transition: 'opacity 0.15s ease', padding: '0 2px', borderRadius: 4 },
  closeHover: { opacity: 1 },
  ramBadge: {
    fontSize: 10, fontWeight: 500, color: '#ffffff', background: '#94e130',
    borderRadius: 52, padding: '1px 7px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 3,
  },
  plus: {
    padding: '5px 14px', background: '#ffffff', border: '1px solid #e7e7e7', borderRadius: 5,
    cursor: 'pointer', color: '#141414', fontSize: 16, lineHeight: 1, fontWeight: 500,
    transition: 'background 0.15s var(--ease-out), transform 0.15s var(--ease-out)',
  },
}

export default function TabBar({ tabs, activeId, warnedIds, onSelect, onClose, onNewTab }: {
  tabs: Tab[]; activeId: string
  warnedIds?: string[]
  onSelect: (id: string) => void; onClose: (id: string) => void
  onNewTab?: () => void
}) {
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [hoverPlus, setHoverPlus] = useState(false)
  const wheelGate = useRef(createWheelGate(150))

  const handleWheel = (e: React.WheelEvent) => {
    const dir = wheelDeltaToDirection(e)
    if (!dir || !wheelGate.current()) return
    e.preventDefault()
    const next = nextTabId(tabs.map(t => t.id), activeId, dir)
    if (next && next !== activeId) onSelect(next)
  }

  return (
    <div style={styles.bar} onWheel={handleWheel}>
      <button className="apple-focus" style={{ ...styles.plus, ...(hoverPlus ? { background: '#94e130', borderColor: '#94e130', transform: 'scale(1.05)' } : {}) }}
        title="New Tab (Ctrl+T)" onClick={() => onNewTab?.()}
        onMouseEnter={() => setHoverPlus(true)} onMouseLeave={() => setHoverPlus(false)}>+</button>
      {tabs.map(t => (
        <button
          key={t.id}
          className="apple-focus"
          style={{
            ...styles.tab,
            ...(t.id === activeId ? styles.active : {}),
            ...(hoverId === t.id && t.id !== activeId ? { background: '#f4eee5' } : {}),
          }}
          onClick={() => onSelect(t.id)}
          onAuxClick={(e) => {
            if (isMiddleClickClose(e)) {
              e.preventDefault()
              onClose(t.id)
            }
          }}
          onMouseEnter={() => setHoverId(t.id)}
          onMouseLeave={() => setHoverId(null)}
          title={t.url}
        >
          {t.loading ? (
            <span style={styles.spinner} />
          ) : t.favicon ? (
            <span style={styles.faviconWrap}>
              <img src={t.favicon} style={styles.favicon} alt="" draggable={false}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
              <span style={{ ...styles.miniDot, background: CONTAINER_COLORS[t.container ?? 'default'] ?? '#6b7280' }} />
            </span>
          ) : (
            <span style={{ ...styles.dot, background: CONTAINER_COLORS[t.container ?? 'default'] ?? '#6b7280' }} />
          )}
          {t.title}
          {(warnedIds ?? []).includes(t.id) && <span style={styles.ramBadge} title="Heavy tab — high RAM usage"><UIcon name="lock" size={10} color="#ffffff" /> RAM</span>}
          <span style={{ ...styles.close, ...(hoverId === t.id || t.id === activeId ? styles.closeHover : {}) }}
            onClick={(e) => { e.stopPropagation(); onClose(t.id) }}><UIcon name="close" size={11} /></span>
        </button>
      ))}
    </div>
  )
}
