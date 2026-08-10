import React, { useEffect, useState } from 'react'
import UIcon from './UIcon'

const styles: Record<string, React.CSSProperties> = {
  status: {
    position: 'absolute', bottom: 8, left: 14, fontSize: 11,
    color: 'var(--apple-text-tertiary)', letterSpacing: '-0.08px',
    pointerEvents: 'none', transition: 'color 0.2s ease', maxWidth: '60%',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    display: 'flex', alignItems: 'center', gap: 5,
  },
  toastWrap: {
    position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
    display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', zIndex: 500,
    pointerEvents: 'none',
  },
  toast: {
    background: 'rgba(28,28,30,0.92)', color: '#fff', padding: '9px 18px', borderRadius: 'var(--apple-radius-pill)',
    fontSize: 13, boxShadow: 'var(--apple-shadow-lg)', border: '1px solid rgba(255,255,255,0.1)',
    letterSpacing: '-0.1px', backdropFilter: 'blur(20px)', whiteSpace: 'nowrap',
  },
}

export function ToastStack({ toasts }: { toasts: { id: number; msg: string; type?: string }[] }) {
  return (
    <div style={styles.toastWrap}>
      {toasts.map(t => (
        <div key={t.id} className="anim-toast"
          style={{ ...styles.toast, ...(t.type === 'success' ? { borderColor: 'rgba(52,199,89,0.4)' } : {}) }}>
          {t.msg}
        </div>
      ))}
    </div>
  )
}

export function StatusBar({ status }: { status: string }) {
  // Hide when idle — only show the bar when there is something to report
  if (!status) return null
  return (
    <div style={styles.status}>
      <UIcon name="privacy" size={11} title="shield" />
      {status}
    </div>
  )
}

// Hook quản lý toast + status
export function useFeedback() {
  const [toasts, setToasts] = useState<{ id: number; msg: string; type?: string }[]>([])
  const [status, setStatus] = useState('')

  function toast(msg: string, type?: string) {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, msg, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2500)
  }

  useEffect(() => {
    // tự ẩn status sau 5s
    if (!status) return
    const t = setTimeout(() => setStatus(''), 5000)
    return () => clearTimeout(t)
  }, [status])

  return { toasts, status, toast, setStatus }
}