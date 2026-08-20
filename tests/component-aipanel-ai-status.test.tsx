// @vitest-environment jsdom
// Issue #93 — ai.status renderer consumer: AIPanel must call window.tony.ai.status()
// on mount and after saving config, and render the provider/model state (or "Not
// configured") so the previously dead `ai:status` IPC channel is reachable from the UI.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import AIPanel from '../src/renderer/components/AIPanel'

function makeTony() {
  return {
    ai: {
      config: vi.fn(() => Promise.resolve({ baseUrl: 'https://api.openai.com/v1', apiKey: 'k', model: 'gpt-4o-mini' })),
      saveConfig: vi.fn(() => Promise.resolve(true)),
      ask: vi.fn(() => Promise.resolve({ text: 'hi' })),
      status: vi.fn(() => Promise.resolve({ configured: true, busy: false })),
    },
  }
}

describe('AIPanel (issue #93 — ai.status wiring)', () => {
  beforeEach(() => {
    vi.stubGlobal('tony', makeTony())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('calls ai.status() on mount and renders configured model/status line', async () => {
    render(<AIPanel activeTabId="t1" onClose={vi.fn()} />)
    expect(window.tony!.ai.status).toHaveBeenCalledTimes(1)
    expect(await screen.findByText(/gpt-4o-mini/)).toBeInTheDocument()
    expect(screen.getByText(/Ready/)).toBeInTheDocument()
  })

  it('renders "Not configured" when ai.status reports configured:false', async () => {
    ;(window.tony!.ai.status as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ configured: false, busy: false })
    render(<AIPanel activeTabId="t1" onClose={vi.fn()} />)
    expect(await screen.findByText(/Not configured/)).toBeInTheDocument()
  })

  it('refreshes ai.status() after saving config and re-renders the new model', async () => {
    render(<AIPanel activeTabId="t1" onClose={vi.fn()} />)
    expect(await screen.findByText(/gpt-4o-mini/)).toBeInTheDocument()
    ;(window.tony!.ai.status as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ configured: true, busy: false })
    fireEvent.click(screen.getByRole('button', { name: /ai settings/i }))
    const modelInput = screen.getByPlaceholderText(/Model/)
    fireEvent.change(modelInput, { target: { value: 'gpt-5' } })
    fireEvent.click(screen.getByText('Save config'))
    expect(window.tony!.ai.saveConfig).toHaveBeenCalledWith(expect.objectContaining({ model: 'gpt-5' }))
    expect(await screen.findByText(/gpt-5/)).toBeInTheDocument()
    expect(window.tony!.ai.status).toHaveBeenCalledTimes(2)
  })

  it('does not throw when window.tony is missing', async () => {
    vi.unstubAllGlobals()
    expect(() => render(<AIPanel activeTabId="t1" onClose={vi.fn()} />)).not.toThrow()
  })
})
