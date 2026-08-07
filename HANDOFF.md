# 🤝 HANDOFF Protocol — Tony ⇄ Kenzo

> Contract giữa **Tony** (reviewer / supervisor, Hermes Agent) và **Kenzo** (coding bot).
> Mọi review comment, GitHub issue, và PR reply trong repo này PHẢI tuân theo protocol này.
> Mục đích: Kenzo luôn biết chính xác việc cần làm; Tony luôn biết chính xác cái gì đã xong.

---

## 1️⃣ Chiều Tony → Kenzo (review PR / GitHub issue)

Áp dụng cho: **mọi review comment trên PR** và **mọi issue improvement** do Tony tạo.

### Review comment trên PR — format:

```markdown
## Code Review Summary

**Verdict: Approve / Comment / Changes requested**

### 🔴 Critical
- **src/x.ts:42** — mô tả lỗi + tác động

### ⚠️ Warnings
- **src/y.ts:88** — mô tả vấn đề

### 💡 Suggestions
- **src/z.ts:10** — gợi ý cải thiện

### ✅ Looks Good
- Phần nào ổn, giữ nguyên

---

📋 **HANDOFF FOR KENZO:**
1. `src/x.ts:42` — fix race condition: dùng `AbortController` thay vì flag boolean
2. `tests/y.test.ts` — thêm test cho empty input (3 case: `""`, `null`, whitespace)
3. `src/z.ts:10` — gộp helper trùng với `src/utils.ts:34`
```

- **Mỗi mục handoff = 1 việc** với file + dòng + cách sửa gợi ý rõ ràng.
- Kenzo chỉ cần đọc "HANDOFF FOR KENZO" là làm được ngay, không cần đoán.

### Issue improvement — format:

```markdown
**Title:** `Improvement: <chủ đề rõ ràng>`

## Vấn đề
Mô tả ngắn gọn vấn đề / cải thiện tiềm năng.

## Liên quan
- File: `src/xxx.ts:12-30`
- PR gốc: #N

## Đề xuất
Hướng làm cụ thể, từng bước.

📋 **HANDOFF FOR KENZO:** <việc cần làm, file, cách kiểm chứng>
```

---

## 2️⃣ Chiều Kenzo → Tony (PR updated / reply)

Áp dụng cho: **comment Kenzo để lại trên PR** sau khi sửa, để Tony biết đối chiếu.

### Format — ghi ở comment đầu tiên của Kenzo khi cập nhật PR:

```markdown
✅ HANDOFF TO TONY — PR #N updated

## Đã xử lý
- [x] #1 race condition `src/x.ts:42` → dùng AbortController (commit abc1234)
- [x] #2 test empty input `tests/y.test.ts` → +3 test pass
- [ ] #3 chưa làm `src/z.ts:10` — cần Tony giải thích thêm

## Chỗ cần Tony xem lại
- `src/w.ts:66` — đổi logic theo issue #5 nhưng chưa chắc đúng
- Gộp 2 hàm helper — muốn Tony xác nhận trước khi merge

## Câu hỏi
1. Issue "Improvement: debounce command palette" — làm trước hay sau merge PR này?
2. Có nên thêm CI Windows không?
```

### Quy tắc cho Kenzo
- **Mỗi mục trong "HANDOFF FOR KENZO" trước đó của Tony PHẢI được respond** bằng 1 dòng checkbox ở "Đã xử lý" — không để sót im lặng.
- `[x]` = đã làm (kèm commit), `[ ]` = chưa làm + lý do.
- "Chỗ cần Tony xem lại" = điểm Kenzo không tự tin, muốn Tony soi kỹ lần review tới.
- "Câu hỏi" = quyết định ưu tiên cần Tony/Đại ca chốt.

---

## 3️⃣ Vòng lặp chuẩn

```
Kenzo tạo PR
   → Tony review (mỗi 30 phút, cron tự động) + để HANDOFF FOR KENZO
   → Kenzo sửa + reply HANDOFF TO TONY (đối chiếu từng checkbox)
   → Tony review lại: đối chiếu [x]/[ ] với diff mới
   → Sạch → approve (+ issue improvement nếu đáng giá)
```

## 4️⃣ Nguyên tắc chung

- **Không im lặng:** mỗi handoff phải có response, dù là "chưa làm vì lý do X".
- **Cụ thể:** luôn có file + dòng (+ commit khi xong).
- **Không spam:** tối đa 1-2 issue improvement mỗi lần review; không tạo issue trùng.
- **Không bịa:** issue/improvement chỉ tạo từ cải thiện thực tế quan sát được trong code.
- **Tiếng Việt** cho phần mô tả, giữ nguyên tên file/function/code bằng tiếng Anh.
