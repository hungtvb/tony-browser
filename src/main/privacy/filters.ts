// Privacy filters — URL pattern (layer 2) + cosmetic CSS (layer 3)
export interface UrlFilter {
  shouldBlock(url: string): boolean
}

// Heuristic patterns that block ad/tracker URLs
const URL_PATTERNS = [
  /[\/.]ads\./, /[\/.]adservice\./, /[\/.]adserver\./, /[\/.]adnxs\./,
  /[\/.]doubleclick\./, /[\/.]googlesyndication\./, /[\/.]googleadservices\./,
  /[\/.]scorecardresearch\./, /[\/.]quantserve\./, /[\/.]moatads\./,
  /\/ads\/|\/advert(?:isement)?s?\//, /\/banners?\//, /\/sponsored[\/.]/,
  /[\/.]ads?bygoogle\./, /\/ads\.js/, /\/adsbygoogle\.js/, /\/gtag\/js\?.*id=G-/,
  /(?:impression|tracking|pixel|beacon|telemetry)[\/.=?]/,
  /[\/.]analytics\./, /[\/.]google-analytics\./, /[\/.]facebook\.com\/tr\//,
]

export function createUrlFilter(): UrlFilter {
  return {
    shouldBlock(url: string): boolean {
      try {
        const lower = url.toLowerCase()
        // do not block the page the user is visiting (only block sub-resources)
        if (URL_PATTERNS.some(p => p.test(lower))) return true
        return false
      } catch {
        return false
      }
    },
  }
}

// Cosmetic filter — CSS that hides ad elements on the page
const COSMETIC_RULES = [
  '[class*="advert"]', '[class*="ads-"]', '[class*="ad-banner"]',
  '[id*="advert"]', '[id*="ad-banner"]', '[id*="banner-ad"]',
  '[id*="banner"]', '[class*="banner"]',
  '[class*="sponsored"]', '[id*="sponsored"]', '[class*="promo"]',
  '[class*="popup"]', '[class*="sticky-ads"]', '[data-ad]', '[data-ad-slot]',
  'iframe[src*="doubleclick"]', 'iframe[src*="googleadservices"]',
  'iframe[src*="amazon-adsystem"]',
  // YouTube ads (ytd polymer elements)
  'ytd-ad-slot-renderer', 'ytd-display-ad-renderer', 'ytd-in-feed-ad-layout-renderer',
  'ytd-banner-promo-renderer', 'ytd-statement-banner-renderer',
  '#masthead-ad', '#player-ads', '#video-masthead', '#related ytd-ad-slot-renderer',
  '[class*="ytd-ad-slot"]', '[class*="ad-container"]', '[class*="ytp-ad"]',
]

export function createCosmeticFilter() {
  function css(): string {
    return COSMETIC_RULES.join(',\n') + ' {\n  display: none !important;\n}\n'
  }

  // script injection hides ads after the page loads
  function injectScript(): string {
    return `
      (() => {
        const style = document.createElement('style');
        style.textContent = ${JSON.stringify(css())};
        document.head?.appendChild(style);
        const obs = new MutationObserver(() => {
          document.querySelectorAll(${JSON.stringify(COSMETIC_RULES.join(','))}).forEach(el => el.remove());
        });
        obs.observe(document.body || document.documentElement, { childList: true, subtree: true });
      })()
    `
  }

  return { css, injectScript }
}