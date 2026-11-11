import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { cafeDbVitePlugin } from './server/cafeDbPlugin.js'

export default defineConfig({
  plugins: [
    react(),
    cafeDbVitePlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Chatter & Platter Cafe',
        short_name: 'C&P Cafe',
        description: 'AI Smart QR Ordering & Kitchen OS for Chatter & Platter Cafe',
        theme_color: '#FFC107',
        background_color: '#FFFDF5',
        display: 'standalone',
        icons: [
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }
        ]
      }
    })
  ]
})
