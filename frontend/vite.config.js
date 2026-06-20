import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id))
            return 'react-vendor'
          if (/[\\/]node_modules[\\/](@reduxjs|react-redux|redux|redux-persist|@tanstack)[\\/]/.test(id))
            return 'state-vendor'
          if (/[\\/]node_modules[\\/]framer-motion[\\/]/.test(id)) return 'motion-vendor'
          if (/[\\/]node_modules[\\/]recharts[\\/]/.test(id)) return 'charts-vendor'
          return undefined
        },
      },
    },
  },
})
