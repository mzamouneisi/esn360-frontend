/// <reference types="vitest/config" />
import { execSync } from 'node:child_process'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function lastCommitDate(): string {
  try {
    const iso = execSync('git log -1 --format=%ci').toString().trim()
    const m = iso.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/)
    if (m) return `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}`
    return iso
  } catch {
    return new Date().toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), tailwindcss()],
    base: env.VITE_BASE_PATH || '/',
    define: {
      __BUILD_DATE__: JSON.stringify(lastCommitDate()),
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:8080',
          changeOrigin: true,
        },
      },
    },
    test: {
      environment: 'happy-dom',
      setupFiles: ['./src/test/setup.ts'],
      globals: false,
      css: false,
      env: { TZ: 'UTC' },
    },
  }
})
