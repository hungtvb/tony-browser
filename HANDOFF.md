# 🤝 HANDOFF Protocol — Tony ⇄ Kenzo

> Contract between **Tony** (reviewer / supervisor, Hermes Agent) and **Kenzo** (coding bot).
> Every review comment, GitHub issue, and PR reply in this repo MUST follow this protocol.
> Goal: Kenzo always knows exactly what to do; Tony always knows exactly what is done.

---

## 1️⃣ Direction Tony → Kenzo (PR review / GitHub issue)

Applies to: **every review comment on a PR** and **every improvement issue** created by Tony.

### Review comment on PR — format:

```markdown
## Code Review Summary

**Verdict: Approve / Comment / Changes requested**

### 🔴 Critical
- **src/x.ts:42** — error description + impact

### ⚠️ Warnings
- **src/y.ts:88** — problem description

### 💡 Suggestions
- **src/z.ts:10** — improvement suggestion

### ✅ Looks Good
- Which parts are fine, keep as is

---

📋 **HANDOFF FOR KENZO:**
1. `src/x.ts:42` — fix race condition: use `AbortController` instead of a boolean flag
2. `tests/y.test.ts` — add tests for empty input (3 cases: `""`, `null`, whitespace)
3. `src/z.ts:10` — merge the helper that duplicates `src/utils.ts:34`
```

- **Each handoff item = 1 task** with a clear file + line + suggested fix.
- Kenzo only needs to read "HANDOFF FOR KENZO" to start working, no guessing needed.

### Improvement issue — format:

```markdown
**Title:** `Improvement: <clear topic>`

## Problem
Short description of the problem / potential improvement.

## Related
- File: `src/xxx.ts:12-30`
- Original PR: #N

## Suggested fix
Concrete, step-by-step approach.

📋 **HANDOFF FOR KENZO:** <task, file, how to verify>
```

---

## 2️⃣ Direction Kenzo → Tony (PR updated / reply)

Applies to: **the comment Kenzo leaves on the PR** after fixing, so Tony knows what to compare.

### Format — written in Kenzo's first comment when updating a PR:

```markdown
✅ HANDOFF TO TONY — PR #N updated

## Handled
- [x] #1 race condition `src/x.ts:42` → used AbortController (commit abc1234)
- [x] #2 empty input tests `tests/y.test.ts` → +3 tests pass
- [ ] #3 not done `src/z.ts:10` — need more explanation from Tony

## Needs Tony's review
- `src/w.ts:66` — changed logic per issue #5 but not sure it is correct
- Merging 2 helper functions — want Tony's confirmation before merging

## Questions
1. Issue "Improvement: debounce command palette" — do it before or after this PR is merged?
2. Should we add Windows CI?
```

### Rules for Kenzo
- **Every item in Tony's previous "HANDOFF FOR KENZO" MUST be responded to** with a checkbox line under "Handled" — never leave it silently unaddressed.
- `[x]` = done (with commit), `[ ]` = not done + reason.
- "Needs Tony's review" = points Kenzo is not confident about, wants Tony to scrutinize in the next review.
- "Questions" = priority decisions that need Tony/Đại ca to settle.

---

## 3️⃣ Standard loop

```
Kenzo creates PR
   → Tony reviews (every 30 minutes, automated cron) + leaves HANDOFF FOR KENZO
   → Kenzo fixes + replies HANDOFF TO TONY (matching each checkbox)
   → Tony re-reviews: compares [x]/[ ] with the new diff
   → Clean → approve (+ improvement issue if worthwhile)
```

## 4️⃣ General principles

- **No silence:** every handoff must get a response, even "not done because of reason X".
- **Specific:** always include file + line (+ commit when done).
- **No spam:** at most 1-2 improvement issues per review; do not create duplicate issues.
- **No fabrication:** issues/improvements are only created from real, observable improvements in the code.
- **English** for descriptions; keep file/function/code names in English as-is.
