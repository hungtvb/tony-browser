import React, { useEffect, useRef, useState } from 'react'
import UIcon from './UIcon'
// Issue #116: static footer shortcut hints so users learn the top shortcuts
// even without a focused palette item.
import { PALETTE_FOOTER_HINTS } from '../shortcuts'

const styles: Record<string, React.CSSProperties> = {
  overlay: { position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.25)', display: 'flex', justifyContent: 'center', paddingTop: '12vh' },
  palette: {
    width: 560, background: 'rgba(255,255,255,0.72)', borderRadius: 40,
    backdropFilter: 'blur(28px) saturate(1.5)', WebkitBackdropFilter: 'blur(28px) saturate(1.5)',
    overflow: 'hidden', border: '1px solid rgba(255,255,255,0.65)',
  },
  input: {
    width: '100%', padding: '16px 22px', background: 'transparent', border: 'none',
    color: '#141414', fontSize: 16, outline: 'none', fontWeight: 400,
    borderBottom: '1px solid #e7e7e7', fontFamily: 'var(--font-body)',
  },
  hint: { padding: '6px 22px', fontSize: 12, color: '#6e6e6e', fontWeight: 400 },
  list: { maxHeight: 340, overflow: 'auto', padding: 8 },
  item: {
    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderRadius: 16,
    cursor: 'pointer', fontSize: 14, color: '#141414', fontWeight: 500, fontFamily: 'var(--font-body)',
  },
  itemActive: { background: '#94e130', color: '#141414', fontWeight: 600 },
  icon: { fontSize: 15, width: 22, textAlign: 'center' as const },
  kbd: { marginLeft: 'auto', fontSize: 11, color: '#6e6e6e', border: '1px solid #e7e7e7', borderRadius: 8, padding: '1px 6px', fontWeight: 500, background: '#fdfcf9' },
}

interface Command {
  id: string
  label: string
  // Issue #114: UIcon name (SVG) instead of raw emoji text
  name: string
  hint?: string
  run: () => void
}

export default function CommandPalette({ commands, onClose }: {
  commands: Command[]
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const [idx, setIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const filtered = commands.filter(c =>
    c.label.toLowerCase().includes(query.toLowerCase()) ||
    (c.hint ?? '').toLowerCase().includes(query.toLowerCase())
  )

  useEffect(() => { setIdx(0) }, [query])

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIdx(i => Math.min(i + 1, filtered.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter' && filtered[idx]) { filtered[idx].run(); onClose() }
    else if (e.key === 'Escape') onClose()
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.palette} onClick={e => e.stopPropagation()}>
        <input ref={inputRef} style={styles.input} placeholder="Type a command or ask AI..." value={query}
          onChange={e => setQuery(e.target.value)} onKeyDown={onKey} />
        <div style={styles.hint}>↑↓ select · Enter run · Esc close</div>
        {/* Issue #116: static shortcut hint row — visible without a focused item */}
        <div style={styles.hint}>
          {PALETTE_FOOTER_HINTS.map((h, i) => (
            <React.Fragment key={h}>
              {i > 0 && <span>  ·  </span>}
              <span>{h}</span>
            </React.Fragment>
          ))}
        </div>
        <div style={styles.list}>
          {filtered.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: '#6e6e6e', fontSize: 13 }}>No matching commands</div>}
          {filtered.map((c, i) => (
            <div key={c.id} style={{ ...styles.item, ...(i === idx ? styles.itemActive : {}) }}
              onMouseEnter={() => setIdx(i)}
              onClick={() => { c.run(); onClose() }}>
<span style={styles.icon}><UIcon name={c.name} size={15} color={i === idx ? '#141414' : 'currentColor'} /></span>
              <span>{c.label}</span>
              {c.hint && <span style={{ ...styles.kbd, ...(i === idx ? { color: '#141414', borderColor: '#141414', background: '#ffffff' } : {}) }}>{c.hint}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
