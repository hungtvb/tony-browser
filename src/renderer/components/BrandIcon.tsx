import React from 'react'
// Favicon màu đầy đủ chính hãng từ Google s2 service (giống Chrome new tab dùng)
// Nguồn: https://www.google.com/s2/favicons?domain=<domain>&sz=128
import googleIcon from '../icons/brands/google.png'
import youtubeIcon from '../icons/brands/youtube.png'
import facebookIcon from '../icons/brands/facebook.png'
import gmailIcon from '../icons/brands/gmail.png'
import githubIcon from '../icons/brands/github.png'
import xIcon from '../icons/brands/x.png'
import chatgptIcon from '../icons/brands/chatgpt.png'
import zaloIcon from '../icons/brands/zalo.png'

export const BRANDS: Record<string, string> = {
  google: googleIcon,
  youtube: youtubeIcon,
  facebook: facebookIcon,
  gmail: gmailIcon,
  github: githubIcon,
  x: xIcon,
  chatgpt: chatgptIcon,
  zalo: zaloIcon,
}

// Render favicon PNG màu thương hiệu
export function BrandIcon({ name, size = 24 }: { name: string; size?: number }) {
  const src = BRANDS[name]
  if (!src) return null
  return <img src={src} width={size} height={size} alt={name} title={name} style={{ display: 'block' }} />
}