import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      '/api/higgsfield/status': {
        target: 'https://higgsfieldstatus-yc6y4fychq-as.a.run.app',
        changeOrigin: true,
        rewrite: () => '/',
      },
      '/api/higgsfield/generate': {
        target: 'https://higgsfieldgenerate-yc6y4fychq-as.a.run.app',
        changeOrigin: true,
        rewrite: () => '/',
      },
    },
  },
})
