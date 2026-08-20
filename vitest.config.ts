import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.{ts,tsx}'],
    environment: 'node',
    setupFiles: ['tests/setup.ts'],
    // Mock electron so main-process tests run without the Electron binary
    // (CI installs with ELECTRON_SKIP_BINARY_DOWNLOAD=1).
    alias: {
      'electron': '/tmp/tony-browser/tests/__mocks__/electron.ts',
    },
    // Renderer component tests opt into jsdom via the
    // `// @vitest-environment jsdom` pragma at the top of each .test.tsx file;
    // main-process tests keep the node environment.
  },
})
