import React from 'react'
// ?raw = Vite trả về NỘI DUNG SVG thật (không phải URL)
import focusIcon from '../icons/focus.svg?raw'
import readerIcon from '../icons/reader.svg?raw'
import pipIcon from '../icons/pip.svg?raw'
import splitIcon from '../icons/split.svg?raw'
import ttsIcon from '../icons/tts.svg?raw'
import aiIcon from '../icons/ai.svg?raw'
import privacyIcon from '../icons/privacy.svg?raw'
import sleepIcon from '../icons/sleep.svg?raw'
import searchIcon from '../icons/search.svg?raw'
import tabIcon from '../icons/tab.svg?raw'
import closeIcon from '../icons/close.svg?raw'
import plusIcon from '../icons/plus.svg?raw'
import settingsIcon from '../icons/settings.svg?raw'
import saveIcon from '../icons/save.svg?raw'
import undoIcon from '../icons/undo.svg?raw'
import layoutIcon from '../icons/layout.svg?raw'
import sendIcon from '../icons/send.svg?raw'
import lockIcon from '../icons/lock.svg?raw'
import lightbulbIcon from '../icons/lightbulb.svg?raw'
import wavingIcon from '../icons/waving.svg?raw'
import sparkleIcon from '../icons/sparkle.svg?raw'
import openInNewIcon from '../icons/open_in_new.svg?raw'
import gridIcon from '../icons/grid.svg?raw'
import menuIcon from '../icons/menu.svg?raw'
import arrowIcon from '../icons/arrow.svg?raw'

// Gói icon UI — Material Symbols Rounded (Google, miễn phí)
// Inline SVG component (React.createElement từ string path)

export const ICONS: Record<string, string> = {
  focus: focusIcon, reader: readerIcon, pip: pipIcon, split: splitIcon,
  tts: ttsIcon, ai: aiIcon, privacy: privacyIcon, sleep: sleepIcon,
  search: searchIcon, tab: tabIcon, close: closeIcon, plus: plusIcon,
  settings: settingsIcon, save: saveIcon, undo: undoIcon, layout: layoutIcon,
  send: sendIcon, lock: lockIcon,
  lightbulb: lightbulbIcon, waving: wavingIcon, sparkle: sparkleIcon,
  'open-in-new': openInNewIcon, grid: gridIcon, menu: menuIcon, arrow: arrowIcon,
}

function extractPath(svg: string): string {
  // Lấy d attribute từ <path d="...">
  const m = svg.match(/<path[^>]*d="([^"]+)"/)
  return m ? m[1] : ''
}

export default function UIcon({ name, size = 18, title, color = '#fff' }: {
  name: string; size?: number; title?: string; color?: string
}) {
  const d = extractPath(ICONS[name] || aiIcon)
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 -960 960 960"
      fill={color}
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', flexShrink: 0 }}
      aria-label={title || name}
      role="img"
    >
      <path d={d} />
    </svg>
  )
}