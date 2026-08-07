import React, { useState } from 'react'

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    height: '100%', background: 'radial-gradient(ellipse at top, rgba(0,113,227,0.08), transparent 55%)',
    padding: 40,
  },
  greeting: { fontSize: 40, fontWeight: 700, letterSpacing: '-0.8px', marginBottom: 4, background: 'linear-gradient(180deg,#fff, rgba(255,255,255,0.7))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  sub: { fontSize: 14, color: 'var(--apple-text-tertiary)', marginBottom: 40, letterSpacing: '-0.2px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 16, width: '100%', maxWidth: 720 },
  tile: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '18px 8px 14px',
    borderRadius: 'var(--apple-radius-xl)', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(28,28,30,0.55)', transition: 'all 0.25s var(--ease-out)', userSelect: 'none',
  },
  tileHover: {
    background: 'rgba(28,28,30,0.95)', borderColor: 'rgba(0,113,227,0.5)',
    boxShadow: '0 8px 24px rgba(0,0,0,0.4)', transform: 'translateY(-3px)',
  },
  icon: {
    width: 48, height: 48, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 22, fontWeight: 700, color: '#fff', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.12), 0 4px 12px rgba(0,0,0,0.3)',
  },
  name: { fontSize: 12, color: 'var(--apple-text-secondary)', textAlign: 'center', maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
}

const SITES = [
  { name: 'Google', url: 'https://google.com', icon: 'G', color: '#4285f4' },
  { name: 'YouTube', url: 'https://youtube.com', icon: '▶', color: '#ff0000' },
  { name: 'Facebook', url: 'https://facebook.com', icon: 'f', color: '#1877f2' },
  { name: 'Gmail', url: 'https://mail.google.com', icon: '✉', color: '#ea4335' },
  { name: 'GitHub', url: 'https://github.com', icon: '⌥', color: '#6e5494' },
  { name: 'X', url: 'https://x.com', icon: '𝕏', color: '#1da1f2' },
  { name: 'ChatGPT', url: 'https://chatgpt.com', icon: '◉', color: '#10a37f' },
  { name: 'Zalo', url: 'https://chat.zalo.me', icon: 'Z', color: '#0068ff' },
]

export default function SpeedDial({ onNavigate }: { onNavigate: (url: string) => void }) {
  const [hover, setHover] = useState<string | null>(null)

  return (
    <div style={styles.wrap}>
      <div style={styles.greeting}>Chào Đại ca 👋</div>
      <div style={styles.sub}>Hôm nay muốn làm gì? Hãy chọn trang yêu thích hoặc nhập địa chỉ.</div>
      <div style={styles.grid}>
        {SITES.map(s => (
          <div key={s.url}
            style={{ ...styles.tile, ...(hover === s.url ? styles.tileHover : {}) }}
            onMouseEnter={() => setHover(s.url)} onMouseLeave={() => setHover(null)}
            onClick={() => onNavigate(s.url)}>
            <div style={{ ...styles.icon, background: `linear-gradient(135deg, ${s.color}, ${s.color}cc)` }}>{s.icon}</div>
            <div style={styles.name}>{s.name}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 48, fontSize: 12, color: 'var(--apple-text-tertiary)', letterSpacing: '-0.1px' }}>
        <span style={{ color: 'var(--apple-text-secondary)' }}>💡 Mẹo:</span> Ctrl+K mở lệnh nhanh · Ctrl+Shift+F tìm tab
      </div>
    </div>
  )
}