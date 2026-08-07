"use strict";
const electron = require("electron");
const path = require("path");
const events = require("events");
const fs = require("fs");
function _interopNamespaceDefault(e) {
  const n = Object.create(null, { [Symbol.toStringTag]: { value: "Module" } });
  if (e) {
    for (const k in e) {
      if (k !== "default") {
        const d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: () => e[k]
        });
      }
    }
  }
  n.default = e;
  return Object.freeze(n);
}
const path__namespace = /* @__PURE__ */ _interopNamespaceDefault(path);
const fs__namespace = /* @__PURE__ */ _interopNamespaceDefault(fs);
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
class AIService {
  config = null;
  _busy = false;
  setConfig(cfg) {
    this.config = cfg;
  }
  getConfig() {
    return this.config;
  }
  get configured() {
    return !!this.config?.baseUrl && !!this.config?.apiKey && !!this.config?.model;
  }
  get busy() {
    return this._busy;
  }
  /** Gọi LLM chat completions, trả text cuối */
  async ask(params, pageText) {
    const cfg = this.config;
    if (!cfg) throw new Error("AI chưa được cấu hình");
    if (!this.configured) throw new Error("Thiếu baseUrl/apiKey/model");
    this._busy = true;
    try {
      const system = this.systemPrompt();
      const user = this.buildUserMessage(params, pageText);
      const body = {
        model: cfg.model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user }
        ],
        temperature: 0.3
      };
      const endpoint = cfg.baseUrl.replace(/\/+$/, "") + "/chat/completions";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${cfg.apiKey}`
        },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const errText = (await res.text()).slice(0, 200);
        throw new Error(`LLM API lỗi ${res.status}: ${errText}`);
      }
      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content ?? "";
      return content.trim();
    } finally {
      this._busy = false;
    }
  }
  systemPrompt() {
    return `Bạn là Kenzo, trợ lý AI trong "Tony Browser". Trả lời ngắn gọn, súc tích, đúng trọng tâm.
Khi được yêu cầu tóm tắt trang web, hãy đưa ra bản tóm tắt mạch lạc bằng tiếng Việt (hoặc ngôn ngữ người dùng dùng), nếu trang là tiếng Anh thì tóm tắt bằng tiếng Việt có giữ nguyên thuật ngữ chuyên môn quan trọng. Không bịa thông tin không có trong nội dung cung cấp.`;
  }
  buildUserMessage(params, pageText) {
    const { mode, text } = params;
    if (mode === "summarizePage") {
      return `Tóm tắt trang web sau (title/url và nội dung):
—— NỘI DUNG TRANG ——
${pageText || "(không đọc được nội dung)"}
—— HẾT ——
Yêu cầu: đưa tóm tắt rõ ràng (3-6 gạch đầu dòng) bằng tiếng Việt.`;
    }
    if (mode === "summarizeAll") {
      return `Đây là nội dung nhiều tab đang mở trong trình duyệt. Tổng hợp thành 1 báo cáo gọn theo từng tab, bằng tiếng Việt:
${pageText || "(không có nội dung)"}`;
    }
    return pageText ? `Người dùng hỏi: """${text}"""

Dưới đây là nội dung trang hiện tại (có thể liên quan câu hỏi):
"""
${pageText}
"""

Trả lời giúp người dùng.` : text;
  }
}
const MAX_PAGE_CHARS = 3e4;
async function extractPageText(wc, maxChars = MAX_PAGE_CHARS) {
  try {
    const script = `
      (() => {
        const MAX = ${maxChars};
        // Ưu tiên main content nếu có
        const main = document.querySelector('main, article, [role="main"]');
        const source = main || document.body;
        const text = (source ? source.innerText : '').replace(/\\s+/g, ' ').trim();
        const title = document.title || '';
        const url = location.href;
        return JSON.stringify({ title, url, text: text.slice(0, MAX) });
      })()
    `;
    const result = await wc.executeJavaScript(script, true);
    const parsed = typeof result === "string" ? JSON.parse(result) : result;
    return parsed?.text ?? "";
  } catch {
    return "";
  }
}
async function extractPageMeta(wc) {
  try {
    const title = wc.getTitle() || "";
    const url = wc.getURL() || "";
    return { title, url };
  } catch {
    return { title: "", url: "" };
  }
}
function configPath() {
  return path__namespace.join(electron.app.getPath("userData"), "tony-config.json");
}
function loadAIConfig() {
  try {
    const p = configPath();
    if (!fs__namespace.existsSync(p)) return null;
    const data = JSON.parse(fs__namespace.readFileSync(p, "utf-8"));
    return data?.aiConfig ?? null;
  } catch {
    return null;
  }
}
function saveAIConfig(cfg) {
  try {
    const p = configPath();
    const existing = loadAIConfig();
    const payload = { ...existing ? { aiConfig: existing } : {}, aiConfig: cfg };
    fs__namespace.mkdirSync(path__namespace.dirname(p), { recursive: true });
    fs__namespace.writeFileSync(p, JSON.stringify(payload, null, 2));
  } catch (e) {
    console.error("Không lưu được config:", e);
  }
}
const ACTION_TYPES = /* @__PURE__ */ new Set(["click", "type", "scroll", "navigate", "wait"]);
function createAgentCore(adapter) {
  function parseActions(actionsJson) {
    const parsed = [];
    for (const raw of actionsJson) {
      const json = raw.trim();
      if (!json) continue;
      const match = json.match(/```(?:json)?\s*([\s\S]*?)```/);
      const body = match ? match[1] : json;
      try {
        const obj = JSON.parse(body);
        const list = Array.isArray(obj) ? obj : [obj];
        for (const a of list) {
          if (a && typeof a.type === "string" && ACTION_TYPES.has(a.type)) {
            parsed.push({ type: a.type, selector: a.selector, value: a.value });
          }
        }
      } catch {
      }
    }
    return parsed;
  }
  async function run(actionsJson) {
    const actions = parseActions(actionsJson);
    if (actions.length === 0) {
      return { summary: 'Không tìm thấy thao tác hợp lệ (cần JSON như {"type":"click","selector":"..."})', actionsTaken: [] };
    }
    const taken = [];
    for (const a of actions) {
      if (a.type === "navigate" && a.value) {
        await adapter.exec("navigate", "", a.value);
        taken.push(`navigate ${a.value}`);
        continue;
      }
      if (a.type === "wait") {
        taken.push("wait");
        continue;
      }
      const res = await adapter.exec(a.type, a.selector ?? "", a.value);
      taken.push(`${a.type} ${a.selector ?? ""}`);
      if (!res.ok) {
        return { summary: `Lỗi khi thực hiện ${a.type} ${a.selector}: ${res.error ?? "không rõ"}`, actionsTaken: taken };
      }
    }
    return { summary: `Đã thực hiện ${taken.length} thao tác: ${taken.join(" → ")}`, actionsTaken: taken };
  }
  async function plan(goal) {
    const snap = await adapter.snapshot();
    return snap;
  }
  return { run, parseActions, plan };
}
function escapeSelector(sel) {
  return sel.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}
function createWebContentsAdapter(wc) {
  async function snapshot() {
    const w = wc();
    if (!w || w.isDestroyed()) return "(không có tab)";
    try {
      const text = await w.executeJavaScript(`
        (() => {
          const getText = () => {
            const clone = document.body ? document.body.cloneNode(true) : null
            if (!clone) return ''
            clone.querySelectorAll('script,style,noscript,svg,canvas').forEach(n => n.remove())
            return (clone.innerText || '').slice(0, 20000)
          }
          const title = document.title || ''
          const url = location.href
          const inputs = [...document.querySelectorAll('input,button,textarea,[role="button"],[role="link"]')]
            .slice(0, 40)
            .map((el, i) => {
              const tag = el.tagName.toLowerCase()
              const id = el.id ? '#' + el.id : ''
              const cls = typeof el.className === 'string' && el.className ? '.' + el.className.split(/\\s+/)[0] : ''
              const label = (el.getAttribute('aria-label') || el.textContent || el.placeholder || '').trim().slice(0, 40)
              return i + ': <' + tag + id + cls + '> ' + label
            })
            .join('\\n')
          return JSON.stringify({ title, url, inputs, text: getText() })
        })()
      `);
      return text || "(trống)";
    } catch (e) {
      return "(lỗi đọc trang: " + (e?.message ?? "unknown") + ")";
    }
  }
  async function exec(action, selector, value) {
    const w = wc();
    if (!w || w.isDestroyed()) return { ok: false, error: "Không có tab hoạt động" };
    const s = escapeSelector(selector);
    let js = "";
    switch (action) {
      case "click":
        js = `(() => { const el = document.querySelector('${s}'); if (!el) return {ok:false,error:'Không tìm thấy ${s}'}; el.click(); return {ok:true} })()`;
        break;
      case "type":
        js = `(() => {
          const el = document.querySelector('${s}');
          if (!el) return {ok:false,error:'Không tìm thấy ${s}'};
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
            || Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
          if (setter) setter.call(el, ${JSON.stringify(value ?? "")});
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          return {ok:true};
        })()`;
        break;
      case "scroll":
        js = `(() => { window.scrollBy(0, ${Math.round(Number(value) || 400)}); return {ok:true} })()`;
        break;
      case "navigate":
        js = "";
        break;
      case "wait":
        await new Promise((r) => setTimeout(r, Math.min(Number(value) || 1e3, 5e3)));
        return { ok: true };
      default:
        return { ok: false, error: "Thao tác không hỗ trợ: " + action };
    }
    try {
      if (action === "navigate") {
        await w.loadURL(value ?? "");
        return { ok: true };
      }
      const res = await w.executeJavaScript(js);
      return res;
    } catch (e) {
      return { ok: false, error: e?.message ?? "lỗi thực thi" };
    }
  }
  return { snapshot, exec };
}
class AIController {
  constructor(deps2) {
    this.deps = deps2;
    const cfg = loadAIConfig();
    if (cfg) this.service.setConfig(cfg);
  }
  deps;
  service = new AIService();
  getConfig() {
    return this.service.getConfig();
  }
  saveConfig(cfg) {
    this.service.setConfig(cfg);
    saveAIConfig(cfg);
    return true;
  }
  status() {
    return { configured: this.service.configured, busy: this.service.busy };
  }
  async ask(params) {
    const tabId = params.tabId;
    const view = tabId ? this.deps.getActiveView(tabId) : void 0;
    const wc = view?.webContents;
    if (params.mode === "act") {
      if (!wc) throw new Error("Không có tab hoạt động để thao tác");
      const adapter = createWebContentsAdapter(() => wc);
      const agent = createAgentCore(adapter);
      const snap = await adapter.snapshot();
      const goal = params.text || "";
      const planText = await this.service.ask(
        { mode: "chat", text: `Bạn là AI điều khiển trình duyệt. Trang hiện tại:
${snap}

Nhiệm vụ: ${goal}
Hãy trả về JSON array các hành động: [{"type":"click","selector":"#id"},{"type":"type","selector":"#id","value":"..."},{"type":"scroll","value":400}]. Chỉ dùng selector có trong trang.` },
        void 0
      );
      const actions = this.extractJsonArray(planText);
      if (actions.length === 0) return `Không xác định được hành động. AI trả: ${planText.slice(0, 300)}`;
      const result = await agent.run(actions.map((a) => JSON.stringify(a)));
      return result.summary;
    }
    let pageText;
    if (params.mode === "summarizePage" && wc) {
      const [text, meta] = await Promise.all([
        extractPageText(wc),
        extractPageMeta(wc)
      ]);
      pageText = `Title: ${meta.title}
URL: ${meta.url}

${text}`;
    }
    if (params.mode === "summarizeAll") {
      const tm2 = this.deps.getTabManager();
      const parts = [];
      for (const tab of tm2.list()) {
        const v = this.deps.getActiveView(tab.id);
        if (!v) continue;
        const [text, meta] = await Promise.all([
          extractPageText(v.webContents, 8e3),
          extractPageMeta(v.webContents)
        ]);
        parts.push(`### ${meta.title || tab.title} (${meta.url})
${text.slice(0, 8e3)}`);
      }
      pageText = parts.join("\n\n");
    }
    return this.service.ask(params, pageText);
  }
  /** Trích JSON array từ chuỗi LLM trả về (có thể bọc trong code block) */
  extractJsonArray(text) {
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return [];
    try {
      const arr = JSON.parse(match[0]);
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }
}
function createFocusEngine(opts) {
  let enabled = false;
  let blocklist = opts.blocklist.map(normalizeDomain);
  let whitelist = opts.whitelist.map(normalizePattern);
  function normalizeDomain(d) {
    return d.trim().toLowerCase().replace(/^\./, "").replace(/\/+$/, "");
  }
  function normalizePattern(p) {
    return p.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "");
  }
  function hostOf(url) {
    try {
      return new URL(url).hostname.toLowerCase();
    } catch {
      return "";
    }
  }
  function check(url) {
    if (!enabled) return { blocked: false };
    const host = hostOf(url);
    if (!host) return { blocked: false };
    for (const w of whitelist) {
      const wHost = w.split("/")[0];
      const wPath = w.includes("/") ? w.slice(w.indexOf("/") + 1) : "";
      if (host === wHost || host.endsWith("." + wHost)) {
        if (!wPath) return { blocked: false };
        const urlPath = url.split("#")[0].split("?")[0].replace(/^https?:\/\//, "").replace(/^[^/]+/, "");
        if (urlPath.startsWith("/" + wPath)) return { blocked: false };
      }
    }
    for (const d of blocklist) {
      if (host === d || host.endsWith("." + d)) return { blocked: true, reason: "focus" };
    }
    return { blocked: false };
  }
  return {
    get enabled() {
      return enabled;
    },
    setEnabled(on) {
      enabled = on;
    },
    setBlocklist(list) {
      blocklist = list.map(normalizeDomain);
    },
    setWhitelist(list) {
      whitelist = list.map(normalizePattern);
    },
    check
  };
}
const DEFAULT_BLOCKLIST = ["facebook.com", "youtube.com", "tiktok.com", "instagram.com", "news.vn", "zingnews.vn", "dantri.com.vn", "vnexpress.net", "tuoitre.vn"];
class FocusController {
  engine;
  _enabled = false;
  blocklist = DEFAULT_BLOCKLIST;
  whitelist = [];
  constructor() {
    this.engine = createFocusEngine({ blocklist: this.blocklist, whitelist: this.whitelist });
  }
  getState() {
    return { enabled: this.enabled, blocklist: [...this.blocklist], whitelist: [...this.whitelist] };
  }
  get enabled() {
    return this._enabled;
  }
  setEnabled(on) {
    this._enabled = on;
    this.engine.setEnabled(on);
  }
  setBlocklist(list) {
    this.blocklist = list;
    this.engine.setBlocklist(list);
  }
  setWhitelist(list) {
    this.whitelist = list;
    this.engine.setWhitelist(list);
  }
  check(url) {
    return this.engine.check(url);
  }
}
const THEME_KEYWORDS = {
  "💻 Code & Dev": ["github.com", "gitlab.com", "stackoverflow", "npm", "jsfiddle", "codesandbox"],
  "📄 Docs & Văn phòng": ["docs.google", "sheets", "slides", "notion", "office.com", "dropbox"],
  "🎬 Giải trí": ["youtube", "netflix", "spotify", "tiktok", "twitch"],
  "📧 Email": ["mail.", "gmail", "outlook", "yahoo.com/mail"],
  "🛒 Mua sắm": ["shopee", "lazada", "tiki", "amazon", "shopify"],
  "📰 Tin tức": ["news", "vnexpress", "dantri", "tuoitre", "zalo", "vlog"]
};
function createSmartTab() {
  function hostOf(url) {
    try {
      return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    } catch {
      return "";
    }
  }
  function groupByDomain(tabs) {
    const map = /* @__PURE__ */ new Map();
    for (const t of tabs) {
      const host = hostOf(t.url) || "khác";
      const list = map.get(host) ?? [];
      list.push(t);
      map.set(host, list);
    }
    return [...map.entries()].map(([label, t]) => ({ label, tabs: t }));
  }
  function classify(url) {
    const host = hostOf(url);
    const full = (host + " " + url).toLowerCase();
    for (const [theme, kws] of Object.entries(THEME_KEYWORDS)) {
      if (kws.some((k) => full.includes(k))) return theme;
    }
    return "🌐 Khác";
  }
  function groupByTheme(tabs) {
    const map = /* @__PURE__ */ new Map();
    for (const t of tabs) {
      const theme = classify(t.url);
      const list = map.get(theme) ?? [];
      list.push(t);
      map.set(theme, list);
    }
    return [...map.entries()].map(([label, t]) => ({ label, tabs: t }));
  }
  function saveSession(tabs, name) {
    return {
      name: name ?? `Phiên ${(/* @__PURE__ */ new Date()).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`,
      createdAt: Date.now(),
      tabs: tabs.map((t) => ({ url: t.url, title: t.title || t.url }))
    };
  }
  function restoreSession(session) {
    return session.tabs;
  }
  return { groupByDomain, groupByTheme, saveSession, restoreSession };
}
class SmartTabController {
  smart = createSmartTab();
  sessions = [];
  get sessionsList() {
    return [...this.sessions];
  }
  groupByDomain(tabs) {
    const states = tabs.map((t) => ({ id: t.id, url: t.url, title: t.title, loading: t.loading }));
    return this.smart.groupByDomain(states);
  }
  groupByTheme(tabs) {
    const states = tabs.map((t) => ({ id: t.id, url: t.url, title: t.title, loading: t.loading }));
    return this.smart.groupByTheme(states);
  }
  saveSession(tabs, name) {
    const states = tabs.map((t) => ({ id: t.id, url: t.url, title: t.title, loading: t.loading }));
    const session = this.smart.saveSession(states, name);
    const info = { name: session.name, createdAt: session.createdAt, tabs: session.tabs };
    this.sessions.unshift(info);
    if (this.sessions.length > 10) this.sessions.length = 10;
    return info;
  }
  restoreSession(name) {
    const s = this.sessions.find((x) => x.name === name);
    if (!s) return [];
    return s.tabs;
  }
  listSessions() {
    return this.sessions;
  }
}
function createTabSleeper(opts = {}) {
  const idleMs = opts.idleMs ?? 10 * 60 * 1e3;
  const heavyMemoryMB = opts.heavyMemoryMB ?? 500;
  const lastActiveMap = /* @__PURE__ */ new Map();
  function effectiveLastActive(tab) {
    const tracked = lastActiveMap.get(tab.id);
    if (tracked !== void 0) return tracked;
    return tab.lastActive ?? Date.now();
  }
  function evaluate(tabs, activeTabId, whitelist = []) {
    const now = Date.now();
    const toSleep = [];
    const warnings = [];
    for (const tab of tabs) {
      if ((tab.memoryMB ?? 0) > heavyMemoryMB) warnings.push(tab.id);
      if (tab.id === activeTabId) continue;
      if (whitelist.includes(tab.id)) continue;
      const last = effectiveLastActive(tab);
      if (now - last > idleMs) toSleep.push(tab.id);
    }
    return { toSleep, warnings };
  }
  function recordActivity(id) {
    lastActiveMap.set(id, Date.now());
  }
  return { evaluate, recordActivity };
}
class SleeperController {
  sleeper = createTabSleeper({ idleMs: 10 * 60 * 1e3 });
  sleepingIds = /* @__PURE__ */ new Set();
  evaluate(tabs, activeId, whitelist = [], views, onSleep) {
    const infos = tabs.map((t) => ({
      id: t.id,
      url: t.url,
      memoryMB: views?.find((v) => v.id === t.id)?.memoryMB ?? 0
    }));
    const result = this.sleeper.evaluate(infos, activeId, whitelist);
    for (const id of result.toSleep) {
      this.sleepingIds.add(id);
      onSleep?.(id);
    }
    const ids = new Set(tabs.map((t) => t.id));
    for (const id of [...this.sleepingIds]) {
      if (!ids.has(id)) this.sleepingIds.delete(id);
    }
    return { sleeping: this.sleepingIds.size, warnings: result.warnings };
  }
  recordActivity(id) {
    this.sleeper.recordActivity(id);
  }
  isSleeping(id) {
    return this.sleepingIds.has(id);
  }
}
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
  const ai = new AIController(deps2);
  electron.ipcMain.handle("ai:config", () => ai.getConfig());
  electron.ipcMain.handle("ai:saveConfig", (_e, cfg) => ai.saveConfig(cfg));
  electron.ipcMain.handle("ai:status", () => ai.status());
  electron.ipcMain.handle("ai:ask", async (_e, params) => {
    const text = await ai.ask(params);
    return { text };
  });
  const focus = new FocusController();
  electron.ipcMain.handle("focus:state", () => focus.getState());
  electron.ipcMain.handle("focus:toggle", (_e, on) => {
    focus.setEnabled(on);
    return focus.getState();
  });
  electron.ipcMain.handle("focus:setBlocklist", (_e, list) => {
    focus.setBlocklist(list);
    return focus.getState();
  });
  electron.ipcMain.handle("focus:setWhitelist", (_e, list) => {
    focus.setWhitelist(list);
    return focus.getState();
  });
  const smart = new SmartTabController();
  electron.ipcMain.handle("smarttab:groups", (_e, mode) => {
    const tabs = tm2.list();
    return mode === "theme" ? smart.groupByTheme(tabs) : smart.groupByDomain(tabs);
  });
  electron.ipcMain.handle("smarttab:saveSession", (_e, name) => smart.saveSession(tm2.list(), name));
  electron.ipcMain.handle("smarttab:sessions", () => smart.listSessions());
  electron.ipcMain.handle("smarttab:restoreSession", (_e, name) => smart.restoreSession(name));
  const sleeper = new SleeperController();
  electron.ipcMain.handle("sleeper:evaluate", () => {
    return sleeper.evaluate(tm2.list(), tm2.activeId, [], void 0, (id) => {
      const view = deps2.getActiveView(id);
      if (view && !view.webContents.isDestroyed()) {
        try {
          view.webContents.setBackgroundThrottling(true);
        } catch {
        }
      }
    });
  });
  electron.ipcMain.handle("sleeper:activity", (_e, id) => sleeper.recordActivity(id));
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
