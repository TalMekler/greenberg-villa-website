import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // The booking API runs as a separate process; see `npm run dev:api`.
    // Point API_PROXY at a deployed URL to run the front end against real data
    // without a database locally.
    proxy: {
      '/api': {
        target: process.env.API_PROXY ?? 'http://localhost:3001',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
