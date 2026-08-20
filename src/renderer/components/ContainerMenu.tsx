import React, { useState } from 'react'
import { CONTAINER_COLORS } from '../../shared/types'

const styles: Record<string, React.CSSProperties> = {
  overlay: { position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.25)', display: 'flex', justifyContent: 'center', paddingTop: 60 },
  menu: {
    background: '#ffffff', borderRadius: 10, padding: 10, width: 320,
    boxShadow: 'none', border: '1px solid #e7e7e7',
  },
  title: { padding: '8px 12px', fontSize: 13, fontWeight: 600, color: '#141414', fontFamily: 'var(--font-display)', letterSpacing: '-0.2px' },
  item: {
    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 16,
    cursor: 'pointer', fontSize: 13, color: '#141414', transition: 'background 0.1s', fontWeight: 500,
    fontFamily: 'var(--font-body)',
  },
  dot: { width: 10, height: 10, borderRadius: '50%' },
}

const ITEMS = [
  { id: 'default', label: 'Default' },
  { id: 'work', label: 'Work' },
  { id: 'personal', label: 'Personal' },
  { id: 'banking', label: 'Banking' },
  { id: 'social', label: 'Social' },
]

export default function ContainerMenu({ onPick, onClose }: {
  onPick: (url: string, container: string) => void
  onClose: () => void
}) {
  const [hoverId, setHoverId] = useState<string | null>(null)
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.menu} onClick={e => e.stopPropagation()}>
        <div style={styles.title}>Open new tab in container</div>
        {ITEMS.map(i => (
          <div key={i.id}
            style={{ ...styles.item, ...(hoverId === i.id ? { background: '#f4eee5' } : {}) }}
            onClick={() => onPick('', i.id)}
            onMouseEnter={() => setHoverId(i.id)} onMouseLeave={() => setHoverId(null)}>
            <span style={{ ...styles.dot, background: CONTAINER_COLORS[i.id] ?? '#6b7280' }} />
            {i.label}
          </div>
        ))}
      </div>
    </div>
  )
}
