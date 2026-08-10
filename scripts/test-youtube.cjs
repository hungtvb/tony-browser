// Real test: open YouTube via Electron, check blocking + capture
const { app, BrowserWindow } = require('electron')

app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1280, height: 800, show: false })
  let blocked = 0

  // Simulate privacy filter — block youtube ad requests
  const { session } = win.webContents

  // use webRequest to block by ad pattern (same logic as isYouTubeAdRequest)
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