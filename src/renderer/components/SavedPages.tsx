import React, { useEffect, useState } from 'react'

// Issue #85 — saved-pages collection UI: reads save.list() on open, renders
// title/url per item and offers a delete button that calls save.remove(id)
// then re-fetches the list. Pattern mirrors SearchOverlay (fixed overlay panel).
interface SavedPage {
  id: string
  url: string
  title: string
  container: string
  savedAt: number
}

const styles: Record<string, React.CSSProperties> = {
  overlay: { position: 'fixed', inset: 0, zIndex: 250, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', paddingTop: '10vh' },
  box: {
    width: 520, background: 'rgba(28,28,30,0.98)', borderRadius: 16, overflow: 'hidden',
    boxShadow: 'rgba(0,0,0,0.5) 0 20px 60px', border: '1px solid rgba(255,255,255,0.1)',
    backdropFilter: 'saturate(180%) blur(30px)',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)',
  },
  title: { fontSize: 15, fontWeight: 600, color: '#fff', letterSpacing: '-0.12px' },
  closeBtn: {
    background: 'rgba(255,255,255,0.1)', border: 'none', color: 'rgba(255,255,255,0.8)',
    borderRadius: 8, width: 26, height: 26, cursor: 'pointer', fontSize: 13, lineHeight: 1,
  },
  list: { maxHeight: 380, overflow: 'auto', padding: 6 },
  item: {
    display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10,
    fontSize: 13, color: 'rgba(255,255,255,0.85)',
  },
  itemTitle: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  url: { fontSize: 11, color: 'rgba(255,255,255,0.4)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  remove: {
    flexShrink: 0, border: 'none', background: 'rgba(255,59,48,0.18)', color: '#ff6b62',
    borderRadius: 8, padding: '4px 10px', fontSize: 11, cursor: 'pointer',
  },
  empty: { padding: 24, textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 13 },
}

export default function SavedPages({ onClose }: { onClose: () => void }) {
  const [pages, setPages] = useState<SavedPage[]>([])

  const load = () => {
    window.tony?.save.list().then(setPages).catch(() => {})
  }

  useEffect(() => {
    load()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const remove = (id: string) => {
    window.tony?.save.remove(id).then(() => load()).catch(() => {})
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.box} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <span style={styles.title}>🔖 Saved Pages</span>
          <button className="apple-focus" style={styles.closeBtn} onClick={onClose} title="Close">✕</button>
        </div>
        <div style={styles.list}>
          {pages.length === 0 && <div style={styles.empty}>No saved pages yet</div>}
          {pages.map(p => (
            <div key={p.id} style={styles.item}>
              <span>🔖</span>
              <span style={styles.itemTitle} title={p.url}>{p.title}</span>
              <span style={styles.url}>{p.url}</span>
              <button className="apple-focus" style={styles.remove} title="Remove" onClick={() => remove(p.id)}>✕ Remove</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
