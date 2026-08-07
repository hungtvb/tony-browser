import { useEffect, useState } from 'react'
import type { TabState } from '../../shared/types'

export function useTabs() {
  const [tabs, setTabs] = useState<TabState[]>([])
  const [activeId, setActiveId] = useState<string>('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const tony = window.tony
    if (!tony) return
    tony.tabs.list().then(list => {
      setTabs(list)
      setActiveId(list.length ? list[list.length - 1].id : '')
      setReady(true)
    })
    tony.tabs.onChange(list => {
      setTabs(list)
      // nếu active tab bị đóng, chọn tab cuối
      setActiveId(prev => list.some(t => t.id === prev) ? prev : (list[list.length - 1]?.id ?? ''))
    })
  }, [])

  function open(url: string) {
    window.tony?.tabs.open(url).then(t => setActiveId(t.id))
  }
  function close(id: string) {
    window.tony?.tabs.close(id)
  }
  function activate(id: string) {
    setActiveId(id)
    window.tony?.tabs.activate(id)
  }

  return { tabs, activeId, ready, open, close, activate }
}
