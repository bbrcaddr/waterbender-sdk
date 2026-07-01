import { defineConfig } from 'vitest/config'

// The SDK drives the DOM (window/document), so tests run under jsdom.
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
  },
})
