import React, { useEffect, useState } from 'react'
import { CONTAINER_COLORS } from '../../shared/types'

interface Tab { id: string; title: string; url: string; container?: string }

// Issue #87 — smarttab IPC family now has a real renderer consumer: the "Spaces"
// panel below the tab list. Mode toggle (domain/theme) renders grouped tabs via
// smarttab.groups(); session actions call smarttab.saveSession / sessions /
// restoreSession (restored tabs are opened through tabs.open). All labels are
// English (repo language rule). Falls back to the flat list when groups are empty.

interface Group { label: string; tabs: Tab[] }
interface SessionInfo { name: string; createdAt: number; tabs: { url: string; title: string }[] }

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
  modeActive: { background: 'rgba(41,151,255,0.25)', color: '#fff' },
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
}

export default function Sidebar({ tabs, activeId, onSelect, onClose, onNewTab }: {
  tabs: Tab[]; activeId: string
  onSelect: (id: string) => void; onClose: (id: string) => void
  onNewTab: () => void
}) {
  // Issue #87 — Spaces grouping state (domain/theme) + session list
  const [mode, setMode] = useState<'domain' | 'theme'>('domain')
  const [groups, setGroups] = useState<Group[] | null>(null)
  const [showSessions, setShowSessions] = useState(false)
  const [sessions, setSessions] = useState<SessionInfo[]>([])
  const [sessionName, setSessionName] = useState('')

  useEffect(() => {
    window.tony?.smarttab.groups(mode).then(setGroups).catch(() => setGroups([]))
  }, [mode])

  useEffect(() => {
    window.tony?.smarttab.sessions().then(setSessions).catch(() => setSessions([]))
  }, [])

  const restore = (name: string) => {
    window.tony?.smarttab.restoreSession(name).then(opened => {
      opened.forEach(t => window.tony?.tabs.open(t.url))
    }).catch(() => {})
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
      {list.map(g => (
        <React.Fragment key={g.label || 'flat'}>
          {g.label && <div style={styles.groupLabel}>{g.label}</div>}
          {g.tabs.map(t => (
            <button key={t.id} className="apple-focus"
              style={{ ...styles.tab, ...(t.id === activeId ? styles.active : {}) }}
              onClick={() => onSelect(t.id)} title={t.url}>
              <span style={{ ...styles.dot, background: CONTAINER_COLORS[t.container ?? 'default'] ?? '#6b7280' }} />
              <span style={styles.title}>{t.title}</span>
              <span style={styles.close} onClick={(e) => { e.stopPropagation(); onClose(t.id) }}>✕</span>
            </button>
          ))}
        </React.Fragment>
      ))}
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
              onKeyDown={e => { if (e.key === 'Enter') { window.tony?.smarttab.saveSession(sessionName.trim() || undefined); setSessionName('') } }} />
            <button className="apple-focus" style={styles.sessionBtn} title="Save session"
              onClick={() => { window.tony?.smarttab.saveSession(sessionName.trim() || undefined); setSessionName('') }}>Save</button>
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
