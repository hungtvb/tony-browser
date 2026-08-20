import React, { useState } from 'react'
import UIcon from './UIcon'
import { BrandIcon } from './BrandIcon'

const styles: Record<string, React.CSSProperties> = {
  // Aaply: hero on the gray dot-grid canvas — headline with inline emoji, yellow+black pill pair
  wrap: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    height: '100%', padding: 40,
  },
  greetingWrap: { display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 },
  greeting: {
    fontSize: 48, fontWeight: 300, letterSpacing: '-3.6px', color: '#141414',
    fontFamily: 'var(--font-display)', lineHeight: 1.05,
  },
  wave: { fontSize: 40, display: 'inline-block', transform: 'rotate(12deg)' },
  sub: { fontSize: 16, color: '#6e6e6e', marginBottom: 28, fontWeight: 400, letterSpacing: '-0.3px' },
  searchRow: { display: 'flex', gap: 10, width: '100%', maxWidth: 580, marginBottom: 36 },
  searchInput: {
    flex: 1, padding: '12px 18px', borderRadius: 16, border: '1px solid #e7e7e7',
    background: '#ffffff', color: '#141414', fontSize: 14.5, outline: 'none',
    fontWeight: 400, fontFamily: 'var(--font-body)', boxShadow: 'none',
  },
  searchBtn: {
    padding: '12px 26px', borderRadius: 5, border: 'none', background: '#94e130',
    color: '#141414', cursor: 'pointer', fontWeight: 500, fontSize: 14,
    transition: 'transform 0.15s var(--ease-out)', fontFamily: 'var(--font-body)',
  },
  searchBtnBlack: {
    padding: '12px 26px', borderRadius: 5, border: 'none', background: '#141414',
    color: '#ffffff', cursor: 'pointer', fontWeight: 500, fontSize: 14,
    transition: 'transform 0.15s var(--ease-out)', fontFamily: 'var(--font-body)',
  },
  grid: {
    display: 'grid', gridTemplateColumns: 'repeat(4, 116px)', gap: 20,
    justifyContent: 'center', width: '100%', maxWidth: 760,
  },
  tile: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '20px 8px 16px',
    borderRadius: 10, cursor: 'pointer', border: '1px solid #e7e7e7',
    background: '#ffffff', transition: 'all 0.18s var(--ease-out)', userSelect: 'none',
  },
  tileHover: {
    transform: 'translateY(-3px)',
    boxShadow: 'none',
  },
  icon: {
    width: 48, height: 48, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#f4eee5',
  },
  name: { fontSize: 13, color: '#141414', textAlign: 'center', maxWidth: 96, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 },
  privacy: {
    marginTop: 30, padding: '6px 16px', borderRadius: 5,
    background: '#94e130', color: '#ffffff', fontSize: 13, letterSpacing: '-0.1px',
    display: 'flex', alignItems: 'center', gap: 7, fontWeight: 500, fontFamily: 'var(--font-body)',
  },
  tip: { marginTop: 26, fontSize: 13, color: '#6e6e6e', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 400 },
}

const SITES = [
  { name: 'Google', url: 'https://google.com', brand: 'google', color: '#4285f4' },
  { name: 'YouTube', url: 'https://youtube.com', brand: 'youtube', color: '#ff0000' },
  { name: 'Facebook', url: 'https://facebook.com', brand: 'facebook', color: '#1877f2' },
  { name: 'Gmail', url: 'https://mail.google.com', brand: 'gmail', color: '#ea4335' },
  { name: 'GitHub', url: 'https://github.com', brand: 'github', color: '#6e5494' },
  { name: 'X', url: 'https://x.com', brand: 'x', color: '#141414' },
  { name: 'ChatGPT', url: 'https://chatgpt.com', brand: 'chatgpt', color: '#10a37f' },
  { name: 'Zalo', url: 'https://chat.zalo.me', brand: 'zalo', color: '#0068ff' },
]

export default function SpeedDial({ onNavigate, privacy }: {
  onNavigate: (url: string) => void
  privacy?: { blocked: number; listSize: number }
}) {
  const [hover, setHover] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  function go() {
    const v = query.trim()
    if (!v) return
    onNavigate(/^https?:\/\//i.test(v) ? v : `https://${v}`)
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.greetingWrap}>
        <div style={styles.greeting}>Hello Boss</div>
        <span style={styles.wave}><UIcon name="wave" size={40} color="#141414" /></span>
      </div>
      <div style={styles.sub}>What would you like to do today? Pick a favorite site or enter an address.</div>
      <div style={styles.searchRow}>
        <input
          className="apple-focus"
          style={styles.searchInput}
          placeholder="Search or type a web address..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') go() }}
        />
        {/* Aaply signature: yellow + black button pair */}
        <button className="apple-focus" style={styles.searchBtn} onClick={go}>Search</button>
        <button className="apple-focus" style={styles.searchBtnBlack} onClick={() => onNavigate('https://www.google.com')}>New Tab</button>
      </div>
      <div style={styles.grid}>
        {SITES.map(s => (
          <div key={s.url}
            style={{ ...styles.tile, ...(hover === s.url ? styles.tileHover : {}) }}
            onMouseEnter={() => setHover(s.url)} onMouseLeave={() => setHover(null)}
            onClick={() => onNavigate(s.url)}>
            <div style={styles.icon}>
              <BrandIcon name={s.brand} size={28} />
            </div>
            <div style={styles.name}>{s.name}</div>
          </div>
        ))}
      </div>
      {privacy && (
        <div style={styles.privacy}>
          <UIcon name="privacy" size={13} color="#ffffff" />
          Privacy Report — {privacy.blocked} blocked · {privacy.listSize} domains
        </div>
      )}
      <div style={styles.tip}>
        <UIcon name="lightbulb" size={13} />
        Tip: Ctrl+K for quick commands · Ctrl+Shift+F to find tabs
      </div>
    </div>
  )
}
