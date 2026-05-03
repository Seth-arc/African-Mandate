import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {},
  server: {
    port: 5174,
    open: false,
  },
  test: {
    include: ['tests/unit/**/*.test.ts'],
  },
})
