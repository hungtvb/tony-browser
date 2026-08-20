// @vitest-environment jsdom
// Issue #139 — Ctrl+T New Tab shortcut. The keydown decision logic lives in
// src/renderer/shortcuts.ts as pure functions so it's unit-testable without
// mounting the whole App.
import { describe, it, expect } from 'vitest'
import { isNewTabShortcut, isEditableTarget } from '../src/renderer/shortcuts'

function key(opts: { ctrl?: boolean; meta?: boolean; shift?: boolean; key?: string; target?: HTMLElement | null } = {}) {
  return {
    ctrlKey: !!opts.ctrl,
    metaKey: !!opts.meta,
    shiftKey: !!opts.shift,
    key: opts.key ?? 't',
    target: opts.target ?? document.body,
  } as unknown as KeyboardEvent
}

describe('isNewTabShortcut (issue #139)', () => {
  it('returns true for Ctrl+T (new tab)', () => {
    expect(isNewTabShortcut(key({ ctrl: true, key: 't' }))).toBe(true)
  })

  it('returns true for Cmd+T on macOS', () => {
    expect(isNewTabShortcut(key({ meta: true, key: 't' }))).toBe(true)
  })

  it('returns false for Ctrl+Shift+T (reopen closed tab, issue #139)', () => {
    expect(isNewTabShortcut(key({ ctrl: true, shift: true, key: 't' }))).toBe(false)
  })

  it('returns false for Ctrl+Shift+T with meta', () => {
    expect(isNewTabShortcut(key({ meta: true, shift: true, key: 't' }))).toBe(false)
  })

  it('returns false for other keys', () => {
    expect(isNewTabShortcut(key({ ctrl: true, key: 'w' }))).toBe(false)
  })

  it('returns false while typing in an editable target (input)', () => {
    const input = document.createElement('input')
    expect(isNewTabShortcut(key({ ctrl: true, key: 't', target: input }))).toBe(false)
  })

  it('returns false while typing in a textarea', () => {
    const ta = document.createElement('textarea')
    expect(isNewTabShortcut(key({ ctrl: true, key: 't', target: ta }))).toBe(false)
  })

  it('returns false while typing in contenteditable', () => {
    const ce = document.createElement('div')
    ce.setAttribute('contenteditable', 'true')
    expect(isNewTabShortcut(key({ ctrl: true, key: 't', target: ce }))).toBe(false)
  })
})

describe('isEditableTarget (existing helper moved out of App)', () => {
  it('detects input/textarea/contenteditable', () => {
    expect(isEditableTarget(key({ target: document.createElement('input') }))).toBe(true)
    expect(isEditableTarget(key({ target: document.createElement('textarea') }))).toBe(true)
    const ce = document.createElement('div')
    ce.setAttribute('contenteditable', 'true')
    expect(isEditableTarget(key({ target: ce }))).toBe(true)
    expect(isEditableTarget(key({ target: document.body }))).toBe(false)
  })
})