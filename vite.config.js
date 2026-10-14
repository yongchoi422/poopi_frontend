import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { createRequire } from 'node:module'
import { saleLabPlugin } from './scripts/sale-lab-plugin.mjs'
import staticSite from './deploy/azure/staticwebapp.config.json'

const legacy = process.env.SOULI_LEGACY === '1'
const legacyRequire = createRequire(new URL('./legacy/package.json', import.meta.url))
const legacyAliases = legacy ? [
  'pinia', 'web3', 'bignumber.js', '@vueuse/core', 'vue-inline-svg',
  '@wagmi/core', '@wagmi/core/chains', '@web3modal/wagmi/vue',
].map(name => ({ find: new RegExp(`^${name.replaceAll('/', '\\/')}$`), replacement: legacyRequire.resolve(name==='web3'?'web3/dist/web3.min.js':name) })) : []

export default defineConfig({
  cacheDir: legacy ? 'node_modules/.vite-legacy' : 'node_modules/.vite',
  preview: { headers: staticSite.globalHeaders },
  optimizeDeps: {
    entries: legacy ? ['legacy.html'] : ['index.html', 'lighthouse.html', 'testnet/index.html'],
    // Prebundle the SDK's dynamically imported protocol dependencies.
    exclude: legacy ? [] : ['@metamask/connect-evm', '@metamask/connect-multichain'],
    include: legacy ? [] : [
      '@metamask/mobile-wallet-protocol-core', '@metamask/mobile-wallet-protocol-dapp-client',
      '@metamask/analytics', '@metamask/utils', '@metamask/rpc-errors', '@metamask/onboarding',
      'eciesjs', 'eventemitter3', 'semver', 'debug', 'bowser', 'pako', 'buffer', 'cross-fetch',
    ],
  },
  server: {
    proxy: { '/api': { target: 'http://127.0.0.1:8787', changeOrigin: false } },
    // Local database/emulator files can be locked on Windows. They are neither
    // web source nor downloadable assets, and must not enter the watcher.
    watch: { ignored: ['**/logs/**', '**/server/data/**', '**/*.zip'] },
    fs: { deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/logs/**', '**/server/data/**'] },
  },
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        lighthouse: fileURLToPath(new URL('./lighthouse.html', import.meta.url)),
        testnet: fileURLToPath(new URL('./testnet/index.html', import.meta.url)),
        whitepaper: fileURLToPath(new URL('./whitepaper/index.html', import.meta.url)),
        buy: fileURLToPath(new URL('./buy/index.html', import.meta.url)),
        manage: fileURLToPath(new URL('./manage/index.html', import.meta.url)),
        pilot: fileURLToPath(new URL('./pilot/index.html', import.meta.url)),
        pilotV2: fileURLToPath(new URL('./pilot-v2/index.html', import.meta.url)),
        soul: fileURLToPath(new URL('./soul/index.html', import.meta.url)),
      },
    },
  },
  plugins: [
    vue(),
    saleLabPlugin(),
  ],

  resolve: {
    dedupe: ['vue'],
    alias: [
      ...legacyAliases,
      // These packages publish ESM but advertise only their CommonJS main.
      // Select their shipped ESM builds so dynamic named imports work in Vite.
      ...['core', 'dapp-client'].map(name => ({
        find: new RegExp(`^@metamask/mobile-wallet-protocol-${name}$`),
        replacement: fileURLToPath(new URL(`./node_modules/@metamask/mobile-wallet-protocol-${name}/dist/index.mjs`, import.meta.url)),
      })),
      { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) }
    ]
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
