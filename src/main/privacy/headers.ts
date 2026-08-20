// Privacy — fingerprinting-protection headers (issue #123)
// Strips/replaces high-entropy request headers (User-Agent platform, client hints,
// Accept-Language) so sites cannot fingerprint the OS/CPU/locale of the user.
// Pure functions — easy to unit test; wired into attachWebRequestFilters in ipc.ts.

export interface HeaderSanitizeOptions {
  /** master switch — false returns the headers untouched (privacy toggle off) */
  enabled: boolean
  /** generic Chromium UA WITHOUT any platform/OS token */
  userAgent: string
  /** generic Accept-Language (current locale kept when customized) */
  acceptLanguage: string
}

// Generic Chromium UA — no OS/platform token so sites cannot fingerprint the platform
export const GENERIC_USER_AGENT =
  'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

export const DEFAULT_ACCEPT_LANGUAGE = 'en-US,en;q=0.9'

// High-entropy client-hint headers (Sec-CH-UA family) — removed when protection is on
const CLIENT_HINT_HEADERS = new Set([
  'sec-ch-ua',
  'sec-ch-ua-arch',
  'sec-ch-ua-bitness',
  'sec-ch-ua-full-version',
  'sec-ch-ua-full-version-list',
  'sec-ch-ua-mobile',
  'sec-ch-ua-model',
  'sec-ch-ua-platform',
  'sec-ch-ua-platform-version',
  'sec-ch-ua-wow64',
])

/**
 * Sanitize request headers for fingerprinting protection.
 * - User-Agent      → GENERIC_USER_AGENT (no platform)
 * - Sec-CH-UA family → removed
 * - Accept-Language → generic en-US value
 * - every other header passes through unchanged (original name case preserved)
 * When `enabled` is false the original headers object is returned as-is
 * (privacy toggle off → original headers restored).
 */
export function sanitizeHeaders(
  headers: Record<string, string>,
  opts?: Partial<HeaderSanitizeOptions>,
): Record<string, string> {
  const { enabled = true, userAgent = GENERIC_USER_AGENT, acceptLanguage = DEFAULT_ACCEPT_LANGUAGE } = opts ?? {}
  if (!enabled) return headers

  const out: Record<string, string> = {}
  for (const [name, value] of Object.entries(headers)) {
    const lower = name.toLowerCase()
    if (CLIENT_HINT_HEADERS.has(lower)) continue
    if (lower === 'user-agent') { out[name] = userAgent; continue }
    if (lower === 'accept-language') { out[name] = acceptLanguage; continue }
    out[name] = value
  }
  return out
}
