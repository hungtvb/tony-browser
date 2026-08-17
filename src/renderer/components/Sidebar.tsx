import React, { useEffect, useState } from 'react'
import { CONTAINER_COLORS, GroupedTabInfo, TabSessionInfo, TabState } from '../../shared/types'

// Issue #87 — smarttab IPC family now has a real renderer consumer: the "Spaces"
// panel below the tab list. Mode toggle (domain/theme) renders grouped tabs via
// smarttab.groups(); session actions call smarttab.saveSession / sessions /
// restoreSession (restored tabs are opened through tabs.open). All labels are
// English (repo language rule). Falls back to the flat list when groups are empty.

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    display: 'flex', flexDirection: 'column', width: 220, background: 'rgba(20,20,22,0.95)',
    backdropFilter: 'saturate(180%) blur(20px)',
    WebkitBackdropFilter: 'saturate(180%) blur(20px)',
    borderRight: '1px solid rgba(255,255,255,0.08)',
    padding: '8px 8px 0', gap: 2, overflowY: 'auto', flexShrink: 0,
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '6px 10px 10px', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.6)',
    letterSpacing: '-0.12px',
  },
  newBtn: {
    width: 24, height: 24, borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.1)',
    color: '#fff', cursor: 'pointer', fontSize: 15, lineHeight: 1,
  },
  tab: {
    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 10,
    cursor: 'pointer', fontSize: 12, color: 'rgba(255,255,255,0.75)', overflow: 'hidden',
    letterSpacing: '-0.08px', transition: 'background 0.12s', border: 'none', background: 'transparent',
    textAlign: 'left', width: '100%',
  },
  active: { background: 'rgba(255,255,255,0.14)', color: '#fff' },
  dot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  title: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  close: { opacity: 0.4, cursor: 'pointer', fontSize: 11, flexShrink: 0, color: 'rgba(255,255,255,0.8)' },
  // Issue #87 — Spaces panel
  spacesHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6,
    padding: '8px 10px 4px', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.45)',
    letterSpacing: '0.4px', textTransform: 'uppercase',
  },
  modeRow: { display: 'flex', gap: 4, padding: '0 10px 6px' },
  modeBtn: {
    flex: 1, border: 'none', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.65)',
    borderRadius: 7, padding: '3px 0', fontSize: 11, cursor: 'pointer',
  },
  modeActive: { background: 'rgba(255,255,255,0.14)', color: '#fff' },
  groupLabel: {
    padding: '6px 10px 2px', fontSize: 10.5, fontWeight: 600, color: 'rgba(255,255,255,0.4)',
    letterSpacing: '0.2px', textTransform: 'uppercase',
  },
  spacer: { flex: 1, minHeight: 4 },
  sessionRow: { display: 'flex', gap: 4, padding: '0 10px 6px' },
  sessionBtn: {
    flex: 1, border: 'none', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.65)',
    borderRadius: 7, padding: '4px 0', fontSize: 11, cursor: 'pointer',
  },
  sessionInput: {
    flex: 1, minWidth: 0, border: 'none', background: 'rgba(255,255,255,0.08)', color: '#fff',
    borderRadius: 7, padding: '4px 8px', fontSize: 11, outline: 'none',
  },
  sessionItem: {
    display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 8,
    fontSize: 11, color: 'rgba(255,255,255,0.75)',
  },
  sessionName: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  restoreBtn: {
    flexShrink: 0, border: 'none', background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)',
    borderRadius: 6, padding: '2px 7px', fontSize: 10, cursor: 'pointer',
  },
  sessionEmpty: { padding: '6px 10px 8px', fontSize: 11, color: 'rgba(255,255,255,0.35)' },
  // Issue #125 — drop target indicator: top accent line on the hovered row
  dragOver: { boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.55)' },
}

export default function Sidebar({ tabs, activeId, onSelect, onClose, onNewTab, onReorder, onMoveToContainer, dragDisabled }: {
  tabs: TabState[]; activeId: string
  onSelect: (id: string) => void; onClose: (id: string) => void
  onNewTab: () => void
  // Issue #125 — drag & drop reorder: called with (draggedId, targetId) on drop
  onReorder?: (fromId: string, toId: string) => void
  // Issue #140 — drag & drop Phase 2: move tab to another container (drop on a group header)
  onMoveToContainer?: (fromId: string, container: string) => void
  dragDisabled?: boolean
}) {
  // Issue #87 — Spaces grouping state (domain/theme) + session list
  const [mode, setMode] = useState<'domain' | 'theme'>('domain')
  const [groups, setGroups] = useState<GroupedTabInfo[] | null>(null)
  const [showSessions, setShowSessions] = useState(false)
  const [sessions, setSessions] = useState<TabSessionInfo[]>([])
  const [sessionName, setSessionName] = useState('')
  // Issue #125 — drag state (dragged tab id + row currently hovered for the indicator)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  // Issue #140 — group header currently hovered (move-to-container target)
  const [dragOverGroup, setDragOverGroup] = useState<string | null>(null)

  const refreshSessions = () => {
    window.tony?.smarttab.sessions().then(setSessions).catch(() => setSessions([]))
  }

  // Issue #125 — refetch groups when the tab ORDER/membership changes (open/close/reorder),
  // not on every title/loading broadcast: the signature only tracks ids in order.
  const orderKey = tabs.map(t => t.id).join(',')

  useEffect(() => {
    window.tony?.smarttab.groups(mode).then(setGroups).catch(err => {
      console.warn('smarttab.groups failed:', err)
      setGroups([])
    })
  }, [mode, orderKey])

  useEffect(() => {
    refreshSessions()
  }, [])

  const saveSession = () => {
    const name = sessionName.trim() || undefined
    window.tony?.smarttab.saveSession(name)
      .then(() => refreshSessions())
      .catch(err => console.warn('smarttab.saveSession failed:', err))
    setSessionName('')
  }

  const restore = (name: string) => {
    window.tony?.smarttab.restoreSession(name).then(opened => {
      opened.forEach(t => window.tony?.tabs.open(t.url))
    }).catch(err => console.warn('smarttab.restoreSession failed:', err))
  }

  // Issue #125 — HTML5 drag & drop handlers for tab rows
  const onDragStart = (e: React.DragEvent, id: string) => {
    if (dragDisabled) { e.preventDefault(); return }
    setDragId(id)
    try {
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('text/plain', id)
    } catch { /* jsdom/tests may lack a real DataTransfer */ }
  }

  const onDragOver = (e: React.DragEvent, id: string) => {
    if (!dragId || dragId === id) return
    e.preventDefault() // allow the drop
    try { e.dataTransfer.dropEffect = 'move' } catch {}
    setDragOverId(id)
  }

  const onDrop = (e: React.DragEvent, id: string) => {
    e.preventDefault()
    let from = dragId
    if (!from) {
      try { from = e.dataTransfer.getData('text/plain') || null } catch { from = null }
    }
    setDragId(null)
    setDragOverId(null)
    setDragOverGroup(null)
    if (from && from !== id) onReorder?.(from, id)
  }

  // Issue #140 — drop ON a group header moves the dragged tab into that
  // container. The header carries the container name of its first tab; only
  // fires when the dragged tab is NOT already in that container.
  const onGroupDragOver = (e: React.DragEvent, container: string) => {
    if (!dragId) return
    e.preventDefault()
    try { e.dataTransfer.dropEffect = 'move' } catch {}
    setDragOverGroup(container)
  }

  const onGroupDrop = (e: React.DragEvent, container: string) => {
    e.preventDefault()
    let from = dragId
    if (!from) {
      try { from = e.dataTransfer.getData('text/plain') || null } catch { from = null }
    }
    setDragId(null)
    setDragOverId(null)
    setDragOverGroup(null)
    if (from) onMoveToContainer?.(from, container)
  }

  const endDrag = () => {
    setDragId(null)
    setDragOverId(null)
    setDragOverGroup(null)
  }

  // Flat list fallback: groups fetch may resolve empty (no tabs / grouping no-op)
  const list = groups && groups.length > 0 ? groups : [{ label: '', tabs }]

  return (
    <div style={styles.sidebar}>
      <div style={styles.header}>
        <span>☰ Spaces</span>
        <button className="apple-focus" style={styles.newBtn} onClick={onNewTab} title="New Tab">+</button>
      </div>
      <div style={styles.modeRow}>
        <button className="apple-focus" style={{ ...styles.modeBtn, ...(mode === 'domain' ? styles.modeActive : {}) }} onClick={() => setMode('domain')}>By domain</button>
        <button className="apple-focus" style={{ ...styles.modeBtn, ...(mode === 'theme' ? styles.modeActive : {}) }} onClick={() => setMode('theme')}>By theme</button>
      </div>
      {tabs.length === 0 && (
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, padding: '12px 10px' }}>No tabs yet</div>
      )}
      {list.map(g => {
        const container = g.tabs[0]?.container ?? 'default'
        return (
        <React.Fragment key={g.label || 'flat'}>
          {g.label && (
            <div style={{
              ...styles.groupLabel,
              // Issue #140 — group header is a drop target: moving a tab here
              // reassigns it to this group's container
              ...(dragOverGroup === container ? styles.dragOver : {}),
            }}
              onDragOver={e => onGroupDragOver(e, container)}
              onDrop={e => onGroupDrop(e, container)}
              onDragLeave={endDrag}
            >
              {g.label}
            </div>
          )}
          {g.tabs.map(t => (
            <button key={t.id} className="apple-focus"
              draggable={!dragDisabled}
              onDragStart={e => onDragStart(e, t.id)}
              onDragOver={e => onDragOver(e, t.id)}
              onDrop={e => onDrop(e, t.id)}
              onDragEnd={endDrag}
              onDragLeave={endDrag}
              style={{
                ...styles.tab,
                ...(t.id === activeId ? styles.active : {}),
                // Issue #125 — insertion indicator on the row being hovered
                ...(dragOverId === t.id ? styles.dragOver : {}),
              }}
              onClick={() => onSelect(t.id)} title={t.url}>
              <span style={{ ...styles.dot, background: CONTAINER_COLORS[t.container ?? 'default'] ?? '#6b7280' }} />
              <span style={styles.title}>{t.title}</span>
              <span style={styles.close} onClick={(e) => { e.stopPropagation(); onClose(t.id) }}>✕</span>
            </button>
          ))}
        </React.Fragment>
        )
      })}
      <div style={styles.spacer} />
      <div style={styles.spacesHeader}>
        <span>Sessions</span>
        <button className="apple-focus" style={{ ...styles.sessionBtn, flex: '0 0 auto', padding: '2px 8px' }} onClick={() => setShowSessions(s => !s)}>
          {showSessions ? 'Hide' : 'Show'}
        </button>
      </div>
      {showSessions && (
        <div>
          <div style={styles.sessionRow}>
            <input className="apple-focus" style={styles.sessionInput} placeholder="Session name (optional)"
              value={sessionName} onChange={e => setSessionName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveSession() }} />
            <button className="apple-focus" style={styles.sessionBtn} title="Save session"
              onClick={saveSession}>Save</button>
          </div>
          {sessions.length === 0 && <div style={styles.sessionEmpty}>No saved sessions</div>}
          {sessions.map(s => (
            <div key={s.name} style={styles.sessionItem}>
              <span style={styles.sessionName} title={s.name}>{s.name}</span>
              <button className="apple-focus" style={styles.restoreBtn} title="Restore" onClick={() => restore(s.name)}>Restore</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
