<script setup>
import { computed } from 'vue'
import BuySouli from '../lighthouse/BuySouli.vue'
import WalletRelayStatus from '../lighthouse/WalletRelayStatus.vue'
import { useWallet } from '../lighthouse/use-wallet.mjs'
import { PILOT_SALE } from '../lighthouse/sale-profile.mjs'
const wallet = useWallet(8453)
const state = computed(() => ({ address: wallet.account.value, chainId: wallet.chain.value, busy: wallet.busy.value || wallet.relay.value.busy, error: wallet.error.value }))
const back = () => { location.href = '/lighthouse.html' }
</script>
<template>
  <div class="buy-page">
    <header class="buy-header"><a href="/" class="buy-brand"><img src="/images/fungi/token-logo.png" alt="">SOULI</a><nav aria-label="Pilot navigation"><a href="/soul/">My SOULI</a><a href="/lighthouse.html">Play free ↗</a></nav></header>
    <main>
      <div class="buy-page-intro"><span>BASE MAINNET · REAL ETH</span><p>A small purchase. A real soul.</p></div>
      <div class="buy-closed" role="note"><b>Small mainnet pilot</b><span>42 SOULI total · Up to 10 per wallet</span><span>Real payment. Original SOULI. Not testnet.</span></div>
      <WalletRelayStatus :state="wallet.relay.value" />
      <BuySouli standalone purchase-profile="pilot" :wallet-state="state" :get-provider="wallet.getProvider" @connect="wallet.connect" @disconnect="wallet.disconnect" @switch-base="wallet.connect" @close="back" />
      <div class="buy-after"><p>Start with 1 SOULI. You review the price and fee before signing.</p><a :href="'https://basescan.org/address/'+PILOT_SALE.address" target="_blank" rel="noreferrer">View this sale ↗</a><p><a :href="'https://repo.sourcify.dev/8453/'+PILOT_SALE.address" target="_blank" rel="noreferrer">Verified source code ↗</a> · Source verified, not independently audited.</p></div>
    </main>
    <footer><a href="/">Home</a><a href="/whitepaper/#funds">Fund rules</a><span>Game in development · No automatic LP or refunds</span></footer>
  </div>
</template>
