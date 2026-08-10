# Tony Browser 🚀

**Tony Browser** — a smart web browser with an AI assistant, built by hungtvb.

> *"A browser isn't just for browsing — it understands what you're doing."*

## ✨ Features (Roadmap)

| # | Feature | Description | Status |
|---|---|---|---|
| 1 | **🤖 AI Assistant** | Reads pages, summarizes content, performs actions (click, fill forms) on command | ✅ Done |
| 2 | **🧘 Focus Mode** | Blocks distracting sites, focus mode, break reminders | ✅ Done |
| 3 | **🛡️ Privacy** | Built-in ad blocking, tracker blocking, anti-tracking | ✅ Done |
| 4 | **🗂️ Smart Tabs** | Auto-groups tabs by topic, saves/restores sessions | ✅ Done |
| 5 | **📋 Quick Summaries** | AI summarizes all open tabs into a report | ✅ Done |
| 6 | **⚡ RAM/Battery saver** | Sleeps background tabs, reports RAM-hungry tabs | ✅ Done |
| 7 | **🎬 RPA Replay** | Record & replay automated actions (later) | ⏸️ Postponed |

## 🛠️ Tech stack

- **Electron** — desktop platform
- **React + TypeScript** — UI
- **Playwright** — automation (for the AI agent)
- **Vite** — build tool

## 🚀 Running the project

```bash
npm install
npm run dev
```

## 📁 Structure

```
tony-browser/
├── src/
│   ├── main/          # Electron main process
│   ├── preload/       # Preload scripts (contextBridge)
│   ├── renderer/      # React UI
│   └── features/      # Features (AI, focus, privacy...)
├── package.json
└── README.md
```

---

© 2026 [hungtvb](https://github.com/hungtvb) — Built with ❤️
