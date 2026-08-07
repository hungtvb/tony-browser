// Tony Browser — Electron main process
import { app, BrowserWindow, session } from 'electron';
import path from 'path';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'Tony Browser',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Load UI (sẽ thay bằng Vite dev server khi renderer sẵn sàng)
  mainWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(`
    <html>
      <body style="font-family:system-ui;display:flex;justify-content:center;align-items:center;height:100vh;background:#0f1115;color:#e5e7eb;margin:0">
        <div style="text-align:center">
          <h1>🌐 Tony Browser</h1>
          <p>Khung đang được dựng... Khởi động thành công ✅</p>
          <p style="color:#6b7280;font-size:14px">Electron ${process.versions.electron} | Chromium ${process.versions.chrome}</p>
        </div>
      </body>
    </html>
  `));

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(() => {
  // Chặn quảng cáo/tracker cơ bản (Ý #4 - Privacy)
  session.defaultSession.webRequest.onBeforeRequest({ urls: [] }, (details, callback) => {
    // TODO: load blocklist từ EasyList/AdGuard
    callback({});
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
