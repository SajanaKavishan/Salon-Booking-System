import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, '.', 'VITE_')
  const configuredApiBaseUrl = String(env.VITE_API_BASE_URL || '').trim()
  const configuredGoogleClientId = String(env.VITE_GOOGLE_CLIENT_ID || '').trim()

  if (command === 'build' && !configuredApiBaseUrl) {
    const message = 'CRITICAL BUILD ERROR: VITE_API_BASE_URL is missing in production environment!'
    console.error(message)
    throw new Error(message)
  }

  if (command === 'build' && !configuredGoogleClientId) {
    const message = 'CRITICAL BUILD ERROR: VITE_GOOGLE_CLIENT_ID is missing in production environment!'
    console.error(message)
    throw new Error(message)
  }

  return {
    plugins: [react()],
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.js',
      restoreMocks: true,
    },
    server: command === 'serve'
      ? {
          proxy: {
            '/api': {
              target: 'http://localhost:5000',
              changeOrigin: true,
            },
          },
        }
      : undefined,
  }
})
