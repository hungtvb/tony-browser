// @vitest-environment jsdom
// Issue #88 — TtsPanel renderer component: speak click → window.tony.tts.speak,
// busy/stop state, error surface, and the Save/Close actions.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react'
import TtsPanel from '../src/renderer/components/TtsPanel'
import type { TonyAPI } from '../src/shared/types'

// jsdom has no speechSynthesis; stub it so the component can mount.
function stubSpeech() {
  const cancel = vi.fn()
  const speak = vi.fn()
  vi.stubGlobal('speechSynthesis', { cancel, speak })
  class Utterance { text = ''; lang = ''; rate = 0; onend: (() => void) | null = null }
  vi.stubGlobal('SpeechSynthesisUtterance', Utterance)
  return { cancel, speak, Utterance }
}

function mockTony(overrides: { ok?: boolean; error?: string; text?: string } = {}) {
  window.tony = {
    tts: { speak: vi.fn().mockResolvedValue({ ok: true, text: 'Hello world' }), stop: vi.fn().mockResolvedValue({ ok: true }) },
  } as unknown as TonyAPI
  vi.mocked(window.tony!.tts.speak).mockResolvedValue({ ok: overrides.ok ?? true, error: overrides.error, text: overrides.text ?? 'Hello world' })
  return window.tony!
}

// speak() is async: awaiting the resolved tts.speak promise needs two microtask
// turns before the follow-up state updates land.
async function flushTicks() {
  await act(async () => { await Promise.resolve(); await Promise.resolve() })
}

describe('TtsPanel (issue #88)', () => {
  let speech: ReturnType<typeof stubSpeech>

  beforeEach(() => {
    window.tony = undefined as unknown as TonyAPI
    speech = stubSpeech()
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('calls window.tony.tts.speak with the active tab id on Read article click', async () => {
    mockTony()
    render(<TtsPanel tab={{ id: 't1', title: 'A', url: 'https://a.dev' } as never} onClose={vi.fn()} onSave={vi.fn()} />)
    fireEvent.click(screen.getByText('Read article'))
    await flushTicks()
    expect(window.tony!.tts.speak).toHaveBeenCalledWith('t1')
    expect(screen.getByText('Reading article...')).toBeInTheDocument()
    expect(screen.getByText('Stop reading')).toBeInTheDocument()
  })

  it('renders the busy state and stops reading (cancel + tts.stop) when clicked again', async () => {
    mockTony()
    render(<TtsPanel tab={{ id: 't1', title: 'A', url: 'https://a.dev' } as never} onClose={vi.fn()} onSave={vi.fn()} />)
    fireEvent.click(screen.getByText('Read article'))
    await flushTicks()
    fireEvent.click(screen.getByText('Stop reading'))
    expect(speech.cancel).toHaveBeenCalled()
    // Issue #91 — tts.stop is now consumed: stopping reading also calls the
    // tts:stop IPC handler (previously orphaned, zero renderer call sites).
    expect(window.tony!.tts.stop).toHaveBeenCalled()
    expect(screen.getByText('Stopped')).toBeInTheDocument()
    expect(screen.getByText('Read article')).toBeInTheDocument()
  })

  it('surfaces the tts.speak error in the status line when the call fails', async () => {
    mockTony({ ok: false, error: 'No article' })
    render(<TtsPanel tab={{ id: 't1', title: 'A', url: 'https://a.dev' } as never} onClose={vi.fn()} onSave={vi.fn()} />)
    fireEvent.click(screen.getByText('Read article'))
    await flushTicks()
    expect(screen.getByText('No article')).toBeInTheDocument()
    expect(screen.getByText('Read article')).toBeInTheDocument()
  })

  it('does not enter speaking state when tts.speak fails', async () => {
    mockTony({ ok: false, error: 'No article' })
    render(<TtsPanel tab={{ id: 't1', title: 'A', url: 'https://a.dev' } as never} onClose={vi.fn()} onSave={vi.fn()} />)
    fireEvent.click(screen.getByText('Read article'))
    await flushTicks()
    expect(screen.queryByText('Stop reading')).not.toBeInTheDocument()
    expect(speech.speak).not.toHaveBeenCalled()
  })

  it('calls onSave when Save page is clicked and onClose when Close is clicked', () => {
    mockTony()
    const onSave = vi.fn()
    const onClose = vi.fn()
    render(<TtsPanel tab={undefined} onClose={onClose} onSave={onSave} />)
    fireEvent.click(screen.getByText('Save page'))
    expect(onSave).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes when the overlay backdrop is clicked but not when the box is clicked', () => {
    mockTony()
    const onClose = vi.fn()
    const { container } = render(<TtsPanel tab={undefined} onClose={onClose} onSave={vi.fn()} />)
    // Click on the inner box (stopPropagation) → no close
    fireEvent.click(screen.getByText('Read article / Save page'))
    expect(onClose).not.toHaveBeenCalled()
    // Click on the overlay itself → close
    fireEvent.click(container.firstChild as Element)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})