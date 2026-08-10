# Tony Browser — Technical Design Document

> Version 0.1 — 07/08/2026
> Author: Kenzo (for Boss hungtvb)

---

## 1. Overview

**Tony Browser** is a desktop browser built on Electron; its differentiator is the **built-in AI assistant** (read pages, summarize, automate actions) plus modern features: Focus Mode, built-in Privacy, Smart Tabs, RAM optimization.

**MVP goal:** A browser that actually works — open tabs, browse the web, block ads — plus an AI assistant that summarizes a page & all tabs.

## 2. Overall Architecture

```
┌─────────────────────────────────────────────────┐
│                RENDERER (React UI)              │
│  Tab Bar │ Address Bar │ AI Panel │ Settings    │
└───────────────▲──────────────────────┬──────────┘
                │ contextBridge        │ ipcRenderer
┌───────────────┴──────────────────────▼──────────┐
│             MAIN PROCESS (Electron)             │
│  TabManager │ WebContentsView │ Session/Net     │
│  AI Service │ PrivacyFilter  │ FocusEngine      │
│  SmartTab   │ SessionStore   │ TabSleeper       │
└───────────────────────┬──────────────────────────┘
                        │
              ┌─────────┴─────────┐
              │  External APIs   │
              │  • LLM (AI)      │
              │  • Blocklist CDN │
              └──────────────────┘
```

### 2.1 Main components

| Module | Location | Responsibility |
|---|---|---|
| **TabManager** | `src/main/tabs/` | Creates/closes/switches tabs with `WebContentsView`, keeps tab state |
| **TabBar + AddressBar** | `src/renderer/` | Control UI (React) |
| **AI Service** | `src/main/ai/` | Calls the LLM API, prompt templates, streams responses |
| **Page Reader** | `src/main/ai/reader.ts` | Extracts page content (text, title, links) |
| **PrivacyFilter** | `src/main/privacy/` | Blocks ads/trackers via `session.webRequest` + blocklist |
| **FocusEngine** | `src/main/focus/` | Blocks distracting URLs per schedule/whitelist |
| **SmartTab** | `src/main/smarttab/` | Groups tabs by domain/topic, saves/restores sessions |
| **TabSleeper** | `src/main/perf/` | Freezes background tabs (discard), reports RAM |
| **SessionStore** | `src/main/storage/` | Saves settings, sessions, blocklist (JSON/electron-store) |

### 2.2 IPC flow (renderer ↔ main communication)

```
Renderer                          Main
  │  window.tony.tabs.open(url)    │
  ├────────────────────────────────►  TabManager.open(url)
  │                                 │   → new WebContentsView(url)
  │  window.tony.ai.ask(text)      │
  ├────────────────────────────────►  AI Service → LLM API
  │ ◄───────────────────────────────  stream chunks → renderer
  └────────────────────────────────┘
```

Everything goes through `ipcRenderer.invoke` / `ipcMain.handle` (secure, contextIsolation enabled).

## 3. Tech Stack

| Component | Choice | Reason |
|---|---|---|
| Desktop shell | **Electron 31+** | Mature, stable WebContentsView |
| UI | **React 18 + TypeScript + Vite** | Dev speed, type safety |
| Tab container | **WebContentsView** | Replaces BrowserView (deprecated), one view per tab |
| Storage | **electron-store** (JSON) | Simple for settings/session |
| LLM API | **OpenAI-compatible HTTP** (base_url + key configured in Settings) | Flexible, works with any router/provider |
| Blocklist | **EasyList/AdGuard DNS filter lists** (fetch + cache) | Industry standard, auto-updated |
| Test | **Vitest** (unit) + **Playwright** (optional e2e) | Lightweight, same TypeScript ecosystem |

## 4. Detailed feature design

### 4.1 AI Assistant (#1)
- **Entry:** 🪄 button on the address bar + `Ctrl+J` shortcut → opens the AI Panel (right panel, callable from any tab).
- **Flow:** User types a command → `PageReader` grabs the current page text (capped at ~30k characters) → prompt template → LLM stream → renders markdown.
- **Actions (advanced):** AI returns a JSON action `{type: "click"|"fill"|"navigate", ...}` → main process executes it via `webContents.executeJavaScript` (basic automation).
- **Configuration:** base URL, API key, model in Settings; persisted with electron-store.

### 4.2 Focus Mode (#2)
- Toggle via the 🧘 icon on the toolbar or on a schedule (e.g. 9am–6pm).
- When on: URLs in the focus blocklist → show a "You're in focus 💪" page instead of loading content.
- Whitelist (exceptions) is configurable.
- Pomodoro break reminders: notification after 25/45 minutes.

### 4.3 Privacy (#4)
- `session.webRequest.onBeforeRequest` blocks requests matching the blocklist (EasyList + tracker domains).
- Blocks popups + notification spam (`setPermissionRequestHandler`).
- Toggle on/off, shows "Blocked X requests" stats.

### 4.4 Smart Tabs (#5)
- Auto-groups by domain + topic heuristics (title keywords).
- Saves/restores whole sessions (session name, timestamp).
- Finds tabs by text: search title+url+content-snippet.

### 4.5 Quick summary of all tabs (#6)
- 📋 "Summarize all" button: reads each tab's title + text (truncated) via IPC → AI compiles one report → copy/shareable.

### 4.6 RAM/Battery optimization (#7)
- Background tab idle for 10 minutes → `webContents.forcefullyCrashRenderer()`? No — use `webContents.setBackgroundThrottling(true)` + add the URL to the discard list, reload on activation (like Edge's "Sleeping tabs").
- Warn when a tab uses > 500MB RAM.

## 5. Folder structure (target)

```
tony-browser/
├── package.json
├── tsconfig.json / tsconfig.node.json / tsconfig.web.json
├── electron.vite.config.ts        # build electron + renderer
├── src/
│   ├── main/
│   │   ├── index.ts               # app lifecycle, window
│   │   ├── ipc.ts                 # registers all IPC handlers
│   │   ├── tabs/                  # TabManager, Tab
│   │   ├── ai/                    # AIService, reader.ts, actions.ts
│   │   ├── privacy/               # blocklist.ts, filters.ts
│   │   ├── focus/                 # focusEngine.ts, schedule.ts
│   │   ├── smarttab/              # grouping.ts, sessionStore.ts
│   │   ├── perf/                  # tabSleeper.ts
│   │   └── storage/               # store.ts (electron-store wrapper)
│   ├── preload/
│   │   └── index.ts               # contextBridge → window.tony
│   ├── renderer/
│   │   ├── index.html
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── components/            # TabBar, AddressBar, AIPanel, ...
│   │   └── hooks/                 # useTabs, useAI...
│   └── shared/
│       └── types.ts               # IPC contract types (shared)
└── tests/                          # vitest unit tests
```

## 6. Engine decision (approved 07/08/2026)

**Chosen: Electron + Chromium/Blink. NOT switching to Tauri.**

Reasons:
1. Core feature #1 (AI page automation) needs deep per-page control — `executeJavaScript`, `webRequest`, CDP. System Tauri/WebView cannot support this level.
2. Privacy (#4), Focus (#2), Smart Tabs (#5) are all built on Chromium APIs.
3. Electron's RAM weakness is solved by feature #7 itself (TabSleeper) — turning it into a selling point.
4. **Playwright = helper library** for the AI agent (phase 4), not a shell replacement.

## 7. Risks & decisions

| Risk | Impact | Mitigation |
|---|---|---|
| Complex WebContentsView + React state | Tab sync bugs | Single source of truth TabManager, events → renderer |
| LLM key leaked in source | Security | Only store in local settings, never commit |
| Large blocklist slows filtering | Browsing lag | Offline filter (uBlock-style) later, start with a simple map |
| Headless server hard to test GUI | Hard to verify UI | Unit-test pure logic (Vitest), GUI tested by hand/on Boss's machine |

## 7. Version scope

- **v0.1 (current):** skeleton builds, Electron runs.
- **v0.2:** Tab + AddressBar usable, real web browsing.
- **v0.3:** Privacy blocklist, Focus Mode.
- **v0.4:** AI assistant (summarize page + all tabs), Smart Tabs, TabSleeper.
- **v0.5:** AI actions (automation), polish, packaging (electron-builder).
