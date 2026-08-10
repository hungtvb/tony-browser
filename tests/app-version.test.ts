// Issue #69 — preload version must be derived from the real app version,
// not a hardcoded literal. Tests the pure shared helper used by main (to inject
// app.getVersion() via additionalArguments) and by preload (to read it back).
import { describe, it, expect } from 'vitest'
import { APP_VERSION_ARG, readAppVersionArg, parseAppVersionArg } from '../src/shared/app-version'

describe('Issue #69 — app version plumbing (shared/app-version)', () => {
  it('readAppVersionArg extracts the version from a process argv containing the flag', () => {
    const argv = ['/usr/bin/tony-browser', '--some-flag=1', `${APP_VERSION_ARG}1.2.3`]
    expect(readAppVersionArg(argv)).toBe('1.2.3')
  })

  it('readAppVersionArg returns empty string when the flag is absent', () => {
    expect(readAppVersionArg(['/usr/bin/tony-browser', '--foo=bar'])).toBe('')
  })

  it('readAppVersionArg handles the Electron-style argv entry (flag with leading dashes)', () => {
    const argv = ['/usr/bin/electron', '--inspect', `${APP_VERSION_ARG}9.9.9`]
    expect(readAppVersionArg(argv)).toBe('9.9.9')
  })

  it('parseAppVersionArg mirrors readAppVersionArg for the pure form', () => {
    expect(parseAppVersionArg([`${APP_VERSION_ARG}0.11.4`])).toBe('0.11.4')
    expect(parseAppVersionArg([])).toBe('')
  })

  it('exposed version is never the stale hardcoded literal 0.2.0', () => {
    // The old literal must not exist anywhere in the preload source anymore.
    const fs = require('node:fs')
    const preload = fs.readFileSync('src/preload/index.ts', 'utf8')
    expect(preload).not.toMatch(/version:\s*'0\.2\.0'/)
    // and the preload must source the version from the shared helper (argv), not a literal
    expect(preload).toMatch(/readAppVersionArg/)
  })

  it('shared constant matches an Electron additionalArguments flag format', () => {
    expect(APP_VERSION_ARG).toMatch(/^--[a-z-]+=/) // per-format: --key=value
  })
})