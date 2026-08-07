// Privacy filters — URL pattern (tầng 2) + cosmetic CSS (tầng 3)
export interface UrlFilter {
  shouldBlock(url: string): boolean
}

// Pattern heuristic chặn URL quảng cáo/tracker
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
        // không chặn chính trang người dùng truy cập (chỉ chặn sub-resources)
        if (URL_PATTERNS.some(p => p.test(lower))) return true
        return false
      } catch {
        return false
      }
    },
  }
}

// Cosmetic filter — CSS ẩn element quảng cáo trên trang
const COSMETIC_RULES = [
  '[class*="advert"]', '[class*="ads-"]', '[class*="ad-banner"]',
  '[id*="advert"]', '[id*="ad-banner"]', '[id*="banner-ad"]',
  '[id*="banner"]', '[class*="banner"]',
  '[class*="sponsored"]', '[id*="sponsored"]', '[class*="promo"]',
  '[class*="popup"]', '[class*="sticky-ads"]', '[data-ad]', '[data-ad-slot]',
  'iframe[src*="doubleclick"]', 'iframe[src*="googleadservices"]',
  'iframe[src*="amazon-adsystem"]',
]

export function createCosmeticFilter() {
  function css(): string {
    return COSMETIC_RULES.join(',\n') + ' {\n  display: none !important;\n}\n'
  }

  // script injection ẩn ads sau khi trang load
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