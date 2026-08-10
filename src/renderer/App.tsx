import React, { useEffect, useState } from 'react'
import TabBar from './components/TabBar'
import Sidebar from './components/Sidebar'
import AddressBar from './components/AddressBar'
import AIPanel from './components/AIPanel'
import FeatureBar from './components/FeatureBar'
import ContainerMenu from './components/ContainerMenu'
import ReaderView from './components/ReaderView'
import CommandPalette from './components/CommandPalette'
import SearchOverlay from './components/SearchOverlay'
import TtsPanel from './components/TtsPanel'
import SpeedDial from './components/SpeedDial'
import { ToastStack, StatusBar, useFeedback } from './components/Feedback'
import { useTabs } from './hooks/useTabs'
import type { PrivacyStats } from '../shared/types'

const styles: Record<string, React.CSSProperties> = {
  app: { display: 'flex', flexDirection: 'column', height: '100vh', background: '#101110' },
  body: { display: 'flex', flex: 1, overflow: 'hidden' },
  content: { flex: 1, position: 'relative', background: '#101110' },
}

export default function App() {
  const { tabs, activeId, open, openInContainer, close, activate } = useTabs()
  const [privacy, setPrivacy] = useState<PrivacyStats>({ blocked: 0, listSize: 0 })
  const [aiOpen, setAiOpen] = useState(false)
  const [containerMenu, setContainerMenu] = useState(false)
  const [layout, setLayout] = useState<'top' | 'side'>('top')
  const [reader, setReader] = useState<{ title: string; content: string } | null>(null)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [ttsOpen, setTtsOpen] = useState(false)
  const [navState, setNavState] = useState({ canGoBack: false, canGoForward: false, isLoading: false })
  const { toasts, status, toast, setStatus } = useFeedback()

  // CI screenshot hook: auto-open command palette when CAPTURE_PALETTE=1
  useEffect(() => {
    if (import.meta.env?.DEV === false && /CAPTURE_PALETTE=1/.test(window.location.search || '')) {
      setPaletteOpen(true)
    }
  }, [])

  // Nav controls: refresh back/forward enabled state whenever the tab list or active tab changes
  useEffect(() => {
    window.tony?.tabs.nav.state().then(setNavState).catch(() => {})
  }, [tabs, activeId])

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      // Ctrl/Cmd+K command palette
      if ((e.ctrlKey || e.metaKey) && k === 'k') { e.preventDefault(); setPaletteOpen(o => !o) }
      // Ctrl/Cmd+Shift+F search tabs
      else if ((e.ctrlKey || e.metaKey) && e.shiftKey && k === 'f') { e.preventDefault(); setSearchOpen(o => !o) }
      // Ctrl/Cmd+Shift+T undo close
      else if ((e.ctrlKey || e.metaKey) && e.shiftKey && k === 't') {
        e.preventDefault()
        window.tony?.tabs.undoClose().then(t => {
          if (t) { open(t.url, t.container); toast('Đã khôi phục tab: ' + t.title, 'success') }
        }).catch(() => {})
      }
      // Ctrl/Cmd+W đóng tab
      else if ((e.ctrlKey || e.metaKey) && k === 'w') { e.preventDefault(); if (activeId) close(activeId) }
      // Ctrl/Cmd+L focus address bar
      else if ((e.ctrlKey || e.metaKey) && k === 'l') {
        e.preventDefault()
        const input = document.querySelector('input[type="text"], input:not([type])') as HTMLInputElement | null
        input?.focus(); input?.select()
      }
      // Ctrl+Tab chuyển tab kế
      else if (e.ctrlKey && k === 'tab') {
        e.preventDefault()
        const idx = tabs.findIndex(t => t.id === activeId)
        const next = tabs[(idx + 1) % tabs.length]
        if (next) activate(next.id)
      }
      // Alt+1..9 chuyển tab
      else if (e.altKey && !e.ctrlKey && /^[1-9]$/.test(e.key)) {
        e.preventDefault()
        const t = tabs[Number(e.key) - 1]
        if (t) activate(t.id)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [tabs, activeId])

  useEffect(() => {
    window.tony?.privacy.stats().then(setPrivacy).catch(() => {})
    const iv = setInterval(() => {
      window.tony?.privacy.stats().then(setPrivacy).catch(() => {})
    }, 3000)
    return () => clearInterval(iv)
  }, [])

  const active = tabs.find(t => t.id === activeId)
  const showSpeedDial = !active || !active.url || active.url === 'about:blank' || active.url.includes('google.com') && active.title === 'New Tab'
  // Issue #42: show placeholder (empty input) for new/blank tabs; otherwise the active tab URL
  const activeUrl = active && active.url && active.url !== 'about:blank' ? active.url : ''

  return (
    <div style={styles.app}>
      {layout === 'top' && (
        <TabBar tabs={tabs} activeId={activeId} onSelect={activate} onClose={close}
          onNewTab={() => setContainerMenu(true)} />
      )}
      <FeatureBar layout={layout} onToggleLayout={() => setLayout(l => l === 'top' ? 'side' : 'top')} />
      <AddressBar value={activeUrl} onCommit={open} onOpenAI={() => setAiOpen(true)}
        nav={{
          canGoBack: navState.canGoBack,
          canGoForward: navState.canGoForward,
          onBack: () => window.tony?.tabs.nav.back().then(() => window.tony?.tabs.nav.state().then(setNavState).catch(() => {})).catch(() => {}),
          onForward: () => window.tony?.tabs.nav.forward().then(() => window.tony?.tabs.nav.state().then(setNavState).catch(() => {})).catch(() => {}),
          onReload: () => window.tony?.tabs.nav.reload().catch(() => {}),
        }}
        onReader={() => {
          window.tony?.reader.extract(activeId).then(r => {
            if (r.ok && r.article) setReader({ title: r.article.title, content: r.article.content })
          }).catch(() => {})
        }}
        onPip={() => window.tony?.pip.start(activeId)}
        onSplit={() => {
          const others = tabs.filter(t => t.id !== activeId)
          const b = others[others.length - 1]?.id ?? null
          window.tony?.tabs.split(activeId, b)
        }}
        onTts={() => setTtsOpen(true)} />
      <div style={styles.body}>
        {layout === 'side' && (
          <Sidebar tabs={tabs} activeId={activeId} onSelect={activate} onClose={close}
            onNewTab={() => setContainerMenu(true)} />
        )}
        <div style={styles.content}>
          {showSpeedDial ? (
            <div className="anim-fade" style={{ height: '100%' }}>
              <SpeedDial onNavigate={(url) => open(url)} />
            </div>
          ) : active && (
            <div style={{ textAlign: 'center', paddingTop: 64, color: 'rgba(255,255,255,0.48)' }} className="anim-fade">
              <div style={{ fontSize: 13 }}>🌐 Đang xem</div>
              <div style={{ fontSize: 21, fontWeight: 600, color: '#fff', marginTop: 6, letterSpacing: '-0.28px' }}>
                {active.title}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.64)', marginTop: 8 }}>{active.url}</div>
            </div>
          )}
          <StatusBar status={`${status}${status ? ' · ' : ''}Đã chặn ${privacy.blocked} request · ${privacy.listSize} miền`} />
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
            { id: 'search', icon: '🔍', label: 'Tìm tab đang mở', hint: 'Ctrl+Shift+F', run: () => setSearchOpen(true) },
            { id: 'focus', icon: '🧘', label: 'Bật/tắt Focus Mode', run: () => { const el = [...document.querySelectorAll('button')].find(b => b.textContent?.includes('Focus')); el?.click() } },
            { id: 'reader', icon: '📖', label: 'Reader Mode', run: () => document.querySelector('[title="Reader Mode"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true })) },
            { id: 'ai', icon: '🪄', label: 'Mở Trợ lý AI', hint: 'Ctrl+K', run: () => setAiOpen(true) },
            { id: 'pip', icon: '🎬', label: 'Picture-in-Picture', run: () => window.tony?.pip.start(activeId) },
            { id: 'layout', icon: '📐', label: `Đổi layout: ${layout === 'side' ? 'Ngang' : 'Dọc'}`, run: () => setLayout(l => l === 'top' ? 'side' : 'top') },
          ]}
          onClose={() => setPaletteOpen(false)}
        />
      )}
      {searchOpen && <SearchOverlay onSelect={activate} onClose={() => setSearchOpen(false)} />}
      {ttsOpen && (
        <TtsPanel tab={active} onClose={() => setTtsOpen(false)}
          onSave={() => {
            if (active) {
              toast('✅ Đã lưu: ' + (active.title || active.url), 'success')
            }
            setTtsOpen(false)
          }} />
      )}
      <ToastStack toasts={toasts} />
    </div>
  )
}