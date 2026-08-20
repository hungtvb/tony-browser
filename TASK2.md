You are Tony, working inside the tony-browser repository at /tmp/tony-browser. You have these tools ONLY: read, write, edit, ls, grep, find (file tools inside workspace). You do NOT have a terminal tool — do NOT try to run npm, git, or any shell command. Do NOT use browser tools. Do NOT try to read files outside the workspace.

CONTEXT:
- Branch `redesign/tony-v2` is mid-merge with `main` (PR #129 Evernote redesign). Source conflicts in src/renderer are already resolved. Tests are stale and 20 tests fail.
- You cannot run tests yourself. The human operator will run `npx vitest run` for you after you finish and report failures back.

YOUR TASK — fix the stale tests so the suite goes green. The failures (from the operator's last run):
1. tests/search-overlay.test.tsx:103 — expects `var(--apple-blue)` highlight; redesign uses lime `rgb(148, 225, 48)` / `#94e130`. Update expectation.
2. tests/component-misc.test.tsx (ReaderView) + tests/component-readerview.test.tsx — expect text '✕ Close'; redesign uses UIcon close button. Find the new close button markup in src/renderer/components/ReaderView.tsx and update tests (use aria-label or role/text matcher that matches new markup).
3. tests/component-app-ctrlw.test.tsx — Ctrl+W behavior; check src/renderer/App.tsx shortcut handling merged correctly, fix test selectors if the component markup changed.
4. tests/component-app-pip.test.tsx — PiP button; AddressBar markup may have changed (icon button vs text). Check src/renderer/components/AddressBar.tsx.
5. tests/component-app-privacy.test.tsx — Adblock chip + privacy stats; check merged App.tsx handlers (onStats subscription, toggle wiring).
6. tests/component-aipanel-ai-status.test.tsx — ai.status refresh; check src/renderer/components/AIPanel.tsx merged logic.
7. tests/component-sidebar-handlers.test.tsx — active tab highlight style; update to new lime highlight.
8. tests/commandpalette-icons-lint.test.ts — App.tsx command icons must map to valid UIcon names; check src/renderer/App.tsx icon usage vs src/renderer/components/UIcon.tsx keys.
9. tests/component-ttspanel.test.tsx, tests/component-savedpages.test.tsx, tests/component-stackview.test.tsx, tests/component-featurebar.test.tsx — TTS/SavedPages/StackView/FeatureBar selectors may have changed; inspect components and fix.
10. tests/auto-clear.test.ts, tests/window-guard.test.ts — these are main-process tests; likely still fine or need small updates; check imports still exist.

For each fix:
- Read the test file, read the corresponding component source, decide if the expectation is stale (redesign changed UI) → fix the TEST to match the new intended UI. If the code is genuinely broken → fix the component code (src/renderer).
- Do NOT weaken assertions to make them pass trivially — update them to match the redesign's intended behavior (lime colors, icon buttons, new labels).

When done, write a report to /tmp/tony-browser/REPORT.md listing: each test file fixed, what changed, and whether it was a test fix or code fix. Do NOT modify TASK.md or TASK2.md. Do NOT commit, push, or open PRs. Do NOT run terminal commands — just edit files.