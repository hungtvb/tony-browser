import React, { useEffect, useState } from 'react'
import TabBar from './components/TabBar'
import AddressBar from './components/AddressBar'
import AIPanel from './components/AIPanel'
import FeatureBar from './components/FeatureBar'
import { useTabs } from './hooks/useTabs'
import type { PrivacyStats } from '../shared/types'

const styles: Record<string, React.CSSProperties> = {
  app: { display: 'flex', flexDirection: 'column', height: '100vh', background: '#000' },
  content: { flex: 1, position: 'relative', background: '#000' },
  status: { position: 'absolute', bottom: 10, right: 14, fontSize: 11, color: 'rgba(255,255,255,0.48)', letterSpacing: '-0.08px' },
}

export default function App() {
  const { tabs, activeId, open, close, activate } = useTabs()
  const [privacy, setPrivacy] = useState<PrivacyStats>({ blocked: 0, listSize: 0 })
  const [aiOpen, setAiOpen] = useState(false)

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
      <FeatureBar />
      <AddressBar onNavigate={open} onOpenAI={() => setAiOpen(true)} />
      <div style={styles.content}>
        {active && (
          <div style={{ textAlign: 'center', paddingTop: 64, color: 'rgba(255,255,255,0.48)' }}>
            <div style={{ fontSize: 13 }}>🌐 Đang xem</div>
            <div style={{ fontSize: 21, fontWeight: 600, color: '#fff', marginTop: 6, letterSpacing: '-0.28px' }}>
              {active.title}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.64)', marginTop: 8 }}>{active.url}</div>
          </div>
        )}
        <div style={styles.status}>🛡️ Đã chặn {privacy.blocked} request · {privacy.listSize} miền</div>
      </div>
      {aiOpen && <AIPanel activeTabId={activeId} onClose={() => setAiOpen(false)} />}
    </div>
  )
}