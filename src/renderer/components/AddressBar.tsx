import React, { useState } from 'react'

const styles: Record<string, React.CSSProperties> = {
  bar: { display: 'flex', gap: 8, padding: '8px 10px', background: '#14161c', borderBottom: '1px solid #2a2e39' },
  input: { flex: 1, padding: '8px 14px', borderRadius: 20, border: '1px solid #2a2e39', background: '#1a1d24', color: '#e5e7eb', fontSize: 14, outline: 'none' },
  btn: { padding: '8px 16px', borderRadius: 20, border: 'none', background: '#3b5bdb', color: '#fff', cursor: 'pointer', fontWeight: 600 },
  ai: { padding: '8px 14px', borderRadius: 20, border: '1px solid #2a2e39', background: '#1a1d24', cursor: 'pointer', fontSize: 16 },
}

export default function AddressBar({ onNavigate }: { onNavigate: (url: string) => void }) {
  const [value, setValue] = useState('')

  function go() {
    const v = value.trim()
    if (!v) return
    const url = /^https?:\/\//i.test(v) ? v : `https://${v}`
    onNavigate(url)
  }

  return (
    <div style={styles.bar}>
      <input style={styles.input} placeholder="Nhập địa chỉ web hoặc tìm kiếm..." value={value}
        onChange={e => setValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && go()} />
      <button style={styles.btn} onClick={go}>Đi</button>
      <button style={styles.ai} title="Trợ lý AI">🪄</button>
    </div>
  )
}