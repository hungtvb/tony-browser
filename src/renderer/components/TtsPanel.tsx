import React, { useEffect, useRef, useState } from 'react'
import type { TabState } from '../../shared/types'
import UIcon from './UIcon'

const styles: Record<string, React.CSSProperties> = {
  overlay: { position: 'fixed', inset: 0, zIndex: 220, background: 'rgba(0,0,0,0.25)', display: 'flex', justifyContent: 'center', paddingTop: '14vh' },
  box: {
    width: 460, background: 'rgba(255,255,255,0.72)', borderRadius: 40, overflow: 'hidden',
    backdropFilter: 'blur(28px) saturate(1.5)', WebkitBackdropFilter: 'blur(28px) saturate(1.5)',
    boxShadow: 'none', border: '1px solid rgba(255,255,255,0.65)', padding: 22,
  },
  title: { fontSize: 15, fontWeight: 600, color: '#141414', marginBottom: 18, fontFamily: 'var(--font-display)', letterSpacing: '-0.2px', display: 'flex', alignItems: 'center', gap: 8 },
  row: { display: 'flex', gap: 10, marginBottom: 12 },
  btn: {
    flex: 1, padding: '11px 16px', borderRadius: 5, border: 'none', cursor: 'pointer',
    fontSize: 13, fontWeight: 500, color: '#141414', fontFamily: 'var(--font-body)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  yellow: { background: '#94e130' },
  black: { background: '#141414', color: '#ffffff' },
  red: { background: '#94e130', color: '#ffffff' },
  ghost: { background: '#ffffff', border: '1px solid #e7e7e7' },
  status: { fontSize: 12, color: '#6e6e6e', textAlign: 'center', minHeight: 18, fontWeight: 400, fontFamily: 'var(--font-body)' },
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
    if (speaking) {
      speechSynthesis.cancel(); setSpeaking(false); setStatus('Stopped')
      // Issue #91 — tts.stop was orphaned (zero renderer call sites): wire it to
      // the Stop reading action so main can run its stop routine too.
      window.tony?.tts.stop()
      return
    }
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
        <div style={styles.title}><UIcon name="reader" size={15} /> Read article / Save page</div>
        <div style={styles.row}>
          {/* Aaply signature: yellow + black button pair */}
          <button className="apple-focus" style={{ ...styles.btn, ...(speaking ? styles.red : styles.yellow) }} onClick={speak}>
            {speaking ? <><UIcon name="circle-stop" size={13} color="#141414" /> Stop reading</> : <><UIcon name="tts" size={13} color="#141414" /> Read article</>}
          </button>
          <button className="apple-focus" style={{ ...styles.btn, ...styles.black }} onClick={onSave}><UIcon name="save" size={13} /> Save page</button>
        </div>
        <div style={styles.row}>
          <button className="apple-focus" style={{ ...styles.btn, ...styles.ghost }} onClick={onClose}><UIcon name="close" size={13} /> Close</button>
        </div>
        <div style={styles.status}>{status || 'Listen to articles in Vietnamese voice'}</div>
      </div>
    </div>
  )
}
