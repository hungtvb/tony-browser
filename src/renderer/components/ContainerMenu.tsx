import React from 'react'
import { CONTAINER_COLORS } from '../../shared/types'

const styles: Record<string, React.CSSProperties> = {
  overlay: { position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', paddingTop: 60 },
  menu: {
    background: 'rgba(30,30,32,0.98)', borderRadius: 14, padding: 8, width: 320,
    boxShadow: 'rgba(0,0,0,0.5) 0 20px 60px', border: '1px solid rgba(255,255,255,0.1)',
  },
  title: { padding: '8px 12px', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.64)', letterSpacing: '-0.12px' },
  item: {
    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10,
    cursor: 'pointer', fontSize: 13, color: '#fff', transition: 'background 0.1s',
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
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.menu} onClick={e => e.stopPropagation()}>
        <div style={styles.title}>Open new tab in container</div>
        {ITEMS.map(i => (
          <div key={i.id} style={styles.item} onClick={() => onPick('', i.id)}>
            <span style={{ ...styles.dot, background: CONTAINER_COLORS[i.id] ?? '#6b7280' }} />
            {i.label}
          </div>
        ))}
      </div>
    </div>
  )
}