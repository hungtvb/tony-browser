You are Tony, working inside the tony-browser repository at /tmp/tony-browser. You have ONLY file tools: read, write, edit, ls, grep, find. No terminal, no browser tools, no shell. Do NOT read files outside the workspace.

CONTEXT: PR #129 Evernote redesign merge with main. 20 tests fail because expectations are stale. A previous analysis already identified the root causes. Your job: apply those fixes NOW, with minimal tool calls (you risk hitting rate limits — be efficient: read files only when needed, batch related reads).

KNOWN ROOT CAUSES (trust these, verify quickly):
1. `tests/search-overlay.test.tsx:103` expects `var(--apple-blue)` — component uses lime `#94e130` (jsdom renders as `rgb(148, 225, 48)`). Fix test expectation.
2. `tests/component-misc.test.tsx` + `tests/component-readerview.test.tsx` expect text `'✕ Close'` — ReaderView now uses `<UIcon name="close" /> Close` (no ✕). Fix tests to match new markup.
3. `tests/component-app-ctrlw.test.tsx` — Ctrl+W; verify App.tsx handles it, fix selectors if needed.
4. `tests/component-app-pip.test.tsx` — PiP; AddressBar uses icon button now. Fix selectors.
5. `tests/component-app-privacy.test.tsx` — App.tsx may not pass `privacyOn`/`onTogglePrivacy` to StatusBar so Adblock chip never renders. Check App.tsx StatusBar call — if props missing, ADD them to App.tsx (code fix). Then stats event subscription onStats.
6. `tests/component-aipanel-ai-status.test.tsx` — AIPanel ai.status; verify merged logic.
7. `tests/component-sidebar-handlers.test.tsx` — active tab highlight is `#94e130` lime, not `rgba(255,255,255,0.14)`. Fix test.
8. `tests/commandpalette-icons-lint.test.ts` — App.tsx uses UIcon name `stack` but UIcon.tsx ICONS lacks it. ADD `stack: RiStackLine` to UIcon.tsx ICONS map (verify RiStackLine exists in @remixicon/react; if not, pick correct remix stack icon). Also check other used-but-missing names.
9. `tests/component-ttspanel.test.tsx` — TtsPanel uses `<UIcon name="circle-stop" /> Stop reading`, `<UIcon name="save" /> Save page`, `<UIcon name="close" /> Close`, `<UIcon name="reader" /> Read article / Save page` (not emoji). Fix tests.
10. `tests/component-savedpages.test.tsx`, `tests/component-stackview.test.tsx`, `tests/component-featurebar.test.tsx`, `tests/auto-clear.test.ts`, `tests/window-guard.test.ts` — check each; fix stale selectors/imports.

RULES:
- Fix test expectations to match the redesign's intended UI (lime colors, icon buttons, new labels). Do NOT weaken assertions artificially.
- Only fix component code (src/) when the component genuinely lost functionality in the merge (e.g. missing props to StatusBar).
- Do NOT touch TASK.md, TASK2.md. Do NOT commit/push.
- When done, write /tmp/tony-browser/REPORT.md: per test file — what you changed (test vs code). Keep it short.