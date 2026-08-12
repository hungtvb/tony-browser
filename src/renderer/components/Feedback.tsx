import React, { useEffect, useState } from 'react'
import UIcon from './UIcon'

const styles: Record<string, React.CSSProperties> = {
  // Aaply: slim status band — white, hairline top, carbon text
  status: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '5px 14px', background: 'rgba(255,255,255,0.8)',
    color: '#141414', fontSize: 12, fontWeight: 400,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    borderTop: '1px solid #e7e7e7', fontFamily: 'var(--font-body)',
  },
  toastWrap: {
    position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
    display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', zIndex: 500,
    pointerEvents: 'none',
  },
  toast: {
    background: 'rgba(255,255,255,0.78)', color: '#141414', padding: '10px 20px', borderRadius: 10,
    fontSize: 13, boxShadow: 'none',
    backdropFilter: 'blur(16px) saturate(1.3)', WebkitBackdropFilter: 'blur(16px) saturate(1.3)',
    fontWeight: 500, whiteSpace: 'nowrap', fontFamily: 'var(--font-body)',
    border: '1px solid rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: 7,
  },
}

export function ToastStack({ toasts }: { toasts: { id: number; msg: string; type?: string }[] }) {
  return (
    <div style={styles.toastWrap}>
      {toasts.map(t => (
        <div key={t.id} className="anim-toast"
          style={{ ...styles.toast, ...(t.type === 'success' ? { borderColor: '#94e130' } : t.type === 'warn' ? { borderColor: '#94e130' } : {}) }}>
          {t.type === 'success' && <UIcon name="check" size={14} color="#94e130" />}
          {t.type === 'error' && <UIcon name="x" size={14} color="#94e130" />}
          {t.type === 'warn' && <UIcon name="alert-triangle" size={14} color="#94e130" />}
          {t.msg}
        </div>
      ))}
    </div>
  )
}

export function StatusBar({ status }: { status: string }) {
  if (!status) return null
  return (
    <div style={styles.status}>
      <UIcon name="privacy" size={12} color="#94e130" title="shield" />
      {status}
    </div>
  )
}

// Hook managing toasts + status
export function useFeedback() {
  const [toasts, setToasts] = useState<{ id: number; msg: string; type?: string }[]>([])
  const [status, setStatus] = useState('')

  function toast(msg: string, type?: string) {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, msg, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2500)
  }

  useEffect(() => {
    if (!status) return
    const t = setTimeout(() => setStatus(''), 5000)
    return () => clearTimeout(t)
  }, [status])

  return { toasts, status, toast, setStatus }
}
