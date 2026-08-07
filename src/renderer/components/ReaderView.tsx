import React from 'react'

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 150, background: '#f5f5f7', color: '#1d1d1f',
    overflow: 'auto', display: 'flex', flexDirection: 'column',
  },
  bar: {
    position: 'sticky', top: 0, display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 24px', background: 'rgba(245,245,247,0.9)',
    backdropFilter: 'saturate(180%) blur(20px)', borderBottom: '1px solid rgba(0,0,0,0.08)',
  },
  btn: {
    padding: '5px 14px', borderRadius: 980, border: '1px solid #0071e3', background: 'transparent',
    color: '#0066cc', cursor: 'pointer', fontSize: 13,
  },
  title: { fontSize: 14, fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  body: { maxWidth: 680, margin: '0 auto', padding: '40px 24px', width: '100%' },
  h1: { fontSize: 32, fontWeight: 600, lineHeight: 1.2, letterSpacing: '-0.28px', marginBottom: 24 },
  text: { fontSize: 17, lineHeight: 1.6, letterSpacing: '-0.374px', color: 'rgba(0,0,0,0.8)' },
}

export default function ReaderView({ title, content, onClose }: {
  title: string
  content: string
  onClose: () => void
}) {
  return (
    <div style={styles.overlay}>
      <div style={styles.bar}>
        <span style={styles.title}>📖 {title || 'Reader Mode'}</span>
        <button className="apple-focus" style={styles.btn} onClick={onClose}>✕ Đóng</button>
      </div>
      <div style={styles.body}>
        <h1 style={styles.h1}>{title}</h1>
        <div style={styles.text}>{content}</div>
      </div>
    </div>
  )
}