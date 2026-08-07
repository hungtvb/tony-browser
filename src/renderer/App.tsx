import React, { useEffect, useState } from 'react'
import TabBar from './components/TabBar'
import Sidebar from './components/Sidebar'
import AddressBar from './components/AddressBar'
import AIPanel from './components/AIPanel'
import FeatureBar from './components/FeatureBar'
import ContainerMenu from './components/ContainerMenu'
import ReaderView from './components/ReaderView'
import CommandPalette from './components/CommandPalette'
import { useTabs } from './hooks/useTabs'
import type { PrivacyStats } from '../shared/types'

const styles: Record<string, React.CSSProperties> = {
  app: { display: 'flex', flexDirection: 'column', height: '100vh', background: '#000' },
  body: { display: 'flex', flex: 1, overflow: 'hidden' },
  content: { flex: 1, position: 'relative', background: '#000' },
  status: { position: 'absolute', bottom: 10, right: 14, fontSize: 11, color: 'rgba(255,255,255,0.48)', letterSpacing: '-0.08px' },
}

export default function App() {
  const { tabs, activeId, open, openInContainer, close, activate } = useTabs()
  const [privacy, setPrivacy] = useState<PrivacyStats>({ blocked: 0, listSize: 0 })
  const [aiOpen, setAiOpen] = useState(false)
  const [containerMenu, setContainerMenu] = useState(false)
  const [layout, setLayout] = useState<'top' | 'side'>('top')
  const [reader, setReader] = useState<{ title: string; content: string } | null>(null)
  const [paletteOpen, setPaletteOpen] = useState(false)

  // Ctrl+K / Cmd+K mở command palette
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen(o => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

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
      {layout === 'top' && (
        <TabBar tabs={tabs} activeId={activeId} onSelect={activate} onClose={close}
          onNewTab={() => setContainerMenu(true)} />
      )}
      <FeatureBar layout={layout} onToggleLayout={() => setLayout(l => l === 'top' ? 'side' : 'top')} />
      <AddressBar onNavigate={open} onOpenAI={() => setAiOpen(true)}
        onReader={() => {
          window.tony?.reader.extract(activeId).then(r => {
            if (r.ok && r.article) setReader({ title: r.article.title, content: r.article.content })
          }).catch(() => {})
        }}
        onPip={() => window.tony?.pip.start(activeId)} />
      <div style={styles.body}>
        {layout === 'side' && (
          <Sidebar tabs={tabs} activeId={activeId} onSelect={activate} onClose={close}
            onNewTab={() => setContainerMenu(true)} />
        )}
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
      </div>
      {containerMenu && (
        <ContainerMenu
          onPick={(url, container) => {
            open(url || 'https://www.google.com', container)
            setContainerMenu(false)
          }}
          onClose={() => setContainerMenu(false)}
        />
      )}
      {aiOpen && <AIPanel activeTabId={activeId} onClose={() => setAiOpen(false)} />}
      {reader && <ReaderView title={reader.title} content={reader.content} onClose={() => setReader(null)} />}
      {paletteOpen && (
        <CommandPalette
          commands={[
            { id: 'newtab', icon: '➕', label: 'Tab mới', hint: 'Ctrl+T', run: () => setContainerMenu(true) },
            { id: 'focus', icon: '🧘', label: 'Bật/tắt Focus Mode', run: () => { const el = [...document.querySelectorAll('button')].find(b => b.textContent?.includes('Focus')); el?.click() } },
            { id: 'reader', icon: '📖', label: 'Reader Mode', run: () => document.querySelector('[title="Reader Mode"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true })) },
            { id: 'ai', icon: '🪄', label: 'Mở Trợ lý AI', hint: 'Ctrl+K', run: () => setAiOpen(true) },
            { id: 'pip', icon: '🎬', label: 'Picture-in-Picture', run: () => window.tony?.pip.start(activeId) },
            { id: 'layout', icon: '📐', label: `Đổi layout: ${layout === 'side' ? 'Ngang' : 'Dọc'}`, run: () => setLayout(l => l === 'top' ? 'side' : 'top') },
          ]}
          onClose={() => setPaletteOpen(false)}
        />
      )}
    </div>
  )
}