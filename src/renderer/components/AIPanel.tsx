import React, { useState, useEffect } from 'react'
import type { AIConfig, AIStatus } from '../../shared/types'

const styles: Record<string, React.CSSProperties> = {
  panel: {
    position: 'fixed', top: 92, right: 0, bottom: 0, width: 380, zIndex: 100,
    background: '#1a1d24', borderLeft: '1px solid #2a2e39', display: 'flex',
    flexDirection: 'column',
  },
  header: { padding: '10px 14px', borderBottom: '1px solid #2a2e39', fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  body: { flex: 1, overflow: 'auto', padding: 12, fontSize: 13, lineHeight: 1.6 },
  inputRow: { display: 'flex', gap: 6, padding: 10, borderTop: '1px solid #2a2e39' },
  input: { flex: 1, padding: 8, borderRadius: 8, border: '1px solid #2a2e39', background: '#111318', color: '#e5e7eb', outline: 'none' },
  btn: { padding: '8px 12px', borderRadius: 8, border: 'none', background: '#3b5bdb', color: '#fff', cursor: 'pointer' },
  actions: { display: 'flex', gap: 6, padding: '6px 10px' },
  chip: { padding: '5px 10px', borderRadius: 12, background: '#2a2e39', color: '#c9ced8', fontSize: 12, cursor: 'pointer', border: 'none' },
  settings: { background: '#111318', borderRadius: 8, padding: 10, marginBottom: 10 },
  config: { width: '100%', marginBottom: 6, padding: 6, borderRadius: 6, border: '1px solid #2a2e39', background: '#1a1d24', color: '#e5e7eb', fontSize: 12 },
  field: { width: '100%', marginBottom: 6, padding: 6, borderRadius: 6, border: '1px solid #2a2e39', background: '#1a1d24', color: '#e5e7eb', fontSize: 12 },
  text: { fontSize: 13 },
}

export default function AIPanel({ onClose, activeTabId }: { onClose: () => void; activeTabId: string }) {
  const [msg, setMsg] = useState('')
  const [out, setOut] = useState('')
  const [busy, setBusy] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [config, setConfig] = useState<AIConfig>({ baseUrl: '', apiKey: '', model: '' })

  useEffect(() => { window.tony?.ai.config().then(c => c && setConfig(c)) }, [])

  async function run(mode: 'chat' | 'summarizePage' | 'summarizeAll', text?: string) {
    if (busy) return
    setBusy(true); setOut('Đang xử lý...')
    try {
      const params: any = { mode, text: text ?? (msg || ''), tabId: activeTabId }
      const res = await window.tony!.ai.ask(params)
      setOut(res.text || '(trống)')
    } catch (e: any) {
      setOut('⚠️ ' + (e?.message || String(e)))
    } finally { setBusy(false) }
  }

  function saveCfg() {
    window.tony?.ai.saveConfig(config).then(() => setShowSettings(false))
  }

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <span>🪄 Trợ lý AI</span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button style={styles.chip} onClick={() => setShowSettings(s => !s)}>⚙️</button>
          <button style={styles.chip} onClick={onClose}>✕</button>
        </div>
      </div>

      {showSettings && (
        <div style={styles.settings}>
          <input style={styles.config} placeholder="Base URL (vd: https://api.openai.com/v1)" value={config.baseUrl}
            onChange={e => setConfig({ ...config, baseUrl: e.target.value })} />
          <input style={styles.config} placeholder="API key" type="password" value={config.apiKey}
            onChange={e => setConfig({ ...config, apiKey: e.target.value })} />
          <input style={styles.config} placeholder="Model (vd: gpt-4o-mini)" value={config.model}
            onChange={e => setConfig({ ...config, model: e.target.value })} />
          <button style={styles.btn} onClick={saveCfg}>Lưu</button>
        </div>
      )}

      <div style={styles.actions}>
        <button style={styles.chip} onClick={() => run('summarizePage')}>📄 Tóm tắt trang</button>
        <button style={styles.chip} onClick={() => run('summarizeAll')}>📚 Tổng hợp tab</button>
      </div>

      <div style={styles.body} className="ai-output">
        <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{out}</pre>
      </div>

      <div style={styles.inputRow}>
        <input style={styles.input} placeholder="Hỏi gì về trang này?" value={msg}
          onChange={e => setMsg(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && run('chat', msg)} />
        <button style={styles.btn} onClick={() => run('chat', msg)}>Gửi</button>
      </div>
    </div>
  )
}