import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    exclude: ['e2e/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['lib/**', 'actions/**', 'components/**'],
      exclude: ['lib/supabase.ts', 'lib/database.types.ts'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
      },
    },
  },
  resolve: {
    alias: { '@': resolve(__dirname, '.') },
  },
})
