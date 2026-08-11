import React, { useState, useEffect } from 'react'
import type { AIConfig, AIStatus } from '../../shared/types'

const styles: Record<string, React.CSSProperties> = {
  panel: {
    position: 'fixed', top: 0, right: 0, bottom: 0, width: 380, zIndex: 100,
    background: 'rgba(20,20,22,0.96)',
    backdropFilter: 'saturate(180%) blur(24px)',
    WebkitBackdropFilter: 'saturate(180%) blur(24px)',
    borderLeft: '1px solid rgba(255,255,255,0.08)',
    display: 'flex', flexDirection: 'column',
  },
  header: {
    padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)',
    fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    fontSize: 15, letterSpacing: '-0.12px',
  },
  body: { flex: 1, overflow: 'auto', padding: 14, fontSize: 13, lineHeight: 1.5, color: 'rgba(255,255,255,0.9)', letterSpacing: '-0.12px' },
  inputRow: { display: 'flex', gap: 6, padding: 12, borderTop: '1px solid rgba(255,255,255,0.08)' },
  input: {
    flex: 1, padding: 8, borderRadius: 980, border: 'none', background: 'rgba(255,255,255,0.10)', color: '#fff', outline: 'none', fontSize: 13,
  },
  btn: { padding: '8px 14px', borderRadius: 980, border: 'none', background: 'var(--apple-blue)', color: '#0a0a0a', cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  actions: { display: 'flex', gap: 6, padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' },
  chip: {
    padding: '4px 12px', borderRadius: 980,
    color: 'rgba(255,255,255,0.85)', fontSize: 11, cursor: 'pointer', border: 'none', background: 'rgba(255,255,255,0.09)',
  },
  settings: { background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 12, margin: '0 14px', marginTop: 10 },
  config: {
    width: '100%', marginBottom: 8, padding: 7, borderRadius: 8,
    border: 'none', background: 'rgba(255,255,255,0.08)',
    color: '#fff', fontSize: 12, outline: 'none',
  },
}

export default function AIPanel({ onClose, activeTabId }: { onClose: () => void; activeTabId: string }) {
  const [msg, setMsg] = useState('')
  const [out, setOut] = useState('')
  const [busy, setBusy] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [manualActCommand, setManualActCommand] = useState('')
  const [config, setConfig] = useState<AIConfig>({ baseUrl: '', apiKey: '', model: '' })

  // Issue #93 — wire the previously dead `ai:status` channel: show provider/model
  // state on mount and keep it fresh after each config save.
  const [aiStatus, setAiStatus] = useState<AIStatus | null>(null)

  useEffect(() => {
    window.tony?.ai.config().then(c => c && setConfig(c))
    window.tony?.ai.status().then(setAiStatus).catch(() => {})
  }, [])

  function refreshStatus() {
    window.tony?.ai.status().then(setAiStatus).catch(() => {})
  }

  async function run(mode: 'chat' | 'summarizePage' | 'summarizeAll' | 'act', text?: string) {
    if (busy) return
    setBusy(true); setOut('Processing...')
    try {
      const params: any = { mode, text: text ?? (mode === 'act' ? manualActCommand : msg || ''), tabId: activeTabId }
      const res = await window.tony!.ai.ask(params)
      setOut(res.text || '(empty)')
    } catch (e: any) {
      setOut('⚠️ ' + (e?.message || String(e)))
    } finally { setBusy(false) }
  }

  function saveCfg() {
    window.tony?.ai.saveConfig(config).then(() => { setShowSettings(false); refreshStatus() })
  }

  return (
    <div style={styles.panel} className="anim-slide-right">
          <div style={styles.header}>
        <span>🪄 AI Assistant</span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="apple-focus" style={styles.chip} onClick={() => setShowSettings(s => !s)}>⚙️</button>
          <button className="apple-focus" style={styles.chip} onClick={onClose}>✕</button>
        </div>
      </div>

      {showSettings && (
        <div style={styles.settings}>
          <input style={styles.config} placeholder="Base URL (e.g. https://api.openai.com/v1)" value={config.baseUrl}
            onChange={e => setConfig({ ...config, baseUrl: e.target.value })} />
          <input style={styles.config} placeholder="API key" type="password" value={config.apiKey}
            onChange={e => setConfig({ ...config, apiKey: e.target.value })} />
          <input style={styles.config} placeholder="Model (e.g. gpt-4o-mini)" value={config.model}
            onChange={e => setConfig({ ...config, model: e.target.value })} />
          <button className="apple-focus" style={{ ...styles.btn, width: '100%' }} onClick={saveCfg}>Save config</button>
        </div>
      )}

      <div style={styles.actions}>
        <button className="apple-focus" style={styles.chip} onClick={() => run('summarizePage')}>📄 Summarize page</button>
        <button className="apple-focus" style={styles.chip} onClick={() => run('summarizeAll')}>📚 Summarize all tabs</button>
        <button className="apple-focus" style={styles.chip} onClick={() => run('act')}>🤖 Web automation</button>
      </div>

      <div style={{ padding: '6px 14px', display: 'flex', gap: 6 }}>
        <input style={styles.input} placeholder='E.g. "Click the Buy Now button"' value={manualActCommand}
          onChange={e => setManualActCommand(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && run('act')} />
      </div>

      <div style={styles.body}>
        {aiStatus && (
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: 10, letterSpacing: '-0.08px' }}>
            {aiStatus.configured
              ? `⚙️ ${config.model || 'model not set'} · ${aiStatus.busy ? 'Busy' : 'Ready'}`
              : '⚙️ Not configured — open settings to set up your AI provider'}
          </div>
        )}
        <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}>{out}</pre>
      </div>

      <div style={styles.inputRow}>
        <input style={styles.input} placeholder="Ask about this page?" value={msg}
          onChange={e => setMsg(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && run('chat', msg)} />
        <button className="apple-focus" style={styles.btn} onClick={() => run('chat', msg)}>Send</button>
      </div>
    </div>
  )
}