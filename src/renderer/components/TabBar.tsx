import React from 'react'

interface Tab { id: string; title: string; url: string }

const styles: Record<string, React.CSSProperties> = {
  bar: {
    display: 'flex', gap: 6, padding: '8px 10px', background: '#1a1d24',
    borderBottom: '1px solid #2a2e39', overflowX: 'auto', minHeight: 42,
  },
  tab: {
    padding: '6px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
    background: '#2a2e39', color: '#c9ced8', whiteSpace: 'nowrap', maxWidth: 200,
    overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 0,
  },
  active: { background: '#3b5bdb', color: '#fff' },
  close: { marginLeft: 8, opacity: 0.6, cursor: 'pointer' },
  plus: { padding: '6px 12px', background: 'transparent', border: '1px solid #2a2e38', borderRadius: 8, cursor: 'pointer', color: '#9aa1ad' },
}

export default function TabBar({ tabs, activeId, onSelect, onClose }: {
  tabs: TabItem[]; activeId: string
  onSelect: (id: string) => void; onClose: (id: string) => void
}) {
  return (
    <div style={styles.bar}>
      {tabs.map(t => (
        <div key={t.id} style={{ ...styles.tab, ...(t.id === activeId ? styles.active : {}) }}
          onClick={() => onSelect(t.id)}>
          {t.title}
          <span style={styles.close} onClick={(e) => { e.stopPropagation(); onClose(t.id) }}>✕</span>
        </div>
      ))}
      <button style={styles.plus} onClick={() => onSelect('new-tab')}>+</button>
    </div>
  )
}