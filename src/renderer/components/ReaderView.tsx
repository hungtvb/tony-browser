import React from 'react'
import UIcon from './UIcon'

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 150, background: '#f4eee5', color: '#141414',
    backgroundImage: 'radial-gradient(circle, #e0e0e0 1px, transparent 1px)',
    backgroundSize: '20px 20px',
    overflow: 'auto', display: 'flex', flexDirection: 'column',
  },
  bar: {
    position: 'sticky', top: 0, display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 24px', background: 'rgba(255,255,255,0.85)',
    backdropFilter: 'saturate(180%) blur(20px)', borderBottom: '1px solid #e7e7e7',
  },
  btn: {
    padding: '6px 18px', borderRadius: 5, border: 'none', background: '#94e130',
    color: '#141414', cursor: 'pointer', fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-body)',
    display: 'flex', alignItems: 'center', gap: 6,
  },
  title: { fontSize: 14, fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: 8 },
  body: { maxWidth: 680, margin: '0 auto', padding: '40px 24px', width: '100%' },
  h1: { fontSize: 34, fontWeight: 300, lineHeight: 1.1, letterSpacing: '-1.7px', marginBottom: 24, color: '#141414', fontFamily: 'var(--font-display)' },
  text: { fontSize: 17, lineHeight: 1.6, color: '#141414', fontWeight: 400, fontFamily: 'var(--font-body)' },
}

export default function ReaderView({ title, content, onClose }: {
  title: string
  content: string
  onClose: () => void
}) {
  return (
    <div style={styles.overlay}>
      <div style={styles.bar}>
        <span style={styles.title}><UIcon name="reader" size={14} /> {title || 'Reader Mode'}</span>
        <button className="apple-focus" style={styles.btn} onClick={onClose}><UIcon name="close" size={13} /> Close</button>
      </div>
      <div style={styles.body}>
        <h1 style={styles.h1}>{title}</h1>
        <div style={styles.text}>{content}</div>
      </div>
    </div>
  )
}
