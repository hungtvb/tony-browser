// Tony Browser — Preload script (contextBridge)
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('tony', {
  version: '0.1.0',
  platform: process.platform,
  // Bridge cho các tính năng (sẽ mở rộng)
  getAppInfo: () => ({
    electron: process.versions.electron,
    chrome: process.versions.chrome,
  }),
});
