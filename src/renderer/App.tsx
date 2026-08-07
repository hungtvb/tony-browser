import React, { useEffect, useState } from 'react'
import TabBar from './components/TabBar'
import AddressBar from './components/AddressBar'
import { useTabs } from './hooks/useTabs'
import type { PrivacyStats } from '../shared/types'

const styles: Record<string, React.CSSProperties> = {
  app: { display: 'flex', flexDirection: 'column', height: '100vh' },
  content: { flex: 1, position: 'relative', background: '#0f1115' },
  status: { position: 'absolute', bottom: 8, right: 10, fontSize: 12, color: '#6b7280' },
}

export default function App() {
  const { tabs, activeId, open, close, activate } = useTabs()
  const [privacy, setPrivacy] = useState<PrivacyStats>({ blocked: 0, listSize: 0 })

  useEffect(() => {
    window.tony?.privacy.stats().then(setPrivacy).catch(() => {})
    const iv = setInterval(() => {
      window.tony?.privacy.stats().then(setPrivacy).catch(() => {})
    }, 3000)
    return () => clearInterval(iv)
  }, [])

  const active = tabs.find(t => t.id === activeId)

  return (
    <div style={styles.app}>
      <TabBar tabs={tabs} activeId={activeId} onSelect={activate} onClose={close} />
      <AddressBar onNavigate={open} />
      <div style={styles.content}>
        {active && (
          <p style={{ textAlign: 'center', marginTop: 40, color: '#6b7280' }}>
            🌐 Đang xem: <strong style={{ color: '#e5e7eb' }}>{active.title}</strong>
            <br />
            <span style={{ fontSize: 12 }}>{active.url}</span>
          </p>
        )}
        <div style={styles.status}>🛡️ Đã chặn {privacy.blocked} request (danh sách {privacy.listSize} miền)</div>
      </div>
    </div>
  )
}
