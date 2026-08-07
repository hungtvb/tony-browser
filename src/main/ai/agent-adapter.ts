// AI — PageAdapter thật cho Electron WebContents (thao tác qua executeJavaScript)
import type { WebContents } from 'electron'
import type { PageAdapter } from './agent'

function escapeSelector(sel: string): string {
  return sel.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

export function createWebContentsAdapter(wc: () => WebContents | null): PageAdapter {
  async function snapshot(): Promise<string> {
    const w = wc()
    if (!w || w.isDestroyed()) return '(không có tab)'
    try {
      const text = (await w.executeJavaScript(`
        (() => {
          const getText = () => {
            const clone = document.body ? document.body.cloneNode(true) : null
            if (!clone) return ''
            clone.querySelectorAll('script,style,noscript,svg,canvas').forEach(n => n.remove())
            return (clone.innerText || '').slice(0, 20000)
          }
          const title = document.title || ''
          const url = location.href
          const inputs = [...document.querySelectorAll('input,button,textarea,[role="button"],[role="link"]')]
            .slice(0, 40)
            .map((el, i) => {
              const tag = el.tagName.toLowerCase()
              const id = el.id ? '#' + el.id : ''
              const cls = typeof el.className === 'string' && el.className ? '.' + el.className.split(/\\s+/)[0] : ''
              const label = (el.getAttribute('aria-label') || el.textContent || el.placeholder || '').trim().slice(0, 40)
              return i + ': <' + tag + id + cls + '> ' + label
            })
            .join('\\n')
          return JSON.stringify({ title, url, inputs, text: getText() })
        })()
      `)) as string
      return text || '(trống)'
    } catch (e: any) {
      return '(lỗi đọc trang: ' + (e?.message ?? 'unknown') + ')'
    }
  }

  async function exec(action: string, selector: string, value?: string): Promise<{ ok: boolean; error?: string }> {
    const w = wc()
    if (!w || w.isDestroyed()) return { ok: false, error: 'Không có tab hoạt động' }
    const s = escapeSelector(selector)

    let js = ''
    switch (action) {
      case 'click':
        js = `(() => { const el = document.querySelector('${s}'); if (!el) return {ok:false,error:'Không tìm thấy ${s}'}; el.click(); return {ok:true} })()`
        break
      case 'type':
        js = `(() => {
          const el = document.querySelector('${s}');
          if (!el) return {ok:false,error:'Không tìm thấy ${s}'};
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
            || Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
          if (setter) setter.call(el, ${JSON.stringify(value ?? '')});
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          return {ok:true};
        })()`
        break
      case 'scroll':
        js = `(() => { window.scrollBy(0, ${Math.round(Number(value) || 400)}); return {ok:true} })()`
        break
      case 'navigate':
        js = '' // xử lý riêng
        break
      case 'wait':
        await new Promise(r => setTimeout(r, Math.min(Number(value) || 1000, 5000)))
        return { ok: true }
      default:
        return { ok: false, error: 'Thao tác không hỗ trợ: ' + action }
    }

    try {
      if (action === 'navigate') {
        await w.loadURL(value ?? '')
        return { ok: true }
      }
      const res = (await w.executeJavaScript(js)) as { ok: boolean; error?: string }
      return res
    } catch (e: any) {
      return { ok: false, error: e?.message ?? 'lỗi thực thi' }
    }
  }

  return { snapshot, exec }
}