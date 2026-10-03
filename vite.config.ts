import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Production is published at the root of the africanmandate.org custom domain.
  base: '/',
  plugins: [react()],
  resolve: {},
  build: {
    // Matches the measured and enforced v0.1 controlled-demo budget in PRODUCTION_READINESS.md.
    chunkSizeWarningLimit: 1300,
  },
  server: {
    port: 5174,
    open: false,
  },
  test: {
    include: ['tests/unit/**/*.test.ts'],
  },
})
