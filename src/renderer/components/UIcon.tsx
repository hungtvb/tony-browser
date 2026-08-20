import React from 'react'
// UI icon pack — Remix Icon (line style, clean strokes) + Evernote 4-color category coding
import {
  RiFocus2Line, RiBook2Line, RiPictureInPicture2Line, RiLayoutColumnLine,
  RiVolumeUpLine, RiSparkling2Line, RiShieldCheckLine, RiMoonLine,
  RiSearchLine, RiLayoutGridLine, RiCloseLine, RiAddLine, RiSettings3Line,
  RiSave3Line, RiArrowGoBackLine, RiSendPlaneLine, RiLockLine, RiLightbulbLine,
  RiSparklingLine, RiExternalLinkLine, RiGridLine, RiMenuLine, RiArrowRightLine,
  RiArrowLeftLine, RiRefreshLine, RiFullscreenLine, RiGlobeLine, RiFileTextLine,
  RiBookmarkLine, RiRobotLine, RiAlertLine, RiStopCircleLine, RiCheckLine,
  RiEyeLine, RiSunLine, RiStarLine, RiHeartLine, RiHomeLine, RiNotificationLine,
  RiEmotionHappyLine, RiEditLine, RiStackLine,
} from '@remixicon/react'

// RemixIcon extended so callers may pass aria-label/role/style (a11y + layout)
type RemixIcon = React.ComponentType<{
  size?: number | string
  color?: string
  title?: string
  'aria-label'?: string
  role?: string
  style?: React.CSSProperties
}>

export const ICONS: Record<string, RemixIcon> = {
  focus: RiFocus2Line, reader: RiBook2Line, pip: RiPictureInPicture2Line, split: RiLayoutColumnLine,
  tts: RiVolumeUpLine, ai: RiSparkling2Line, privacy: RiShieldCheckLine, sleep: RiMoonLine,
  search: RiSearchLine, tab: RiLayoutGridLine, close: RiCloseLine, plus: RiAddLine,
  settings: RiSettings3Line, save: RiSave3Line, undo: RiArrowGoBackLine,
  layout: RiLayoutGridLine, send: RiSendPlaneLine, lock: RiLockLine, lightbulb: RiLightbulbLine,
  sparkle: RiSparklingLine, 'open-in-new': RiExternalLinkLine,
  grid: RiGridLine, menu: RiMenuLine, arrow: RiArrowRightLine, 'arrow-back': RiArrowLeftLine,
  'arrow-forward': RiArrowRightLine, refresh: RiRefreshLine, viewport: RiFullscreenLine,
  globe: RiGlobeLine, 'file-text': RiFileTextLine, 'book-marked': RiBookmarkLine,
  bot: RiRobotLine, 'alert-triangle': RiAlertLine, 'circle-stop': RiStopCircleLine,
  check: RiCheckLine, x: RiCloseLine, eye: RiEyeLine, sun: RiSunLine, star: RiStarLine,
  heart: RiHeartLine, home: RiHomeLine, bell: RiNotificationLine,
  wave: RiEmotionHappyLine,
  edit: RiEditLine, light_mode: RiSunLine, dark_mode: RiMoonLine,
  stack: RiStackLine,
}

// Evernote category coding — colored accents for feature icons (lime/blue/yellow/purple)
const CATEGORY: Record<string, string> = {
  focus: '#94e130',   // lime
  reader: '#4a8fe0',  // blue
  ai: '#e8b93a',      // yellow
  privacy: '#9b6fd0', // purple
  tts: '#4a8fe0',
  pip: '#e8b93a',
  split: '#9b6fd0',
  sleep: '#4a8fe0',
  'book-marked': '#4a8fe0',
  bot: '#9b6fd0',
  'file-text': '#4a8fe0',
  lightbulb: '#e8b93a',
  bell: '#e8b93a',
  'alert-triangle': '#e8b93a',
}

export default function UIcon({ name, size = 18, title, color }: {
  name: string; size?: number; title?: string; color?: string
}) {
  const C = ICONS[name] || RiSparklingLine
  const final = color ?? CATEGORY[name] ?? '#141414'
  return (
    <C
      size={size}
      color={final}
      aria-label={title || name}
      role="img"
      style={{ display: 'block', flexShrink: 0 }}
    />
  )
}
