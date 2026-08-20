import React, { useEffect } from 'react'
import { SHORTCUT_GROUPS } from '../shortcuts'

// Issue #116 — full shortcut reference overlay, opened by pressing `?` or the
// "Keyboard shortcuts" palette command. Style follows SearchOverlay/SavedPages:
// fixed dark backdrop + frosted panel. Esc or backdrop click closes it.
const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 260, background: 'rgba(0,0,0,0.5)',
    display: 'flex', justifyContent: 'center', paddingTop: '10vh',
  },
  box: {
    width: 540, maxHeight: '70vh', overflow: 'auto',
    background: 'rgba(28,28,30,0.98)', borderRadius: 16,
    boxShadow: 'rgba(0,0,0,0.5) 0 20px 60px', border: '1px solid rgba(255,255,255,0.1)',
    backdropFilter: 'saturate(180%) blur(30px)',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)',
    position: 'sticky', top: 0, background: 'rgba(28,28,30,0.98)',
  },
  title: { fontSize: 15, fontWeight: 600, color: '#fff', letterSpacing: '-0.12px' },
  closeBtn: {
    background: 'rgba(255,255,255,0.1)', border: 'none', color: 'rgba(255,255,255,0.8)',
    borderRadius: 8, width: 26, height: 26, cursor: 'pointer', fontSize: 13, lineHeight: 1,
  },
  group: { padding: '10px 18px 4px', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.4px', textTransform: 'uppercase' as const },
  row: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '7px 18px', fontSize: 13, color: 'rgba(255,255,255,0.85)',
  },
  kbd: {
    fontSize: 11, color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 4, padding: '1px 6px', background: 'rgba(255,255,255,0.06)',
  },
}

export default function ShortcutsOverlay({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div style={styles.overlay} onClick={onClose} data-testid="shortcuts-backdrop">
      <div style={styles.box} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <span style={styles.title}>⌨️ Keyboard Shortcuts</span>
          <button className="apple-focus" style={styles.closeBtn} onClick={onClose} title="Close">✕</button>
        </div>
        {SHORTCUT_GROUPS.map(g => (
          <div key={g.title}>
            <div style={styles.group}>{g.title}</div>
            {g.items.map(s => (
              <div key={s.label} style={styles.row}>
                <span>{s.label}</span>
                <span style={styles.kbd}>{s.keys}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
