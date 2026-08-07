// Script demo Reader Mode — chứng minh extract hoạt động thật
const { extractArticle } = require('../out/main/reader/extract.js')

const html = `<!DOCTYPE html>
<html><head><title>Bài báo test — Tony Browser Reader</title></head><body>
  <nav>Menu chính · Tin tức · Thể thao</nav>
  <script>alert('ads script')</script>
  <div class="banner-ad">QUẢNG CÁO MUA HÀNG GIẢM GIÁ 50%</div>
  <div id="content">
    <h1>Việt Nam hút vốn đầu tư công nghệ năm 2026</h1>
    <p>Ngành công nghệ Việt Nam tiếp tục tăng trưởng mạnh mẽ trong năm qua.</p>
    <p>Nhiều doanh nghiệp nội địa đã huy động được vốn đầu tư quốc tế.</p>
    <p>Chính phủ đặt mục tiêu 10 tỷ USD đầu tư công nghệ vào 2030.</p>
  </div>
  <aside>Quảng cáo bên cạnh</aside>
  <footer>© 2026 Báo test</footer>
</body></html>`

const result = extractArticle(html)

console.log('=== READER MODE EXTRACT — KẾT QUẢ THỰC ===')
console.log('Title:', result.title)
console.log('Content:', result.content)
console.log('Length:', result.length)
console.log('')
console.log('Kiểm tra:')
console.log('  - Có "QUẢNG CÁO" trong content?', result.content.includes('QUẢNG CÁO'))
console.log('  - Có "Menu chính" trong content?', result.content.includes('Menu chính'))
console.log('  - Có "alert" trong content?', result.content.includes('alert'))
console.log('  -> Content SẠCH:', !result.content.includes('QUẢNG CÁO') && !result.content.includes('Menu chính') && !result.content.includes('alert'))
