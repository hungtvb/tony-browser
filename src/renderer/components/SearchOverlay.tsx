import React, { useEffect, useRef, useState } from 'react'
import type { TabState } from '../../shared/types'
import UIcon from './UIcon'

const styles: Record<string, React.CSSProperties> = {
  overlay: { position: 'fixed', inset: 0, zIndex: 250, background: 'rgba(0,0,0,0.25)', display: 'flex', justifyContent: 'center', paddingTop: '10vh' },
  box: {
    width: 520, background: 'rgba(255,255,255,0.72)', borderRadius: 40, overflow: 'hidden',
    backdropFilter: 'blur(28px) saturate(1.5)', WebkitBackdropFilter: 'blur(28px) saturate(1.5)',
    boxShadow: 'none', border: '1px solid rgba(255,255,255,0.65)',
  },
  input: {
    width: '100%', padding: '14px 20px', background: 'transparent', border: 'none',
    color: '#141414', fontSize: 15, outline: 'none', fontWeight: 400,
    borderBottom: '1px solid #e7e7e7', fontFamily: 'var(--font-body)',
  },
  list: { maxHeight: 360, overflow: 'auto', padding: 8 },
  item: {
    display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderRadius: 16,
    cursor: 'pointer', fontSize: 13, color: '#141414', fontWeight: 500, fontFamily: 'var(--font-body)',
  },
  itemActive: { background: '#94e130', color: '#141414', fontWeight: 600 },
  title: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  url: { fontSize: 11, color: '#6e6e6e', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  hint: { padding: '6px 20px', fontSize: 12, color: '#6e6e6e', fontWeight: 400 },
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
    let cancelled = false
    const timer = setTimeout(() => {
      window.tony?.tabs.search(query).then(r => {
        if (!cancelled) { setResults(r); setIdx(0) }
      }).catch(() => {})
    }, 150)
    return () => { cancelled = true; clearTimeout(timer) }
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
        <input ref={inputRef} style={styles.input} placeholder="Search open tabs... (Ctrl+Shift+F)" value={query}
          onChange={e => setQuery(e.target.value)} onKeyDown={onKey} />
        <div style={styles.hint}>{results.length} results · ↑↓ select · Enter open · Esc close</div>
        <div style={styles.list}>
          {query && results.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: '#6e6e6e' }}>No tabs found</div>}
          {results.map((t, i) => (
            <div key={t.id} style={{ ...styles.item, ...(i === idx ? styles.itemActive : {}) }}
              onMouseEnter={() => setIdx(i)} onClick={() => { onSelect(t.id); onClose() }}>
              <UIcon name="globe" size={14} />
              <span style={styles.title}>{t.title}</span>
              <span style={{ ...styles.url, ...(i === idx ? { color: 'rgba(0,0,0,0.6)' } : {}) }}>{t.url}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
