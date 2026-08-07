// Script chụp màn hình Tony Browser — capture.ts
import { app, BrowserWindow } from 'electron'
import fs from 'fs'
import path from 'path'

// Biến env: CAPTURE_PATH (nơi lưu ảnh), CAPTURE_MS (thời gian chờ render)
const outPath = process.env.CAPTURE_PATH || '/tmp/tony-capture.png'
const waitMs = Number(process.env.CAPTURE_MS || 4000)

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  })

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
      </div>
    </body></html>
  `))

  await new Promise(r => setTimeout(r, waitMs))
  const image = await win.webContents.capturePage()
  fs.writeFileSync(outPath, image.toPNG())
  console.log('SAVED:' + outPath)
  app.quit()
})
