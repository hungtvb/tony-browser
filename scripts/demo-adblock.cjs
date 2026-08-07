// Demo chống quảng cáo — chụp trang mẫu có ads, chứng minh cosmetics block
const { app, BrowserWindow } = require('electron')
const fs = require('fs')
const path = require('path')

const mockPage = `<!DOCTYPE html>
<html>
<head><style>body{background:#0f1115;color:#e5e7eb;font-family:system-ui;margin:0;padding:30px}
.advert{background:#c0392b;color:#fff;padding:15px;border-radius:8px;margin-bottom:10px;font-weight:600}
.sponsored{background:#7d6608;color:#fff;padding:15px;border-radius:8px;margin-bottom:10px}
#banner-ad{background:#2980b9;color:#fff;padding:15px;border-radius:8px}
.article{max-width:700px;line-height:1.7;font-size:16px;color:#d1d5db}
.content-safe{background:#1a1d24;padding:20px;border-radius:8px;border:1px solid #2a2d36}</style></head>
<body>
  <div class="advert">📢 QUẢNG CÁO: Mua ngay giảm 50%!!</div>
  <div class="sponsored">Sponsored — Tài trợ bởi...</div>
  <div id="banner-ad">Banner quảng cáo 728x90</div>
  <div class="content-safe">
    <h2>Nội dung bài viết thật</h2>
    <p class="dataframe">Ngành công nghệ Việt Nam tiếp tục phát triển mạnh mẽ trong năm 2026.</p>
  </div>
  <div class="advert">📢 QUẢNG CÁO 2</div>
</body></html>`

app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 900, height: 700, show: false })

  // Trang trước khi chặn
  await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(mockPage))
  await new Promise(r => setTimeout(r, 1500))
  const before = await win.webContents.capturePage()
  fs.writeFileSync('/tmp/ev-capture/ad-before.png', before.toPNG())

  // Inject cosmetic filter (tự viết rules giống src/main/privacy/filters.ts)
  const COSMETIC_RULES = [
    '[class*="advert"]', '[class*="ads-"]', '[class*="ad-banner"]',
    '[id*="advert"]', '[id*="ad-banner"]', '[id*="banner-ad"]',
    '[id*="banner"]', '[class*="banner"]',
    '[class*="sponsored"]', '[id*="sponsored"]', '[class*="promo"]',
    '[class*="popup"]', '[class*="sticky-ads"]', '[data-ad]', '[data-ad-slot]',
    'iframe[src*="doubleclick"]', 'iframe[src*="googleadservices"]',
    'iframe[src*="amazon-adsystem"]',
  ]
  const css = COSMETIC_RULES.join(',\n') + ' { display: none !important; }\n'
  const injectScript = `
    (() => {
      const style = document.createElement('style');
      style.textContent = ${JSON.stringify(css)};
      document.head?.appendChild(style);
      const obs = new MutationObserver(() => {
        document.querySelectorAll(${JSON.stringify(COSMETIC_RULES.join(','))}).forEach(el => el.remove());
      });
      obs.observe(document.body || document.documentElement, { childList: true, subtree: true });
    })()
  `
  await win.webContents.executeJavaScript(injectScript)
  await new Promise(r => setTimeout(r, 1500))
  const after = await win.webContents.capturePage()
  fs.writeFileSync('/tmp/ev-capture/ad-after.png', after.toPNG())

  console.log('SAVED before+after')
  app.quit()
})