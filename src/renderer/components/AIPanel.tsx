import React, { useState, useEffect } from 'react'
import type { AIConfig } from '../../shared/types'
import UIcon from './UIcon'

const styles: Record<string, React.CSSProperties> = {
  panel: {
    position: 'fixed', top: 0, right: 0, bottom: 0, width: 380, zIndex: 100,
    background: 'rgba(255,255,255,0.72)',
    backdropFilter: 'blur(28px) saturate(1.5)', WebkitBackdropFilter: 'blur(28px) saturate(1.5)',
    borderLeft: '1px solid rgba(255,255,255,0.65)',
    display: 'flex', flexDirection: 'column',
  },
  header: {
    padding: '14px 16px', borderBottom: '1px solid #e7e7e7',
    fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    fontSize: 15, letterSpacing: '-0.2px', color: '#141414', fontFamily: 'var(--font-display)',
  },
  body: { flex: 1, overflow: 'auto', padding: 14, fontSize: 13, lineHeight: 1.6, color: '#141414', fontWeight: 400, fontFamily: 'var(--font-body)' },
  inputRow: { display: 'flex', gap: 6, padding: 12, borderTop: '1px solid #e7e7e7' },
  input: {
    flex: 1, padding: 9, borderRadius: 16, border: '1px solid #e7e7e7', background: '#fdfcf9', color: '#141414', outline: 'none', fontSize: 13, fontWeight: 400, fontFamily: 'var(--font-body)',
  },
  btn: { padding: '9px 16px', borderRadius: 5, border: 'none', background: '#94e130', color: '#141414', cursor: 'pointer', fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: 5 },
  actions: { display: 'flex', gap: 6, padding: '8px 14px', borderBottom: '1px solid #e7e7e7', flexWrap: 'wrap' },
  chip: {
    display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 52,
    color: '#141414', fontSize: 11, cursor: 'pointer', border: '1px solid #e7e7e7', background: '#ffffff', fontWeight: 500, fontFamily: 'var(--font-body)',
  },
  settings: { background: '#f4eee5', borderRadius: 16, padding: 12, margin: '0 14px', marginTop: 10, border: '1px solid #e7e7e7' },
  config: {
    width: '100%', marginBottom: 8, padding: 8, borderRadius: 16,
    border: '1px solid #e7e7e7', background: '#ffffff',
    color: '#141414', fontSize: 12, outline: 'none', fontWeight: 400, fontFamily: 'var(--font-body)',
  },
}

export default function AIPanel({ onClose, activeTabId }: { onClose: () => void; activeTabId: string }) {
  const [msg, setMsg] = useState('')
  const [out, setOut] = useState('')
  const [busy, setBusy] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [manualActCommand, setManualActCommand] = useState('')
  const [config, setConfig] = useState<AIConfig>({ baseUrl: '', apiKey: '', model: '' })

  useEffect(() => { window.tony?.ai.config().then(c => c && setConfig(c)) }, [])

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
    window.tony?.ai.saveConfig(config).then(() => setShowSettings(false))
  }

  return (
    <div style={styles.panel} className="anim-slide-right">
      <div style={styles.header}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><UIcon name="ai" size={15} /> AI Assistant</span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="apple-focus" style={styles.chip} onClick={() => setShowSettings(s => !s)}><UIcon name="settings" size={13} /></button>
          <button className="apple-focus" style={styles.chip} onClick={onClose}><UIcon name="close" size={13} /></button>
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
        <button className="apple-focus" style={styles.chip} onClick={() => run('summarizePage')}><UIcon name="file-text" size={13} /> Summarize page</button>
        <button className="apple-focus" style={styles.chip} onClick={() => run('summarizeAll')}><UIcon name="book-marked" size={13} /> Summarize all tabs</button>
        <button className="apple-focus" style={styles.chip} onClick={() => run('act')}><UIcon name="bot" size={13} /> Web automation</button>
      </div>

      <div style={{ padding: '6px 14px', display: 'flex', gap: 6 }}>
        <input style={styles.input} placeholder='E.g. "Click the Buy Now button"' value={manualActCommand}
          onChange={e => setManualActCommand(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && run('act')} />
      </div>

      <div style={styles.body}>
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
