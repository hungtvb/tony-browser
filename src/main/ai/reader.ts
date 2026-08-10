// AI — PageReader: extracts page content to feed the LLM
import type { WebContents } from 'electron'

export const MAX_PAGE_CHARS = 30000

/** Get the page's main text via executeJavaScript (char limit) */
export async function extractPageText(wc: WebContents, maxChars = MAX_PAGE_CHARS): Promise<string> {
  try {
    const script = `
      (() => {
        const MAX = ${maxChars};
        // Prefer main content when present
        const main = document.querySelector('main, article, [role="main"]');
        const source = main || document.body;
        const text = (source ? source.innerText : '').replace(/\\s+/g, ' ').trim();
        const title = document.title || '';
        const url = location.href;
        return JSON.stringify({ title, url, text: text.slice(0, MAX) });
      })()
    `
    const result = await wc.executeJavaScript(script, true)
    const parsed = typeof result === 'string' ? JSON.parse(result) : result
    return parsed?.text ?? ''
  } catch {
    return ''
  }
}

/** Get the page title + URL */
export async function extractPageMeta(wc: WebContents): Promise<{ title: string; url: string }> {
  try {
    const title = wc.getTitle() || ''
    const url = wc.getURL() || ''
    return { title, url }
  } catch {
    return { title: '', url: '' }
  }
}
