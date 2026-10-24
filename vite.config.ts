import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  build: {
    rollupOptions: {
      output: {
        // Pecah bundle supaya buka pertama ringan; library berat hanya dimuat saat dipakai.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (/node_modules\/xlsx\//.test(id)) return 'vendor-xlsx'
          if (/node_modules\/(jspdf|jspdf-autotable|html2canvas|canvg|dompurify|fflate)\//.test(id)) return 'vendor-pdf'
          if (/node_modules\/html5-qrcode\//.test(id)) return 'vendor-scan'
          if (/node_modules\/(recharts|recharts-scale|d3-[^/]+|victory-vendor|internmap|decimal\.js-light|lodash|react-smooth|react-transition-group|fast-equals|clsx|eventemitter3|tiny-invariant)\//.test(id)) return 'vendor-charts'
          if (/node_modules\/(react|react-dom|react-router|react-router-dom|@remix-run|scheduler)\//.test(id)) return 'vendor-react'
          if (/node_modules\/@supabase\//.test(id)) return 'vendor-supabase'
          if (/node_modules\/@tanstack\//.test(id)) return 'vendor-query'
          return undefined
        },
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      // 'prompt' = user diberi tahu dulu ("Versi baru tersedia"), baru update setelah klik
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png', 'robots.txt'],
      manifest: {
        id: '/',
        name: 'LANILA ASET',
        short_name: 'LANILA ASET',
        description: 'Aplikasi manajemen aset dan inventaris dari ekosistem Lanila.',
        lang: 'id',
        theme_color: '#0e7490',
        background_color: '#f8fafc',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        scope: '/',
        categories: ['business', 'productivity'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'Scan QR', short_name: 'Scan', url: '/scan', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
          { name: 'Daftar Aset', short_name: 'Aset', url: '/assets', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
        ],
      },
      workbox: {
        // Aset statis (JS/CSS/ikon) di-precache => cache-first. Library laporan (xlsx/pdf) besar dan
        // hanya dipakai saat online, jadi TIDAK ikut precache (di-cache saat pertama dipakai).
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        globIgnores: ['**/vendor-xlsx-*.js', '**/vendor-pdf-*.js'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Data API Supabase => network-first, fallback ke cache saat offline / sinyal lambat
            urlPattern: ({ url, request }) =>
              request.method === 'GET' && /\.supabase\.co$/.test(url.hostname) && url.pathname.startsWith('/rest/v1/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 14 },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            // Library berat untuk laporan: cache saat pertama dipakai
            urlPattern: /\/assets\/vendor-(xlsx|pdf)-.*\.js$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'heavy-libs',
              expiration: { maxEntries: 6, maxAgeSeconds: 60 * 60 * 24 * 60 },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
        // Catatan: foto aset TIDAK lewat service worker. Foto disimpan sendiri di Cache API
        // ('aset-photo-blobs', lihat src/lib/storage.ts) karena URL foto bertanda tangan selalu berubah.
      },
      devOptions: { enabled: false },
    }),
  ],
})
