import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        lighthouse: fileURLToPath(new URL('./lighthouse.html', import.meta.url)),
      },
    },
  },
  plugins: [
    vue(),
  ],

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },

  css: {
    preprocessorOptions: {
      sass: {
        additionalData: `@import '@/assets/styles/variables.sass'\n`
      }
    }
  },

  base: './',
})
