import React, { useEffect, useRef, useState } from 'react'

const styles: Record<string, React.CSSProperties> = {
  overlay: { position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', paddingTop: '12vh' },
  palette: {
    width: 560, background: 'rgba(28,28,30,0.98)', borderRadius: 16,
    boxShadow: 'rgba(0,0,0,0.5) 0 20px 60px', border: '1px solid rgba(255,255,255,0.1)',
    overflow: 'hidden', backdropFilter: 'saturate(180%) blur(30px)',
  },
  input: {
    width: '100%', padding: '16px 20px', background: 'transparent', border: 'none',
    color: '#fff', fontSize: 16, outline: 'none', letterSpacing: '-0.12px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  },
  hint: { padding: '6px 20px', fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '-0.08px' },
  list: { maxHeight: 340, overflow: 'auto', padding: 6 },
  item: {
    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10,
    cursor: 'pointer', fontSize: 13, color: 'rgba(255,255,255,0.85)',
  },
  itemActive: { background: 'var(--apple-blue)', color: '#fff' },
  icon: { fontSize: 15, width: 22, textAlign: 'center' as const },
  kbd: { marginLeft: 'auto', fontSize: 11, color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 4, padding: '1px 5px' },
}

interface Command {
  id: string
  label: string
  icon: string
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
        <input ref={inputRef} style={styles.input} placeholder="Gõ lệnh hoặc hỏi AI..." value={query}
          onChange={e => setQuery(e.target.value)} onKeyDown={onKey} />
        <div style={styles.hint}>↑↓ chọn · Enter thực thi · Esc đóng</div>
        <div style={styles.list}>
          {filtered.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Không có lệnh phù hợp</div>}
          {filtered.map((c, i) => (
            <div key={c.id} style={{ ...styles.item, ...(i === idx ? styles.itemActive : {}) }}
              onMouseEnter={() => setIdx(i)}
              onClick={() => { c.run(); onClose() }}>
              <span style={styles.icon}>{c.icon}</span>
              <span>{c.label}</span>
              {c.hint && <span style={{ ...styles.kbd, ...(i === idx ? { color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.3)' } : {}) }}>{c.hint}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}