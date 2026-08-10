import { describe, it, expect } from 'vitest'
import { extractArticle, type ArticleResult } from '../src/main/reader/extract'

describe('Reader Mode extract', () => {
  it('extracts main content, strips nav/ads/scripts', () => {
    const html = `<html><body>
      <nav>Menu</nav>
      <script>bad()</script>
      <style>.x{}</style>
      <div id="content">
        <h1>Article headline</h1>
        <p>The first paragraph of the article.</p>
        <p>The second paragraph covers the main content.</p>
      </div>
      <aside>Advertisement</aside>
      <footer>Footer</footer>
    </body></html>`
    const result = extractArticle(html)
    expect(result.title).toContain('Article headline')
    expect(result.content).toContain('The first paragraph')
    expect(result.content).toContain('The second paragraph')
    expect(result.content).not.toContain('Menu')
    expect(result.content).not.toContain('Advertisement')
    expect(result.content).not.toContain('Footer')
  })

  it('uses <article> when present', () => {
    const html = `<html><body>
      <header>Site header</header>
      <article><h1>Article</h1><p>The main article content.</p></article>
    </body></html>`
    const result = extractArticle(html)
    expect(result.content).toContain('The main article')
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