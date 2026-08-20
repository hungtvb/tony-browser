import React, { useEffect, useState } from 'react'
import UIcon from './UIcon'
// Issue #121 — hidden-window perf: while the window is hidden the sleeper poll
// slows 3x and an immediate evaluate fires on show (visible again).
import { isDocumentHidden, sleeperPollMs } from '../../shared/perf-visibility'

const styles: Record<string, React.CSSProperties> = {
  // Aaply: chips float on the gray canvas — white pills, hairline borders
  bar: {
    display: 'flex', gap: 6, padding: '8px 14px 4px',
    background: 'transparent', alignItems: 'center',
  },
  chip: {
    padding: '4px 12px', borderRadius: 52, fontSize: 11, cursor: 'pointer',
    border: '1px solid rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.66)',
    backdropFilter: 'blur(14px) saturate(1.3)', WebkitBackdropFilter: 'blur(14px) saturate(1.3)',
    color: '#141414', transition: 'all 0.15s ease',
    display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500, fontFamily: 'var(--font-body)',
  },
  chipStatic: {
    padding: '4px 12px', borderRadius: 52, fontSize: 11, border: '1px solid rgba(255,255,255,0.6)',
    background: 'rgba(255,255,255,0.66)',
    backdropFilter: 'blur(14px) saturate(1.3)', WebkitBackdropFilter: 'blur(14px) saturate(1.3)',
    color: '#6e6e6e',
    display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500, fontFamily: 'var(--font-body)',
  },
  active: { background: '#94e130', borderColor: '#94e130', color: '#141414', fontWeight: 600, backdropFilter: 'none', WebkitBackdropFilter: 'none' },
  warn: { background: '#94e130', borderColor: '#94e130', color: '#141414', fontWeight: 600, backdropFilter: 'none', WebkitBackdropFilter: 'none' },
  brand: {
    marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 7,
    fontSize: 12, fontWeight: 600, color: '#141414', fontFamily: 'var(--font-display)', letterSpacing: '-0.2px',
    padding: '4px 12px', borderRadius: 52, background: 'rgba(255,255,255,0.66)', border: '1px solid rgba(255,255,255,0.6)',
    backdropFilter: 'blur(14px) saturate(1.3)', WebkitBackdropFilter: 'blur(14px) saturate(1.3)', userSelect: 'none',
  },
  brandMark: {
    width: 14, height: 14, borderRadius: 5, background: '#94e130',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#141414', fontSize: 10, fontWeight: 600, fontFamily: 'var(--font-body)', lineHeight: 1,
  },
brandVer: { fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 400, marginLeft: 2, fontFamily: 'var(--font-body)' },
  popover: {
    position: 'absolute', top: 34, left: 14, zIndex: 90,
    background: 'rgba(24,26,22,0.96)', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 10, padding: 12, minWidth: 280, boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
  },
  section: { marginBottom: 10 },
  sectionTitle: { fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.4px', color: 'rgba(255,255,255,0.5)', margin: '0 0 6px' },
  row: { display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 },
  rowInput: {
    flex: 1, padding: '3px 8px', borderRadius: 6, fontSize: 11, border: 'none',
    background: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.9)', outline: 'none',
  },
  addRow: { display: 'flex', gap: 6, alignItems: 'center' },
  addInput: {
    flex: 1, padding: '3px 8px', borderRadius: 6, fontSize: 11, border: 'none',
    background: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.9)', outline: 'none',
  },
  miniBtn: {
    padding: '3px 9px', borderRadius: 6, fontSize: 11, border: 'none', cursor: 'pointer',
    background: 'rgba(255,255,255,0.14)', color: 'rgba(255,255,255,0.85)',
  },
  removeBtn: {
    padding: '1px 7px', borderRadius: 6, fontSize: 11, border: 'none', cursor: 'pointer',
    background: 'rgba(255,69,58,0.25)', color: '#ff6961',
  },
  saveRow: { display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 8 },
}

export default function FeatureBar({ layout, onToggleLayout, warnedIds, onWarned, focusOn, onToggleFocus }: {
  layout: 'top' | 'side'
  onToggleLayout: () => void
  warnedIds: string[]
  onWarned: (ids: string[]) => void
  focusOn: boolean
  onToggleFocus: () => void
}) {
  const [sleeping, setSleeping] = useState(0)
  // Issue #92 — focus blocklist/whitelist editor (Option A: wire the UI).
  // Loaded from focus.state(); saved via focus.setBlocklist/setWhitelist.
  const [editorOpen, setEditorOpen] = useState(false)
  const [blocklist, setBlocklist] = useState<string[]>([])
  const [whitelist, setWhitelist] = useState<string[]>([])
  const [blockDraft, setBlockDraft] = useState('')
  const [whiteDraft, setWhiteDraft] = useState('')
  // lists as loaded from focus.state() — Save persists only if edited
  const [loadedBlock, setLoadedBlock] = useState<string[]>([])
  const [loadedWhite, setLoadedWhite] = useState<string[]>([])

  const openEditor = () => {
    window.tony?.focus.state().then(s => {
      setBlocklist(s.blocklist ?? [])
      setWhitelist(s.whitelist ?? [])
      setLoadedBlock(s.blocklist ?? [])
      setLoadedWhite(s.whitelist ?? [])
    }).catch(() => {})
    setEditorOpen(true)
  }

  const saveLists = () => {
    const norm = (d: string) => d.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '')
    const blockNext = [...blocklist, ...(blockDraft ? [norm(blockDraft)] : [])].filter(Boolean)
    const whiteNext = [...whitelist, ...(whiteDraft ? [norm(whiteDraft)] : [])].filter(Boolean)
    if (blockNext.join() !== loadedBlock.join()) window.tony?.focus.setBlocklist(blockNext).catch(() => {})
    if (whiteNext.join() !== loadedWhite.join()) window.tony?.focus.setWhitelist(whiteNext).catch(() => {})
    setEditorOpen(false)
  }

  useEffect(() => {
    // Issue #121 — hidden-window guard: while the window is hidden (document.hidden),
    // skip the sleeper evaluate body entirely (no IPC wake for memory sampling) and
    // slow the poll cadence 3x (10s -> 30s). On becoming visible again, run one
    // immediate evaluate so the "N tabs asleep" chip refreshes right away.
    let iv: ReturnType<typeof setInterval> | null = null
    const startPoll = () => {
      if (iv) clearInterval(iv)
      iv = setInterval(() => {
        if (isDocumentHidden(document)) return
        window.tony?.sleeper.evaluate().then(r => {
          setSleeping(r.sleeping)
          // Issue #72 — polled warnings kept as a fallback; the authoritative warned-id
          // set arrives via the proactive 'sleeper:warnings' event below (onWarned).
          onWarned(r.warnings)
        }).catch(() => {})
      }, sleeperPollMs(isDocumentHidden(document)))
    }
    const onVisibility = () => {
      if (isDocumentHidden(document)) {
        // hidden → restart the timer with the slow cadence (no immediate work)
        startPoll()
      } else {
        // shown → refresh the chip immediately, then resume the fast cadence
        window.tony?.sleeper.evaluate().then(r => {
          setSleeping(r.sleeping)
          onWarned(r.warnings)
        }).catch(() => {})
        startPoll()
      }
    }
    startPoll()
    // Issue #72 — proactive event: fires the moment the warned set changes in main,
    // so a heavy tab is highlighted immediately instead of waiting for the next poll.
    // onWarnings returns an unsubscribe fn — call it in cleanup so a re-mounted
    // FeatureBar never leaks a second 'sleeper:warnings' listener.
    const offWarnings = window.tony?.sleeper.onWarnings(onWarned)
    document.addEventListener('visibilitychange', onVisibility)
    return () => { if (iv) clearInterval(iv); offWarnings?.(); document.removeEventListener('visibilitychange', onVisibility) }
  }, [onWarned])

  return (
    <div style={styles.bar}>
      <button className="apple-focus" style={{ ...styles.chip, ...(focusOn ? styles.active : {}) }} onClick={onToggleFocus}>
        <UIcon name="focus" size={13} /> {focusOn ? 'Focus On' : 'Focus Off'}
      </button>
      <button className="apple-focus" style={styles.chip} onClick={openEditor} title="Edit focus lists">
        <UIcon name="settings" size={13} /> Lists
      </button>
      {editorOpen && (
        <div style={styles.popover} data-testid="focus-editor">
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Blocklist</div>
            {blocklist.map((d, i) => (
              <div key={`b-${i}`} style={styles.row}>
                <input style={styles.rowInput} value={d} readOnly />
                <button style={styles.removeBtn} title="Remove domain" onClick={() => setBlocklist(blocklist.filter((_, j) => j !== i))}>✕</button>
              </div>
            ))}
            <div style={styles.addRow}>
              <input style={styles.addInput} placeholder="Add blocklist domain" value={blockDraft}
                onChange={e => setBlockDraft(e.target.value)} />
              <button style={styles.miniBtn} onClick={() => { setBlocklist([...blocklist, blockDraft.trim()]); setBlockDraft('') }}>Add</button>
            </div>
          </div>
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Whitelist</div>
            {whitelist.map((d, i) => (
              <div key={`w-${i}`} style={styles.row}>
                <input style={styles.rowInput} value={d} readOnly />
                <button style={styles.removeBtn} title="Remove domain" onClick={() => setWhitelist(whitelist.filter((_, j) => j !== i))}>✕</button>
              </div>
            ))}
            <div style={styles.addRow}>
              <input style={styles.addInput} placeholder="Add whitelist domain" value={whiteDraft}
                onChange={e => setWhiteDraft(e.target.value)} />
              <button style={styles.miniBtn} onClick={() => { setWhitelist([...whitelist, whiteDraft.trim()]); setWhiteDraft('') }}>Add</button>
            </div>
          </div>
          <div style={styles.saveRow}>
            <button style={styles.miniBtn} onClick={() => setEditorOpen(false)}>Cancel</button>
            <button style={{ ...styles.miniBtn, background: 'var(--apple-blue)', color: '#0a0a0a' }} onClick={saveLists}>Save</button>
          </div>
        </div>
      )}
      <span style={styles.chipStatic}><UIcon name="sleep" size={13} /> {sleeping} tabs asleep</span>
      {warnedIds.length > 0 && <span style={{ ...styles.chipStatic, ...styles.warn }}><UIcon name="lock" size={13} /> {warnedIds.length} RAM-heavy tabs</span>}
      <button className="apple-focus" style={styles.chip} onClick={onToggleLayout} title="Switch tab layout">
        <UIcon name="layout" size={13} /> {layout === 'side' ? 'Vertical' : 'Horizontal'}
      </button>
      <span style={styles.brand} title="Tony Browser">
        <span style={styles.brandMark}>T</span>
        Tony Browser<span style={styles.brandVer}>v0.12</span>
      </span>
    </div>
  )
}
