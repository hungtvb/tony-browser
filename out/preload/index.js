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
  }
};
electron.contextBridge.exposeInMainWorld("tony", api);
