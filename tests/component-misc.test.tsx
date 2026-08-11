// @vitest-environment jsdom
// Issue #88 — ContainerMenu, Feedback (ToastStack/StatusBar/useFeedback), ReaderView
// and SpeedDial: minimal render + primary click-action suites.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react'
import ContainerMenu from '../src/renderer/components/ContainerMenu'
import { ToastStack, StatusBar, useFeedback } from '../src/renderer/components/Feedback'
import ReaderView from '../src/renderer/components/ReaderView'
import SpeedDial from '../src/renderer/components/SpeedDial'
import type { TonyAPI } from '../src/shared/types'

describe('ContainerMenu (issue #88)', () => {
  it('lists all container options and calls onPick with the container id (empty url slot)', () => {
    const onPick = vi.fn()
    render(<ContainerMenu onPick={onPick} onClose={vi.fn()} />)
    for (const label of ['Default', 'Work', 'Personal', 'Banking', 'Social']) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
    fireEvent.click(screen.getByText('Work'))
    expect(onPick).toHaveBeenCalledWith('', 'work')
  })

  it('closes on overlay click but not when clicking inside the menu', () => {
    const onClose = vi.fn()
    const { container } = render(<ContainerMenu onPick={vi.fn()} onClose={onClose} />)
    fireEvent.click(screen.getByText('Open new tab in container'))
    expect(onClose).not.toHaveBeenCalled()
    fireEvent.click(container.firstChild as Element)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe('Feedback components (issue #88)', () => {
  it('ToastStack renders every toast message', () => {
    render(<ToastStack toasts={[{ id: 1, msg: 'Saved' }, { id: 2, msg: 'Failed', type: 'success' }]} />)
    expect(screen.getByText('Saved')).toBeInTheDocument()
    expect(screen.getByText('Failed')).toBeInTheDocument()
  })

  it('StatusBar renders nothing while idle and shows the message when set', () => {
    const { rerender } = render(<StatusBar status="" />)
    expect(screen.queryByText(/shield/)).not.toBeInTheDocument()
    rerender(<StatusBar status="3 tabs asleep" />)
    expect(screen.getByText('3 tabs asleep')).toBeInTheDocument()
  })

  it('useFeedback toast appends + auto-dismisses after 2.5s', () => {
    vi.useFakeTimers()
    try {
      let hook!: ReturnType<typeof useFeedback>
      function Harness() {
        hook = useFeedback()
        return (
          <div>
            {hook.toasts.map(t => <span key={t.id}>{t.msg}</span>)}
            <button onClick={() => hook.toast('Hello toast')}>fire</button>
          </div>
        )
      }
      render(<Harness />)
      fireEvent.click(screen.getByText('fire'))
      expect(screen.getByText('Hello toast')).toBeInTheDocument()
      act(() => { vi.advanceTimersByTime(2600) })
      expect(screen.queryByText('Hello toast')).not.toBeInTheDocument()
    } finally {
      cleanup()
      vi.useRealTimers()
    }
  })

  it('useFeedback status auto-clears after 5s', () => {
    vi.useFakeTimers()
    try {
      let hook!: ReturnType<typeof useFeedback>
      function Harness() {
        hook = useFeedback()
        return <span>{hook.status || '(idle)'}</span>
      }
      render(<Harness />)
      act(() => { hook.setStatus('Working...') })
      expect(screen.getByText('Working...')).toBeInTheDocument()
      act(() => { vi.advanceTimersByTime(5100) })
      expect(screen.queryByText('Working...')).not.toBeInTheDocument()
    } finally {
      cleanup()
      vi.useRealTimers()
    }
  })
})

describe('ReaderView (issue #88)', () => {
  it('renders title + content and fires onClose from the close button', () => {
    const onClose = vi.fn()
    render(<ReaderView title="My Article" content="Long form text here" onClose={onClose} />)
    expect(screen.getByRole('heading', { name: 'My Article' })).toBeInTheDocument()
    expect(screen.getByText('Long form text here')).toBeInTheDocument()
    fireEvent.click(screen.getByText('✕ Close'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('falls back to "Reader Mode" when no title is given', () => {
    render(<ReaderView title="" content="Body" onClose={vi.fn()} />)
    expect(screen.getByText('📖 Reader Mode')).toBeInTheDocument()
  })
})

describe('SpeedDial (issue #88)', () => {
  beforeEach(() => {
    window.tony = undefined as unknown as TonyAPI
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders the greeting and all 8 site tiles', () => {
    render(<SpeedDial onNavigate={vi.fn()} />)
    expect(screen.getByText('Hello Boss')).toBeInTheDocument()
    for (const name of ['Google', 'YouTube', 'Facebook', 'Gmail', 'GitHub', 'X', 'ChatGPT', 'Zalo']) {
      expect(screen.getByText(name)).toBeInTheDocument()
    }
  })

  it('calls onNavigate with the site url on tile click', () => {
    const onNavigate = vi.fn()
    render(<SpeedDial onNavigate={onNavigate} />)
    fireEvent.click(screen.getByText('GitHub'))
    expect(onNavigate).toHaveBeenCalledWith('https://github.com')
  })

  it('does not throw when window.tony is missing (renders from static data)', () => {
    expect(() => render(<SpeedDial onNavigate={vi.fn()} />)).not.toThrow()
  })
})