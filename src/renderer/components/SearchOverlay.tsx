import React, { useEffect, useRef, useState } from 'react'
import type { TabState } from '../../shared/types'

const styles: Record<string, React.CSSProperties> = {
  overlay: { position: 'fixed', inset: 0, zIndex: 250, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', paddingTop: '10vh' },
  box: {
    width: 520, background: 'rgba(28,28,30,0.98)', borderRadius: 16, overflow: 'hidden',
    boxShadow: 'rgba(0,0,0,0.5) 0 20px 60px', border: '1px solid rgba(255,255,255,0.1)',
    backdropFilter: 'saturate(180%) blur(30px)',
  },
  input: {
    width: '100%', padding: '14px 18px', background: 'transparent', border: 'none',
    color: '#fff', fontSize: 15, outline: 'none', letterSpacing: '-0.12px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  },
  list: { maxHeight: 360, overflow: 'auto', padding: 6 },
  item: {
    display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10,
    cursor: 'pointer', fontSize: 13, color: 'rgba(255,255,255,0.85)',
  },
  itemActive: { background: 'var(--apple-blue)', color: '#0a0a0a' },
  title: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  url: { fontSize: 11, color: 'rgba(255,255,255,0.4)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  hint: { padding: '6px 18px', fontSize: 11, color: 'rgba(255,255,255,0.4)' },
}

export default function SearchOverlay({ onSelect, onClose }: {
  onSelect: (id: string) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TabState[]>([])
  const [idx, setIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    window.tony?.tabs.search(query).then(r => { setResults(r); setIdx(0) }).catch(() => {})
  }, [query])

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIdx(i => Math.min(i + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter' && results[idx]) { onSelect(results[idx].id); onClose() }
    else if (e.key === 'Escape') onClose()
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.box} onClick={e => e.stopPropagation()}>
        <input ref={inputRef} style={styles.input} placeholder="Tìm tab đang mở... (Ctrl+Shift+F)" value={query}
          onChange={e => setQuery(e.target.value)} onKeyDown={onKey} />
        <div style={styles.hint}>{results.length} kết quả · ↑↓ chọn · Enter mở · Esc đóng</div>
        <div style={styles.list}>
          {query && results.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>Không tìm thấy tab</div>}
          {results.map((t, i) => (
            <div key={t.id} style={{ ...styles.item, ...(i === idx ? styles.itemActive : {}) }}
              onMouseEnter={() => setIdx(i)} onClick={() => { onSelect(t.id); onClose() }}>
              <span>🌐</span>
              <span style={styles.title}>{t.title}</span>
              <span style={{ ...styles.url, ...(i === idx ? { color: 'rgba(255,255,255,0.7)' } : {}) }}>{t.url}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}