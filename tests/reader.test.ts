import { describe, it, expect } from 'vitest'
import { extractArticle, type ArticleResult } from '../src/main/reader/extract'

describe('Reader Mode extract', () => {
  it('extracts main content, strips nav/ads/scripts', () => {
    const html = `<html><body>
      <nav>Menu</nav>
      <script>bad()</script>
      <style>.x{}</style>
      <div id="content">
        <h1>Tiêu đề bài báo</h1>
        <p>Đoạn đầu tiên của bài viết.</p>
        <p>Đoạn thứ hai nói về nội dung chính.</p>
      </div>
      <aside>Quảng cáo</aside>
      <footer>Footer</footer>
    </body></html>`
    const result = extractArticle(html)
    expect(result.title).toContain('Tiêu đề bài báo')
    expect(result.content).toContain('Đoạn đầu tiên')
    expect(result.content).toContain('Đoạn thứ hai')
    expect(result.content).not.toContain('Menu')
    expect(result.content).not.toContain('Quảng cáo')
    expect(result.content).not.toContain('Footer')
  })

  it('uses <article> when present', () => {
    const html = `<html><body>
      <header>Site header</header>
      <article><h1>Bài viết</h1><p>Nội dung article chính.</p></article>
    </body></html>`
    const result = extractArticle(html)
    expect(result.content).toContain('Nội dung article')
  })

  it('strips script/style/noscript/iframe', () => {
    const html = `<div><h1>X</h1><script>var a=1</script><style>body{}</style><iframe src="ads"></iframe><p>Text</p></div>`
    const result = extractArticle(html)
    expect(result.content).not.toContain('var a=1')
    expect(result.content).not.toContain('body{}')
    expect(result.content).not.toContain('ads')
    expect(result.content).toContain('Text')
  })

  it('returns readable text, not HTML tags', () => {
    const html = `<div><h1>Hello</h1><p>World <b>bold</b></p></div>`
    const result = extractArticle(html)
    expect(result.content).toContain('World')
    expect(result.content).not.toContain('<b>')
    expect(result.content).not.toContain('<h1>')
  })
})