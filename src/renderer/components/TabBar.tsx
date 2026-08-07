import React from 'react'

interface Tab { id: string; title: string; url: string }

const styles: Record<string, React.CSSProperties> = {
  bar: {
    display: 'flex', gap: 6, padding: '8px 12px', minHeight: 44,
    background: 'var(--apple-glass)',
    backdropFilter: 'saturate(180%) blur(20px)',
    WebkitBackdropFilter: 'saturate(180%) blur(20px)',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    alignItems: 'center', overflowX: 'auto',
  },
  tab: {
    padding: '5px 14px', borderRadius: 8, fontSize: 12, fontWeight: 400,
    cursor: 'pointer', background: 'transparent', color: 'rgba(255,255,255,0.8)',
    whiteSpace: 'nowrap', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis',
    flexShrink: 0, letterSpacing: '-0.12px', border: 'none', transition: 'background 0.15s ease',
  },
  active: { background: 'rgba(255,255,255,0.16)', color: '#fff' },
  close: { marginLeft: 8, opacity: 0.5, cursor: 'pointer', fontSize: 11 },
  plus: {
    padding: '4px 12px', background: 'transparent', border: 'none', borderRadius: 8,
    cursor: 'pointer', color: 'rgba(255,255,255,0.8)', fontSize: 16, lineHeight: 1,
  },
}

export default function TabBar({ tabs, activeId, onSelect, onClose }: {
  tabs: Tab[]; activeId: string
  onSelect: (id: string) => void; onClose: (id: string) => void
}) {
  return (
    <div style={styles.bar}>
      <button className="apple-focus" style={styles.plus} title="Tab mới" onClick={() => onSelect('new-tab')}>+</button>
      {tabs.map(t => (
        <button
          key={t.id}
          className="apple-focus"
          style={{ ...styles.tab, ...(t.id === activeId ? styles.active : {}) }}
          onClick={() => onSelect(t.id)}
          title={t.url}
        >
          {t.title}
          <span style={styles.close} onClick={(e) => { e.stopPropagation(); onClose(t.id) }}>✕</span>
        </button>
      ))}
    </div>
  )
}