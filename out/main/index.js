"use strict";
const electron = require("electron");
const path = require("path");
const events = require("events");
const TOOLBAR_HEIGHT = 92;
function createMainWindow() {
  const win = new electron.BrowserWindow({
    width: 1280,
    height: 800,
    title: "Tony Browser",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  const devUrl = process.env["ELECTRON_RENDERER_URL"];
  if (devUrl) {
    win.loadURL(devUrl);
  } else {
    win.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
  return win;
}
function attachView(win, view) {
  if (view.webContents.isDestroyed()) return;
  win.contentView.addChildView(view);
  const [w, h] = win.getContentSize();
  view.setBounds({ x: 0, y: TOOLBAR_HEIGHT, width: w, height: Math.max(h - TOOLBAR_HEIGHT, 0) });
  view.setVisible(true);
}
function detachView(win, view) {
  if (view.webContents.isDestroyed()) return;
  win.contentView.removeChildView(view);
}
function createTabView(url) {
  const view = new electron.WebContentsView({
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  view.setVisible(false);
  view.webContents.loadURL(url).catch(() => {
    view.webContents.loadURL('data:text/html,<h1 style="font-family:sans-serif">Không tải được trang</h1>');
  });
  return view;
}
function ensureSession() {
  const ses = electron.session.defaultSession;
  ses.setPermissionRequestHandler((_wc, permission, callback) => {
    const allow = ["clipboard-read", "clipboard-sanitized-write", "fullscreen", "media", "geolocation", "notifications", "pointerLock"];
    callback(allow.includes(permission));
  });
  return ses;
}
function createTabManager(factory) {
  const emitter = new events.EventEmitter();
  const tabs = /* @__PURE__ */ new Map();
  let activeId = "";
  let counter = 0;
  function open(url) {
    const id = `tab-${++counter}-${Date.now()}`;
    const view = factory(id);
    const tab = { id, url, title: "New Tab", loading: true, view };
    tabs.set(id, tab);
    activeId = id;
    view.loadURL(url);
    emitter.emit("changed", { type: "open", id });
    return tab;
  }
  function close(id) {
    const tab = tabs.get(id);
    if (!tab) return;
    tab.view.destroy();
    tabs.delete(id);
    if (activeId === id) {
      const remaining = [...tabs.keys()];
      activeId = remaining.length ? remaining[remaining.length - 1] : "";
    }
    emitter.emit("changed", { type: "close", id });
  }
  function activate(id) {
    if (!tabs.has(id)) return;
    activeId = id;
    emitter.emit("changed", { type: "activate", id });
  }
  function list() {
    return [...tabs.values()];
  }
  function get(id) {
    return tabs.get(id);
  }
  function getActive() {
    return tabs.get(activeId);
  }
  function broadcast() {
    emitter.emit("changed", { type: "sync", id: activeId });
  }
  return {
    open,
    close,
    activate,
    list,
    get,
    getActive,
    broadcast,
    on: emitter.on.bind(emitter),
    get activeId() {
      return activeId;
    }
  };
}
function createBlocklist(domains) {
  const set = new Set(domains.map((d) => d.trim().toLowerCase().replace(/^\./, "")).filter(Boolean));
  return {
    shouldBlock(url) {
      try {
        const host = new URL(url).hostname.toLowerCase();
        if (set.has(host)) return true;
        for (const d of set) {
          if (host.endsWith("." + d)) return true;
        }
        return false;
      } catch {
        return false;
      }
    },
    get size() {
      return set.size;
    }
  };
}
const blocklistDomains = [
  "doubleclick.net",
  "googlesyndication.com",
  "googleadservices.com",
  "google-analytics.com",
  "googletagmanager.com",
  "googletagservices.com",
  "facebook.com/tr",
  "connect.facebook.net",
  "fbcdn.net",
  "ads.facebook.com",
  "analytics.tiktok.com",
  "ads.tiktok.com",
  "tiktokv.com",
  "youtube-nocookie.com",
  "scorecardresearch.com",
  "quantserve.com",
  "adnxs.com",
  "adsrvr.org",
  "criteo.com",
  "criteo.net",
  "taboola.com",
  "outbrain.com",
  "mgid.com",
  "adroll.com",
  "amazon-adsystem.com",
  "aaxads.com",
  "advertising.com",
  "media.net",
  "pubmatic.com",
  "rubiconproject.com",
  "openx.net",
  "spotxchange.com",
  "lijit.com",
  "sovrn.com",
  "yieldmo.com",
  "gumgum.com",
  "indexexchange.com",
  "contextweb.com",
  "casalemedia.com",
  "districtm.io",
  "smartadserver.com",
  "undertone.com",
  "teads.tv",
  "sharethrough.com",
  "revcontent.com",
  "content.ad",
  "tribalfusion.com",
  "zedo.com",
  "adform.net",
  "moatads.com",
  "innovid.com",
  "spotify.com/ads",
  "hotjar.com",
  "fullstory.com",
  "mixpanel.com",
  "segment.com",
  "amplitude.com",
  "braze.com",
  "optimizely.com",
  "crazyegg.com",
  "mouseflow.com",
  "luckyorange.com",
  "clarity.ms",
  "newrelic.com",
  "datadoghq.com",
  "sentry.io",
  "bugsnag.com",
  "logrocket.com",
  "plausible.io",
  "matomo.org",
  "chartbeat.com",
  "parsely.com",
  "comscore.com",
  "nielsen.com",
  "bluekai.com",
  "krxd.net",
  "tapad.com",
  "demdex.net",
  "omtrdc.net",
  "everesttech.net",
  "2mdn.net",
  "flashtalking.com",
  "adcolony.com",
  "vungle.com",
  "unityads.unity3d.com",
  "chartboost.com",
  "applovin.com",
  "mopub.com",
  "inmobi.com",
  "adzerk.net",
  "bidswitch.net",
  "brealtime.com",
  "lh3.googleusercontent.com/ads",
  "gstatic.com/ads",
  "ytimg.com/ads",
  "gravatar.com"
];
let privacyFilterOn = true;
let blockedCount = 0;
let listSize = 0;
function tabToState(t) {
  return { id: t.id, url: t.url, title: t.title, loading: t.loading };
}
function attachPrivacy(win, _deps) {
  const { session } = win.webContents;
  const bl = createBlocklist(blocklistDomains);
  listSize = bl.size;
  session.webRequest.onBeforeRequest({ urls: ["*://*/*"] }, (details, callback) => {
    if (privacyFilterOn && bl.shouldBlock(details.url)) {
      blockedCount++;
      callback({ cancel: true });
    } else {
      callback({});
    }
  });
}
function registerIpc(deps2) {
  const tm2 = deps2.getTabManager();
  const win = deps2.getWindow;
  electron.ipcMain.handle("tabs:list", () => tm2.list().map(tabToState));
  electron.ipcMain.handle("tabs:open", (_e, url) => {
    const tab = tm2.open(url);
    const view = deps2.createRealView(tab.url);
    deps2.trackView(tab.id, view);
    const w = win();
    if (w) attachView(w, view);
    return tabToState(tab);
  });
  electron.ipcMain.handle("tabs:close", (_e, id) => {
    const view = deps2.getActiveView(id);
    if (view) {
      const w = win();
      if (w) detachView(w, view);
      if (!view.webContents.isDestroyed()) view.webContents.close();
      deps2.trackView(id, null);
    }
    tm2.close(id);
    broadcastTabs();
    return true;
  });
  electron.ipcMain.handle("tabs:activate", (_e, id) => {
    tm2.activate(id);
    const w = win();
    if (w) {
      for (const tab of tm2.list()) {
        const v = deps2.getActiveView(tab.id);
        if (v) v.setVisible(tab.id === id);
      }
    }
    broadcastTabs();
    return true;
  });
  electron.ipcMain.handle("privacy:stats", () => ({ blocked: blockedCount, listSize }));
  electron.ipcMain.handle("privacy:toggle", (_e, on) => {
    privacyFilterOn = on;
    return on;
  });
  function broadcastTabs() {
    const w = win();
    if (w && !w.webContents.isDestroyed()) {
      w.webContents.send("tabs:changed", tm2.list().map(tabToState));
    }
  }
  tm2.on("changed", broadcastTabs);
  return { broadcastTabs };
}
let mainWindow = null;
const viewByTab = /* @__PURE__ */ new Map();
const tm = createTabManager(() => ({
  id: "",
  loadURL: () => {
  },
  destroy: () => {
  }
}));
const deps = {
  getWindow: () => mainWindow,
  getTabManager: () => tm,
  trackView: (tabId, view) => {
    if (!view) {
      viewByTab.delete(tabId);
      return;
    }
    viewByTab.set(tabId, view);
    view.webContents.on("page-title-updated", (_e, title) => {
      const t = tm.get(tabId);
      if (t) {
        t.title = title;
        tm.broadcast();
      }
    });
  },
  getActiveView: (tabId) => viewByTab.get(tabId),
  createRealView: (url) => createTabView(url)
};
electron.app.whenReady().then(() => {
  ensureSession();
  mainWindow = createMainWindow();
  attachPrivacy(mainWindow);
  registerIpc(deps);
  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) mainWindow = createMainWindow();
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") electron.app.quit();
});
