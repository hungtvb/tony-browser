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
    open: (url, container) => electron.ipcRenderer.invoke("tabs:open", url, container),
    openContainer: (url, container) => electron.ipcRenderer.invoke("tabs:openContainer", url, container),
    close: (id) => electron.ipcRenderer.invoke("tabs:close", id),
    activate: (id) => electron.ipcRenderer.invoke("tabs:activate", id),
    list: () => electron.ipcRenderer.invoke("tabs:list"),
    stacks: () => electron.ipcRenderer.invoke("tabs:stacks"),
    search: (q) => electron.ipcRenderer.invoke("tabs:search", q),
    split: (aId, bId) => electron.ipcRenderer.invoke("tabs:split", aId, bId),
    splitState: () => electron.ipcRenderer.invoke("tabs:splitState"),
    undoClose: () => electron.ipcRenderer.invoke("tabs:undoClose"),
    closedCount: () => electron.ipcRenderer.invoke("tabs:closedCount"),
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
  },
  focus: {
    state: () => electron.ipcRenderer.invoke("focus:state"),
    toggle: (on) => electron.ipcRenderer.invoke("focus:toggle", on),
    setBlocklist: (list) => electron.ipcRenderer.invoke("focus:setBlocklist", list),
    setWhitelist: (list) => electron.ipcRenderer.invoke("focus:setWhitelist", list)
  },
  smarttab: {
    groups: (mode) => electron.ipcRenderer.invoke("smarttab:groups", mode),
    saveSession: (name) => electron.ipcRenderer.invoke("smarttab:saveSession", name),
    sessions: () => electron.ipcRenderer.invoke("smarttab:sessions"),
    restoreSession: (name) => electron.ipcRenderer.invoke("smarttab:restoreSession", name)
  },
  sleeper: {
    evaluate: () => electron.ipcRenderer.invoke("sleeper:evaluate"),
    activity: (id) => electron.ipcRenderer.invoke("sleeper:activity", id)
  },
  reader: {
    extract: (tabId) => electron.ipcRenderer.invoke("reader:extract", tabId)
  },
  pip: {
    start: (tabId) => electron.ipcRenderer.invoke("pip:start", tabId),
    stop: (tabId) => electron.ipcRenderer.invoke("pip:stop", tabId)
  },
  tts: {
    speak: (tabId) => electron.ipcRenderer.invoke("tts:speak", tabId),
    stop: () => electron.ipcRenderer.invoke("tts:stop")
  }
};
electron.contextBridge.exposeInMainWorld("tony", api);
