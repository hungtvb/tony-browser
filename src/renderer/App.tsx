import React, { useState } from 'react'
import TabBar from './components/TabBar'
import AddressBar from './components/AddressBar'

const styles: Record<string, React.CSSProperties> = {
  app: { display: 'flex', flexDirection: 'column', height: '100vh' },
  content: { flex: 1, position: 'relative', background: '#0f1115' },
}

export default function App() {
  const [tabs, setTabs] = useState<{ id: string; title: string; url: string }[]>([])
  const [activeId, setActiveId] = useState<string>('')

  function openTab(url: string) {
    const id = `tab-${Date.now()}`
    setTabs(t => [...t, { id, title: url, url }])
    setActiveId(id)
  }

  return (
    <div style={styles.app}>
      <TabBar tabs={tabs} activeId={activeId} onSelect={setActiveId}
        onClose={(id) => setTabs(t => t.filter(x => x.id !== id))} />
      <AddressBar onNavigate={openTab} />
      <div style={styles.content}>
        {/* WebContentsView sẽ được overlay tại đây bởi main process */}
        {activeId && <p style={{ textAlign: 'center', marginTop: 40, color: '#6b7280' }}>
          🌐 Đang xem tab {tabs.find(t => t.id === activeId)?.title} (view do main process quản lý)
        </p>}
      </div>
    </div>
  )
}
