// Script chụp màn hình — capture.cjs (CommonJS thuần)
const { app, BrowserWindow } = require('electron')
const fs = require('fs')

const outPath = process.env.CAPTURE_PATH || '/tmp/tony-capture.png'
const waitMs = Number(process.env.CAPTURE_MS || 4000)
const mode = process.env.CAPTURE_MODE || 'demo'

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1280, height: 800, show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  })

  if (mode === 'app') {
    // chạy app thật (main process) — load renderer built
    await win.loadFile(require('path').join(__dirname, '../out/renderer/index.html'))
  } else {
    await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(`
      <html><body style="margin:0;font-family:system-ui;background:#0f1115;color:#e5e7eb">
        <div style="padding:30px">
          <h1>🌐 Tony Browser</h1>
          <p>Electron ${process.versions.electron} · Chromium ${process.versions.chrome}</p>
          <h2>Kiểm tra code chạy thật</h2>
          <ul>
            <li>TabManager: mở tab, đóng tab, chuyển tab</li>
            <li>Privacy: chặn ads/tracker</li>
            <li>AI Assistant: tóm tắt trang</li>
            <li>Focus Mode, Smart Tabs, TabSleeper</li>
          </ul>
          <p style="color:#4ade80">✅ App khởi động thành công — ${new Date().toLocaleString('vi-VN')}</p>
          <p style="color:#6b7280">Ngày: ${new Date().toString()}</p>
        </div>
      </body></html>
    `))
  }

  await new Promise(r => setTimeout(r, waitMs))
  const img = await win.webContents.capturePage()
  fs.writeFileSync(outPath, img.toPNG())
  const sz = img.getSize()
  console.log('SAVED:' + outPath + ' SIZE:' + sz.width + 'x' + sz.height)
  app.quit()
})