// Test thật: mở YouTube qua Electron, kiểm tra block + chụp
const { app, BrowserWindow } = require('electron')

app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1280, height: 800, show: false })
  let blocked = 0

  // Mô phỏng privacy filter — chặn request ads youtube
  const { session } = win.webContents

  // dùng webRequest chặn theo pattern ad (cùng logic isYouTubeAdRequest)
  session.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, callback) => {
    const url = details.url.toLowerCase()
    const isAd = /googleads\.|pagead\/|doubleclick\.net\/pagead|adservice\.google\.com|yt-ads/.test(url)
    if (isAd) { blocked++; callback({ cancel: true }) } else { callback({}) }
  })

  await win.loadURL('https://www.youtube.com/', { userAgent: undefined })
  await new Promise(r => setTimeout(r, 12000))
  const img = await win.webContents.capturePage()
  require('fs').writeFileSync('/tmp/ev-capture/youtube-test.png', img.toPNG())
  const title = await win.webContents.getTitle()
  const url = win.webContents.getURL()
  console.log('TITLE:' + title)
  console.log('URL:' + url)
  console.log('BLOCKED_ADS:' + blocked)
  console.log('SAVED /tmp/ev-capture/youtube-test.png')
  app.quit()
})