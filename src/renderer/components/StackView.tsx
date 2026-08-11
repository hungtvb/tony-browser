import React, { useEffect, useRef, useState } from 'react'
import type { TabState } from '../../shared/types'

// Issue #86 — "Stack by domain" view consuming window.tony.tabs.stacks().
// Groups tabs by domain into collapsible stacks; clicking a tab activates it.
interface Stack {
  label: string
  tabs: TabState[]
}

const styles: Record<string, React.CSSProperties> = {
  overlay: { position: 'fixed', inset: 0, zIndex: 250, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', paddingTop: '10vh' },
  box: {
    width: 560, maxHeight: '70vh', display: 'flex', flexDirection: 'column',
    background: 'rgba(28,28,30,0.98)', borderRadius: 16, overflow: 'hidden',
    boxShadow: 'rgba(0,0,0,0.5) 0 20px 60px', border: '1px solid rgba(255,255,255,0.1)',
    backdropFilter: 'saturate(180%) blur(30px)',
  },
  header: {
    padding: '14px 18px', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.9)',
    borderBottom: '1px solid rgba(255,255,255,0.08)', letterSpacing: '-0.12px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  list: { overflow: 'auto', padding: 6 },
  stackHeader: {
    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
    cursor: 'pointer', borderRadius: 10, fontSize: 12, fontWeight: 600,
    color: 'rgba(212,255,64,0.9)', letterSpacing: '-0.1px', userSelect: 'none',
  },
  tab: {
    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px 8px 30px',
    borderRadius: 10, cursor: 'pointer', fontSize: 13, color: 'rgba(255,255,255,0.85)',
  },
  tabHover: { background: 'rgba(255,255,255,0.08)' },
  title: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  url: { fontSize: 11, color: 'rgba(255,255,255,0.4)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  hint: { padding: '6px 18px', fontSize: 11, color: 'rgba(255,255,255,0.4)', borderTop: '1px solid rgba(255,255,255,0.06)' },
  empty: { padding: 32, textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 13 },
}

export default function StackView({ onSelect, onClose }: {
  onSelect: (id: string) => void
  onClose: () => void
}) {
  const [stacks, setStacks] = useState<Stack[]>([])
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [hoverId, setHoverId] = useState<string | null>(null)

  // Issue #86 — fetch fresh stacks on every mount (data can change while closed)
  useEffect(() => {
    let cancelled = false
    window.tony?.tabs.stacks().then(s => {
      if (!cancelled) setStacks(s)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const toggle = (label: string) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }

  return (
    <div style={styles.overlay} data-testid="stack-backdrop" onClick={onClose}>
      <div style={styles.box} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <span>🗂 Stack by domain</span>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>Esc close</span>
        </div>
        <div style={styles.list}>
          {stacks.length === 0 && <div style={styles.empty}>No tabs to stack</div>}
          {stacks.map(s => (
            <div key={s.label}>
              <div style={styles.stackHeader} onClick={() => toggle(s.label)}>
                <span>{collapsed.has(s.label) ? '▸' : '▾'}</span>
                <span>{s.label}</span>
                <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 400 }}>{s.tabs.length}</span>
              </div>
              {!collapsed.has(s.label) && s.tabs.map(t => (
                <div key={t.id} style={{ ...styles.tab, ...(hoverId === t.id ? styles.tabHover : {}) }}
                  onMouseEnter={() => setHoverId(t.id)} onMouseLeave={() => setHoverId(null)}
                  onClick={() => { onSelect(t.id); onClose() }}>
                  <span>🌐</span>
                  <span style={styles.title}>{t.title}</span>
                  <span style={styles.url}>{t.url}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div style={styles.hint}>{stacks.length} stacks · click a tab to activate · click a domain to collapse</div>
      </div>
    </div>
  )
}
