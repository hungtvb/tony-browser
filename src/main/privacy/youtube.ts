// Block YouTube ads — block ad requests + strip ads from the player response
export interface AdUrlResult { ad: boolean }

const AD_PATTERNS = [
  /googleads\.g\.doubleclick\.net/i,
  /(?:redirector\.)?googlevideo\.com\/(?:report_m|videoplayback\?.*ad)/i,
  /yt-ads[\s./]/i,
  /\/api\/stats\/ads/i,
  /adservice\.google\.com/i,
  /\/pagead\/(?:loadads|adview|ads)/i,
  /doubleclick\.net\/pagead/i,
  /google\.com\/pagead/i,
]

export function isYouTubeAdRequest(url: string): boolean {
  try {
    const u = url.toLowerCase()
    return AD_PATTERNS.some(p => p.test(u))
  } catch {
    return false
  }
}

// Strip ads from the YouTube player response (remove adPlacements + adBreaks)
export function stripPlayerResponse(json: string): string | null {
  try {
    const data = JSON.parse(json)
    if (data.playerAds?.adPlacements) delete data.playerAds.adPlacements
    if (data.videoDetails?.adBreaks) data.videoDetails.adBreaks = []
    if (data.playerConfig?.adsConfig) delete data.playerConfig.adsConfig
    if (data.adPlacements) delete data.adPlacements
    return JSON.stringify(data)
  } catch {
    return null
  }
}