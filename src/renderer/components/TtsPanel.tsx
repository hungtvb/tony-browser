import React, { useEffect, useRef, useState } from 'react'
import type { TabState } from '../../shared/types'

const styles: Record<string, React.CSSProperties> = {
  overlay: { position: 'fixed', inset: 0, zIndex: 220, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', paddingTop: '14vh' },
  box: {
    width: 460, background: 'rgba(28,28,30,0.98)', borderRadius: 16, overflow: 'hidden',
    boxShadow: 'rgba(0,0,0,0.5) 0 20px 60px', border: '1px solid rgba(255,255,255,0.1)',
    backdropFilter: 'saturate(180%) blur(30px)', padding: 20,
  },
  title: { fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 16, letterSpacing: '-0.12px' },
  row: { display: 'flex', gap: 8, marginBottom: 12 },
  btn: {
    flex: 1, padding: '10px 14px', borderRadius: 980, border: 'none', cursor: 'pointer',
    fontSize: 13, fontWeight: 500, color: '#fff', letterSpacing: '-0.12px',
  },
  blue: { background: 'var(--apple-blue)' },
  dark: { background: 'rgba(255,255,255,0.12)' },
  red: { background: '#ff3b30' },
  status: { fontSize: 12, color: 'rgba(255,255,255,0.6)', textAlign: 'center', minHeight: 18, letterSpacing: '-0.08px' },
}

export default function TtsPanel({ tab, onClose, onSave }: {
  tab: TabState | undefined
  onClose: () => void
  onSave: () => void
}) {
  const [speaking, setSpeaking] = useState(false)
  const [status, setStatus] = useState('')
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null)

  useEffect(() => {
    return () => { if (utterRef.current) speechSynthesis.cancel() }
  }, [])

  async function speak() {
    if (speaking) { speechSynthesis.cancel(); setSpeaking(false); setStatus('Stopped'); return }
    const res = await window.tony?.tts.speak(tab?.id)
    if (!res?.ok) { setStatus(res?.error ?? 'Error'); return }
    const u = new SpeechSynthesisUtterance(res.text!)
    u.lang = 'vi-VN'
    u.rate = 1
    u.onend = () => setSpeaking(false)
    utterRef.current = u
    speechSynthesis.speak(u)
    setSpeaking(true)
    setStatus('Reading article...')
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.box} onClick={e => e.stopPropagation()}>
        <div style={styles.title}>📖 Read article / Save page</div>
        <div style={styles.row}>
          <button className="apple-focus" style={{ ...styles.btn, ...(speaking ? styles.red : styles.blue) }} onClick={speak}>
            {speaking ? '⏹ Stop reading' : '🔊 Read article'}
          </button>
          <button className="apple-focus" style={{ ...styles.btn, ...styles.dark }} onClick={onSave}>💾 Save page</button>
        </div>
        <div style={styles.row}>
          <button className="apple-focus" style={{ ...styles.btn, ...styles.dark }} onClick={onClose}>✕ Close</button>
        </div>
        <div style={styles.status}>{status || 'Listen to articles in Vietnamese voice'}</div>
      </div>
    </div>
  )
}