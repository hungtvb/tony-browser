// Shared test setup for renderer component tests (jsdom environment).
// Registers jest-dom matchers (toBeInTheDocument, toHaveTextContent, ...)
// and ensures React trees are unmounted between tests (vitest globals are
// not enabled, so @testing-library/react's auto-cleanup cannot hook in).
import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
})
