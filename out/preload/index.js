"use strict";
const electron = require("electron");
const api = {
  version: "0.2.0",
  platform: process.platform,
  getAppInfo: () => ({
    electron: process.versions.electron,
    chrome: process.versions.chrome
  }),
  tabs: {
    open: (url) => electron.ipcRenderer.invoke("tabs:open", url),
    close: (id) => electron.ipcRenderer.invoke("tabs:close", id),
    activate: (id) => electron.ipcRenderer.invoke("tabs:activate", id),
    list: () => electron.ipcRenderer.invoke("tabs:list"),
    onChange: (cb) => {
      electron.ipcRenderer.on("tabs:changed", (_e, tabs) => cb(tabs));
    }
  },
  privacy: {
    stats: () => electron.ipcRenderer.invoke("privacy:stats"),
    toggle: (on) => electron.ipcRenderer.invoke("privacy:toggle", on)
  },
  ai: {
    config: () => electron.ipcRenderer.invoke("ai:config"),
    saveConfig: (cfg) => electron.ipcRenderer.invoke("ai:saveConfig", cfg),
    ask: (params) => electron.ipcRenderer.invoke("ai:ask", params),
    status: () => electron.ipcRenderer.invoke("ai:status")
  }
};
electron.contextBridge.exposeInMainWorld("tony", api);
