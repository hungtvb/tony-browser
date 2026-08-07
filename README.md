# Tony Browser 🚀

**Tony Browser** — trình duyệt web thông minh có trợ lý AI, do Đại ca (hungtvb) xây dựng.

> *"Browser không chỉ để lướt web — nó hiểu bạn đang làm gì."*

## ✨ Tính năng (Roadmap)

| # | Tính năng | Mô tả | Trạng thái |
|---|---|---|---|
| 1 | **🤖 Trợ lý AI** | Đọc trang, tóm tắt nội dung, tự thao tác (click, điền form) theo lệnh | 🔜 Sắp tới |
| 2 | **🧘 Focus Mode** | Chặn web xao nhãng, chế độ tập trung, nhắc nghỉ | 🔜 Sắp tới |
| 3 | **🛡️ Privacy** | Chặn quảng cáo, tracker, chống theo dõi — built-in | 🔜 Sắp tới |
| 4 | **🗂️ Smart Tabs** | Tự nhóm tab theo chủ đề, lưu/khôi phục phiên | 🔜 Sắp tới |
| 5 | **📋 Tóm tắt nhanh** | AI tóm tắt toàn bộ tab đang mở thành báo cáo | 🔜 Sắp tới |
| 6 | **⚡ Tiết kiệm RAM/Pin** | Tự ngủ tab nền, báo cáo tab ngốn RAM | 🔜 Sắp tới |
| 7 | **🎬 RPA Replay** | Ghi & phát lại thao tác tự động (để sau) | ⏸️ Hoãn |

## 🛠️ Công nghệ

- **Electron** — nền tảng desktop
- **React + TypeScript** — giao diện
- **Playwright** — tự động hóa (cho AI agent)
- **Vite** — build tool

## 🚀 Chạy dự án

```bash
npm install
npm run dev
```

## 📁 Cấu trúc

```
tony-browser/
├── src/
│   ├── main/          # Electron main process
│   ├── preload/       # Preload scripts (contextBridge)
│   ├── renderer/      # React UI
│   └── features/      # Tính năng (AI, focus, privacy...)
├── package.json
└── README.md
```

---

© 2026 [hungtvb](https://github.com/hungtvb) — Built with ❤️
