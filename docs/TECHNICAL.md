# Tony Browser — Technical Design Document

> Version 0.1 — 07/08/2026
> Tác giả: Kenzo (cho Đại ca hungtvb)

---

## 1. Tổng quan (Overview)

**Tony Browser** là trình duyệt desktop dựa trên Electron, điểm khác biệt là có **trợ lý AI tích hợp** (đọc trang, tóm tắt, tự thao tác) cùng các tính năng hiện đại: Focus Mode, Privacy built-in, Smart Tabs, tối ưu RAM.

**Mục tiêu MVP:** Browser dùng được thật — mở tab, duyệt web, chặn quảng cáo — kèm trợ lý AI tóm tắt trang & toàn bộ tab.

## 2. Kiến trúc tổng thể (Architecture)

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

### 2.1 Thành phần chính

| Module | Vị trí | Trách nhiệm |
|---|---|---|
| **TabManager** | `src/main/tabs/` | Tạo/đóng/chuyển tab dùng `WebContentsView`, giữ state tab |
| **TabBar + AddressBar** | `src/renderer/` | UI điều khiển (React) |
| **AI Service** | `src/main/ai/` | Gọi LLM API, prompt template, stream response |
| **Page Reader** | `src/main/ai/reader.ts` | Trích xuất nội dung trang (text, title, links) |
| **PrivacyFilter** | `src/main/privacy/` | Chặn ads/tracker qua `session.webRequest` + blocklist |
| **FocusEngine** | `src/main/focus/` | Chặn URL xao nhãng theo lịch/whitelist |
| **SmartTab** | `src/main/smarttab/` | Nhóm tab theo domain/chủ đề, lưu/khôi phục session |
| **TabSleeper** | `src/main/perf/` | Đóng băng tab nền (discard), báo RAM |
| **SessionStore** | `src/main/storage/` | Lưu settings, sessions, blocklist (JSON/electron-store) |

### 2.2 Luồng IPC (giao tiếp renderer ↔ main)

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

Toàn bộ qua `ipcRenderer.invoke` / `ipcMain.handle` (an toàn, contextIsolation bật).

## 3. Công nghệ (Tech Stack)

| Thành phần | Chọn | Lý do |
|---|---|---|
| Desktop shell | **Electron 31+** | Trưởng thành, WebContentsView ổn định |
| UI | **React 18 + TypeScript + Vite** | Dev speed, type safety |
| Tab container | **WebContentsView** | Thay BrowserView (deprecated), mỗi tab 1 view |
| Storage | **electron-store** (JSON) | Đơn giản cho settings/session |
| LLM API | **OpenAI-compatible HTTP** (cấu hình base_url + key trong Settings) | Linh hoạt, dùng được 9router/mọi provider |
| Blocklist | **EasyList/AdGuard DNS filter lists** (fetch + cache) | Chuẩn ngành, cập nhật tự động |
| Test | **Vitest** (unit) + **Playwright** (e2e tùy chọn) | Nhẹ, cùng hệ TypeScript |

## 4. Thiết kế chi tiết các tính năng

### 4.1 Trợ lý AI (#1)
- **Entry:** Nút 🪄 trên thanh địa chỉ + shortcut `Ctrl+J` → mở AI Panel (panel phải, có thể gọi từ bất kỳ tab nào).
- **Luồng:** User gõ lệnh → `PageReader` lấy text trang hiện tại (giới hạn ~30k ký tự) → prompt template → LLM stream → hiển thị markdown.
- **Actions (nâng cao):** AI trả về JSON action `{type: "click"|"fill"|"navigate", ...}` → main process thực thi qua `webContents.executeJavaScript` (tự động hóa cơ bản).
- **Cấu hình:** base URL, API key, model trong Settings; lưu bằng electron-store.

### 4.2 Focus Mode (#2)
- Bật/tắt qua icon 🧘 trên toolbar hoặc lịch (ví dụ 9h–18h).
- Khi bật: URL trong blocklist focus → hiển thị trang "Bạn đang tập trung 💪" thay vì tải nội dung.
- Whitelist (ngoại lệ) cấu hình được.
- Pomodoro nhắc nghỉ: notification sau 25/45 phút.

### 4.3 Privacy (#4)
- `session.webRequest.onBeforeRequest` chặn request khớp blocklist (EasyList + tracker domains).
- Chặn popup + notification spam (`setPermissionRequestHandler`).
- Toggle bật/tắt, thống kê "Đã chặn X request".

### 4.4 Smart Tabs (#5)
- Nhóm tự động theo domain + heuristic chủ đề (title keywords).
- Lưu/khôi phục toàn bộ phiên (tên phiên, timestamp).
- Tìm tab bằng text: search title+url+content-snippet.

### 4.5 Tóm tắt nhanh mọi tab (#6)
- Nút 📋 "Tóm tắt tất cả": đọc title + text (rút gọn) từng tab qua IPC → AI tổng hợp 1 báo cáo → copy/share được.

### 4.6 Tối ưu RAM/Pin (#7)
- Tab nền không hoạt động 10 phút → `webContents.forcefullyCrashRenderer()`? Không — dùng `webContents.setBackgroundThrottling(true)` + đưa URL vào danh sách discard, reload khi activate (giống "Sleeping tabs" của Edge).
- Tab ngốn RAM > 500MB cảnh báo.

## 5. Cấu trúc thư mục (Target Structure)

```
tony-browser/
├── package.json
├── tsconfig.json / tsconfig.node.json / tsconfig.web.json
├── electron.vite.config.ts        # build electron + renderer
├── src/
│   ├── main/
│   │   ├── index.ts               # app lifecycle, window
│   │   ├── ipc.ts                 # đăng ký tất cả IPC handlers
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
│       └── types.ts               # IPC contract types (dùng chung)
└── tests/                          # vitest unit tests
```

## 6. Quyết định Engine (đã duyệt 07/08/2026)

**Chọn: Electron + Chromium/Blink. KHÔNG đổi sang Tauri.**

Lý do:
1. Tính năng chủ lực #1 (AI thao tác trang) cần kiểm soát sâu từng trang — `executeJavaScript`, `webRequest`, CDP. Tauri/WebView hệ thống không hỗ trợ mức này.
2. Privacy (#4), Focus (#2), Smart Tabs (#5) đều xây trên API Chromium.
3. Điểm yếu RAM của Electron được giải quyết bằng chính tính năng #7 (TabSleeper) — biến thành điểm bán.
4. **Playwright = thư viện phụ trợ** cho AI agent (phase 4), không phải thay thế shell.

## 7. Rủi ro & Quyết định

| Rủi ro | Ảnh hưởng | Giảm thiểu |
|---|---|---|
| WebContentsView + React state phức tạp | Bug đồng bộ tab | 1 nguồn truth TabManager, events → renderer |
| LLM key lộ trong source | An ninh | Chỉ lưu local settings, không commit |
| Blocklist lớn chậm lọc | Lag duyệt web | Filter offline (uBlock-style) sau, bắt đầu bằng map đơn giản |
| Server headless khó test GUI | Khó verify UI | Unit test logic thuần (Vitest), GUI test bằng tay/máy Đại ca |

## 7. Phạm vi phiên bản

- **v0.1 (hiện tại):** skeleton build được, Electron chạy.
- **v0.2:** Tab + AddressBar dùng được, duyệt web thật.
- **v0.3:** Privacy blocklist, Focus Mode.
- **v0.4:** AI assistant (tóm tắt trang + toàn bộ tab), Smart Tabs, TabSleeper.
- **v0.5:** AI actions (tự thao tác), polish, packaging (electron-builder).
