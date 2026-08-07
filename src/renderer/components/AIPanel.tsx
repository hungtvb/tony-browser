import React, { useState, useEffect } from 'react'
import type { AIConfig } from '../../shared/types'

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
    flex: 1, padding: 8, borderRadius: 980, border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.08)', color: '#fff', outline: 'none', fontSize: 13,
  },
  btn: { padding: '8px 14px', borderRadius: 980, border: 'none', background: 'var(--apple-blue)', color: '#fff', cursor: 'pointer', fontSize: 13 },
  actions: { display: 'flex', gap: 6, padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' },
  chip: {
    padding: '4px 12px', borderRadius: 980, background: 'rgba(255,255,255,0.08)',
    color: 'rgba(255,255,255,0.85)', fontSize: 11, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)',
  },
  settings: { background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 12, margin: '0 14px', marginTop: 10 },
  config: {
    width: '100%', marginBottom: 8, padding: 7, borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(0,0,0,0.3)',
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

  useEffect(() => { window.tony?.ai.config().then(c => c && setConfig(c)) }, [])

  async function run(mode: 'chat' | 'summarizePage' | 'summarizeAll' | 'act', text?: string) {
    if (busy) return
    setBusy(true); setOut('Đang xử lý...')
    try {
      const params: any = { mode, text: text ?? (mode === 'act' ? manualActCommand : msg || ''), tabId: activeTabId }
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
    <div style={styles.panel} className="anim-slide-right">
          <div style={styles.header}>
        <span>🪄 Trợ lý AI</span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="apple-focus" style={styles.chip} onClick={() => setShowSettings(s => !s)}>⚙️</button>
          <button className="apple-focus" style={styles.chip} onClick={onClose}>✕</button>
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
          <button className="apple-focus" style={{ ...styles.btn, width: '100%' }} onClick={saveCfg}>Lưu cấu hình</button>
        </div>
      )}

      <div style={styles.actions}>
        <button className="apple-focus" style={styles.chip} onClick={() => run('summarizePage')}>📄 Tóm tắt trang</button>
        <button className="apple-focus" style={styles.chip} onClick={() => run('summarizeAll')}>📚 Tổng hợp tab</button>
        <button className="apple-focus" style={styles.chip} onClick={() => run('act')}>🤖 Thao tác web</button>
      </div>

      <div style={{ padding: '6px 14px', display: 'flex', gap: 6 }}>
        <input style={styles.input} placeholder='VD: "Click nút Mua ngay"' value={manualActCommand}
          onChange={e => setManualActCommand(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && run('act')} />
      </div>

      <div style={styles.body}>
        <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}>{out}</pre>
      </div>

      <div style={styles.inputRow}>
        <input style={styles.input} placeholder="Hỏi gì về trang này?" value={msg}
          onChange={e => setMsg(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && run('chat', msg)} />
        <button className="apple-focus" style={styles.btn} onClick={() => run('chat', msg)}>Gửi</button>
      </div>
    </div>
  )
}