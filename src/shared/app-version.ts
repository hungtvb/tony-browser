// Issue #69 — single source of truth for the app version exposed to the UI.
// package.json `version` is the source of truth; the main process reads it via
// Electron's app.getVersion() (works in dev AND packaged builds) and hands it to
// the preload through webPreferences.additionalArguments (--tony-app-version=<v>),
// because the preload is a plain contextBridge script with no access to `app`.

/** additionalArguments flag format: --tony-app-version=<version> */
export const APP_VERSION_ARG = '--tony-app-version='

/** Build the additionalArguments entry for webPreferences. */
export function appVersionArg(version: string): string {
  return `${APP_VERSION_ARG}${version}`
}

/** Pure parse of an argv-like list; returns '' when absent. */
export function parseAppVersionArg(argv: string[]): string {
  for (const a of argv) {
    if (a.startsWith(APP_VERSION_ARG)) return a.slice(APP_VERSION_ARG.length)
  }
  return ''
}

/** Read the injected version from Electron's process.argv (preload side). */
export function readAppVersionArg(argv: readonly string[]): string {
  return parseAppVersionArg([...argv])
}