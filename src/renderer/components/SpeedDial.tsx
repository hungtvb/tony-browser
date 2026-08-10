import React, { useState } from 'react'
import UIcon from './UIcon'
import { BrandIcon } from './BrandIcon'

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    height: '100%', background: 'radial-gradient(ellipse at top, rgba(212,255,64,0.08), transparent 55%)',
    padding: 40,
  },
  greetingWrap: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 },
  greeting: { fontSize: 40, fontWeight: 700, letterSpacing: '-0.8px', background: 'linear-gradient(180deg,#fff, rgba(255,255,255,0.7))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  wave: { color: 'var(--apple-blue)', display: 'flex', filter: 'drop-shadow(0 0 6px rgba(212,255,64,0.5))' },
  sub: { fontSize: 14, color: 'var(--apple-text-tertiary)', marginBottom: 40, letterSpacing: '-0.2px' },
  grid: {
    display: 'grid', gridTemplateColumns: 'repeat(4, 104px)', gap: 16,
    justifyContent: 'center', width: '100%', maxWidth: 720,
  },
  tile: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '18px 8px 14px',
    borderRadius: 'var(--apple-radius-xl)', cursor: 'pointer', border: 'none',
    background: 'rgba(212,255,64,0.05)', transition: 'all 0.25s var(--ease-out)', userSelect: 'none',
  },
  tileHover: {
    background: 'rgba(28,30,26,0.95)', borderColor: 'rgba(212,255,64,0.45)',
    boxShadow: '0 8px 24px rgba(0,0,0,0.4), 0 0 16px rgba(212,255,64,0.15)', transform: 'translateY(-3px)',
  },
  icon: {
    width: 48, height: 48, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.12), 0 4px 12px rgba(0,0,0,0.3)',
  },
  name: { fontSize: 12, color: 'var(--apple-text-secondary)', textAlign: 'center', maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  tip: { marginTop: 48, fontSize: 12, color: 'var(--apple-text-tertiary)', letterSpacing: '-0.1px', display: 'flex', alignItems: 'center', gap: 6 },
}

const SITES = [
  { name: 'Google', url: 'https://google.com', brand: 'google', color: '#4285f4' },
  { name: 'YouTube', url: 'https://youtube.com', brand: 'youtube', color: '#ff0000' },
  { name: 'Facebook', url: 'https://facebook.com', brand: 'facebook', color: '#1877f2' },
  { name: 'Gmail', url: 'https://mail.google.com', brand: 'gmail', color: '#ea4335' },
  { name: 'GitHub', url: 'https://github.com', brand: 'github', color: '#6e5494' },
  { name: 'X', url: 'https://x.com', brand: 'x', color: '#000000' },
  { name: 'ChatGPT', url: 'https://chatgpt.com', brand: 'chatgpt', color: '#10a37f' },
  { name: 'Zalo', url: 'https://chat.zalo.me', brand: 'zalo', color: '#0068ff' },
]

export default function SpeedDial({ onNavigate }: { onNavigate: (url: string) => void }) {
  const [hover, setHover] = useState<string | null>(null)

  return (
    <div style={styles.wrap}>
      <div style={styles.greetingWrap}>
        <div style={styles.greeting}>Hello Boss</div>
        <span style={styles.wave}><UIcon name="waving" size={32} title="waving hand" /></span>
      </div>
      <div style={styles.sub}>What would you like to do today? Pick a favorite site or enter an address.</div>
      <div style={styles.grid}>
        {SITES.map(s => (
          <div key={s.url}
            style={{ ...styles.tile, ...(hover === s.url ? styles.tileHover : {}) }}
            onMouseEnter={() => setHover(s.url)} onMouseLeave={() => setHover(null)}
            onClick={() => onNavigate(s.url)}>
            <div style={{ ...styles.icon, background: 'rgba(255,255,255,0.92)' }}>
              <BrandIcon name={s.brand} size={30} />
            </div>
            <div style={styles.name}>{s.name}</div>
          </div>
        ))}
      </div>
      <div style={styles.tip}>
        <span style={{ color: 'var(--apple-text-secondary)', display: 'flex' }}><UIcon name="lightbulb" size={14} /></span>
        Tip: Ctrl+K for quick commands · Ctrl+Shift+F to find tabs
      </div>
    </div>
  )
}