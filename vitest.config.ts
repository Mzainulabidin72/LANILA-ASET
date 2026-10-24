import { defineConfig } from 'vitest/config'
import path from 'node:path'

// Tes unit untuk logika murni (perhitungan & form). Jalankan: npm test
export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
})
