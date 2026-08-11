import React, { useEffect, useRef, useState } from 'react'
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
import { nextPhase, phaseStyle, type ProgressPhase } from './progress'
import type { PrivacyStats } from '../shared/types'

const styles: Record<string, React.CSSProperties> = {
  app: { display: 'flex', flexDirection: 'column', height: '100vh', background: '#101110' },
  body: { display: 'flex', flex: 1, overflow: 'hidden' },
  content: { flex: 1, position: 'relative', background: '#101110' },
  // Issue #43: 2px top progress bar — width animates 0→90% while loading, snaps 100% + fades on stop
  progress: {
    position: 'fixed', top: 0, left: 0, height: 2, zIndex: 9999,
    background: 'linear-gradient(90deg, #2997ff, #0071e3)',
    boxShadow: '0 0 8px rgba(41,151,255,0.6)',
    transition: 'width 0.3s ease, opacity 0.4s ease 0.1s',
    pointerEvents: 'none',
  },
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
  // Issue #72 — ids of heavy-RAM tabs; fed by the proactive 'sleeper:warnings' event
  // (FeatureBar subscribes via onWarned) + the polled evaluate() fallback.
  const [warnedIds, setWarnedIds] = useState<string[]>([])
  // Issue #72 — toast once per empty → non-empty transition of the warned set
  // (the proactive event can fire repeatedly while heavy tabs stay heavy).
  const prevWarned = useRef<string[]>([])
  // Issue #43: top progress bar phase driven by the ACTIVE tab loading state
  const [progressPhase, setProgressPhase] = useState<ProgressPhase>('idle')
  // Issue #74 — focus mode state hoisted from FeatureBar so the command palette
  // and the toolbar chip share one source of truth (no DOM scraping).
  const [focusOn, setFocusOn] = useState(false)
  const { toasts, status, toast, setStatus } = useFeedback()

  // Issue #74 — focus state sync: load initial value and keep the palette + chip in lockstep
  useEffect(() => {
    window.tony?.focus.state().then(s => setFocusOn(s.enabled)).catch(() => {})
  }, [])

  const toggleFocus = () => {
    const next = !focusOn
    setFocusOn(next)
    window.tony?.focus.toggle(next)
  }

  // Issue #74 — single source of truth for reader extraction: used by the
  // AddressBar button AND the command palette (no DOM scraping).
  const openReader = () => {
    window.tony?.reader.extract(activeId).then(r => {
      if (r.ok && r.article) setReader({ title: r.article.title, content: r.article.content })
    }).catch(() => {})
  }

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

  // Issue #72 — toast consumer for the proactive sleeper:warnings event: fire a
  // toast only on empty → non-empty transitions (dedupe repeats while still heavy).
  useEffect(() => {
    const wasEmpty = prevWarned.current.length === 0
    prevWarned.current = warnedIds
    if (warnedIds.length > 0 && wasEmpty) {
      toast(`${warnedIds.length} heavy tab${warnedIds.length > 1 ? 's' : ''} using high RAM`, 'warn')
    }
  }, [warnedIds])

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
          if (t) { open(t.url, t.container, t.favicon); toast('Restored tab: ' + t.title, 'success') }
        }).catch(() => {})
      }
      // Ctrl/Cmd+W close tab
      else if ((e.ctrlKey || e.metaKey) && k === 'w') { e.preventDefault(); if (activeId) close(activeId) }
      // Ctrl/Cmd+L focus address bar
      else if ((e.ctrlKey || e.metaKey) && k === 'l') {
        e.preventDefault()
        const input = document.querySelector('input[type="text"], input:not([type])') as HTMLInputElement | null
        input?.focus(); input?.select()
      }
      // Ctrl+Tab switch to the next tab
      else if (e.ctrlKey && k === 'tab') {
        e.preventDefault()
        const idx = tabs.findIndex(t => t.id === activeId)
        const next = tabs[(idx + 1) % tabs.length]
        if (next) activate(next.id)
      }
      // Alt+1..9 switch tab
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

  // Issue #43: progress bar follows the ACTIVE tab loading state (spinner is per-tab in TabBar)
  useEffect(() => {
    setProgressPhase(prev => nextPhase(prev, active?.loading ?? false))
  }, [active?.loading])

  return (
    <div style={styles.app}>
      <div style={{ ...styles.progress, ...phaseStyle(progressPhase) }} />
      {layout === 'top' && (
        <TabBar tabs={tabs} activeId={activeId} warnedIds={warnedIds} onSelect={activate} onClose={close}
          onNewTab={() => setContainerMenu(true)} />
      )}
      <FeatureBar layout={layout} onToggleLayout={() => setLayout(l => l === 'top' ? 'side' : 'top')}
        warnedIds={warnedIds} onWarned={setWarnedIds} focusOn={focusOn} onToggleFocus={toggleFocus} />
      <AddressBar value={activeUrl} onCommit={open} onOpenAI={() => setAiOpen(true)}
        nav={{
          canGoBack: navState.canGoBack,
          canGoForward: navState.canGoForward,
          onBack: () => window.tony?.tabs.nav.back().then(() => window.tony?.tabs.nav.state().then(setNavState).catch(() => {})).catch(() => {}),
          onForward: () => window.tony?.tabs.nav.forward().then(() => window.tony?.tabs.nav.state().then(setNavState).catch(() => {})).catch(() => {}),
          onReload: () => window.tony?.tabs.nav.reload().catch(() => {}),
        }}
        onReader={openReader}
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
              <div style={{ fontSize: 13 }}>🌐 Viewing</div>
              <div style={{ fontSize: 21, fontWeight: 600, color: '#fff', marginTop: 6, letterSpacing: '-0.28px' }}>
                {active.title}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.64)', marginTop: 8 }}>{active.url}</div>
            </div>
          )}
          <StatusBar status={`${status}${status ? ' · ' : ''}Blocked ${privacy.blocked} requests · ${privacy.listSize} domains`} />
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
            { id: 'newtab', icon: '➕', label: 'New Tab', hint: 'Ctrl+T', run: () => setContainerMenu(true) },
            { id: 'search', icon: '🔍', label: 'Search open tabs', hint: 'Ctrl+Shift+F', run: () => setSearchOpen(true) },
            { id: 'focus', icon: '🧘', label: 'Toggle Focus Mode', run: toggleFocus },
            { id: 'reader', icon: '📖', label: 'Reader Mode', run: openReader },
            { id: 'ai', icon: '🪄', label: 'Open AI Assistant', hint: 'Ctrl+K', run: () => setAiOpen(true) },
            { id: 'pip', icon: '🎬', label: 'Picture-in-Picture', run: () => window.tony?.pip.start(activeId) },
            { id: 'layout', icon: '📐', label: `Change layout: ${layout === 'side' ? 'Vertical' : 'Horizontal'}`, run: () => setLayout(l => l === 'top' ? 'side' : 'top') },
          ]}
          onClose={() => setPaletteOpen(false)}
        />
      )}
      {searchOpen && <SearchOverlay onSelect={activate} onClose={() => setSearchOpen(false)} />}
      {ttsOpen && (
        <TtsPanel tab={active} onClose={() => setTtsOpen(false)}
          onSave={async () => {
            if (active) {
              try {
                await window.tony?.save.page(active.url, active.title, active.container)
                toast('✅ Saved: ' + (active.title || active.url), 'success')
              } catch {
                toast('❌ Save failed', 'error')
              }
            }
            setTtsOpen(false)
          }} />
      )}
      <ToastStack toasts={toasts} />
    </div>
  )
}