import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {},
  server: {
    port: 5174,
    open: true,
  },
})
