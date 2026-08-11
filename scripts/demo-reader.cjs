// Reader Mode demo script — proves extraction actually works
const { extractArticle } = require('../out/main/reader/extract.js')

const html = `<!DOCTYPE html>
<html><head><title>Test article — Tony Browser Reader</title></head><body>
  <nav>Main menu · News · Sports</nav>
  <script>alert('ads script')</script>
  <div class="banner-ad">AD: SHOPPING SALE 50% OFF</div>
  <div id="content">
    <h1>Vietnam attracts tech investment in 2026</h1>
    <p>Vietnam's tech industry kept growing strongly over the past year.</p>
    <p>Many local companies have raised international investment.</p>
    <p>The government targets $10B of tech investment by 2030.</p>
  </div>
  <aside>Sidebar ad</aside>
  <footer>© 2026 Test news</footer>
</body></html>`

const result = extractArticle(html)

console.log('=== READER MODE EXTRACT — ACTUAL RESULTS ===')
console.log('Title:', result.title)
console.log('Content:', result.content)
console.log('Length:', result.length)
console.log('')
console.log('Checks:')
console.log('  - Contains "AD:" in content?', result.content.includes('AD:'))
console.log('  - Contains "Main menu" in content?', result.content.includes('Main menu'))
console.log('  - Contains "alert" in content?', result.content.includes('alert'))
console.log('  -> Content CLEAN:', !result.content.includes('AD:') && !result.content.includes('Main menu') && !result.content.includes('alert'))