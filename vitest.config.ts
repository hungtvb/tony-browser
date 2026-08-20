import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.{ts,tsx}'],
    environment: 'node',
    setupFiles: ['tests/setup.ts'],
    // Renderer component tests opt into jsdom via the
    // `// @vitest-environment jsdom` pragma at the top of each .test.tsx file;
    // main-process tests keep the node environment.
  },
})
