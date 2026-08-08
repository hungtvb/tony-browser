import { describe, it, expect } from 'vitest'
import { isYouTubeAdRequest, stripPlayerResponse } from '../src/main/privacy/youtube'

describe('YouTube ad request detection', () => {
  it('blocks googleads video ads', () => {
    expect(isYouTubeAdRequest('https://googleads.g.doubleclick.net/pagead/id')).toBe(true)
    expect(isYouTubeAdRequest('https://www.google.com/pagead/ads')).toBe(true)
  })

  it('blocks googlevideo ad redirects', () => {
    expect(isYouTubeAdRequest('https://redirector.googlevideo.com/report_m?v=abc')).toBe(true)
    expect(isYouTubeAdRequest('https://storage.googleapis.com/yt-ads/xyz.mp4')).toBe(true)
  })

  it('blocks yt ad domains', () => {
    expect(isYouTubeAdRequest('https://adservice.google.com/adsid')).toBe(true)
    expect(isYouTubeAdRequest('https://www.youtube.com/api/stats/ads')).toBe(true)
  })

  it('allows normal youtube video requests', () => {
    expect(isYouTubeAdRequest('https://www.youtube.com/watch?v=abc')).toBe(false)
    expect(isYouTubeAdRequest('https://www.youtube.com/embed/abc')).toBe(false)
    expect(isYouTubeAdRequest('https://i.ytimg.com/vi/abc/maxresdefault.jpg')).toBe(false)
  })

  it('allows googlevideo media streams (non-ad)', () => {
    expect(isYouTubeAdRequest('https://rr1.googlevideo.com/videoplayback?itag=18')).toBe(false)
    expect(isYouTubeAdRequest('https://manifest.googlevideo.com/api/manifest')).toBe(false)
  })
})

describe('YouTube player response stripping (bóc ads khỏi video)', () => {
  it('removes adPlacements from player response', () => {
    const resp = {
      playerAds: { adPlacements: [{ adSlot: 'x' }] },
      playabilityStatus: { status: 'OK' },
    }
    const out = stripPlayerResponse(JSON.stringify(resp))
    const parsed = JSON.parse(out!)
    expect(parsed.playerAds.adPlacements).toBeUndefined()
    expect(parsed.playabilityStatus.status).toBe('OK')
  })

  it('removes adBreaks from videoDetails', () => {
    const resp = {
      videoDetails: { videoId: 'abc', adBreaks: [{ adBreak: 1 }] },
    }
    const out = stripPlayerResponse(JSON.stringify(resp))
    const parsed = JSON.parse(out!)
    expect(parsed.videoDetails.adBreaks).toEqual([])
  })

  it('returns null for invalid JSON', () => {
    expect(stripPlayerResponse('not json')).toBeNull()
  })
})