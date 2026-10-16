/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    // *.live.test.ts hit the real Wikimedia APIs: run them with `npm run test:live`.
    exclude: process.env.npm_lifecycle_event === 'test:live'
      ? ['**/node_modules/**']
      : ['**/node_modules/**', '**/*.live.test.ts'],
  },
})
