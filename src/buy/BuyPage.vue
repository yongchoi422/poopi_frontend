<script setup>
import { computed, ref } from 'vue'
import BuySouli from '../lighthouse/BuySouli.vue'
import WalletRelayStatus from '../lighthouse/WalletRelayStatus.vue'
import { useWallet } from '../lighthouse/use-wallet.mjs'
import { LIVE_SALE } from '../lighthouse/sale-config.mjs'
import SaleProof from '../site/SaleProof.vue'
import SaleAvailability from './SaleAvailability.vue'
const wallet = useWallet(8453)
const availability = ref(null)
const state = computed(() => ({ address: wallet.account.value, chainId: wallet.chain.value, busy: wallet.busy.value || wallet.relay.value.busy, error: wallet.error.value }))
const back = () => { location.href = '/soul/' }
</script>
<template>
  <div class="buy-page">
    <header class="buy-header"><a href="/" class="buy-brand"><img src="/images/fungi/token-logo.png" alt="">SOULI</a><nav aria-label="Purchase navigation"><a href="/whitepaper/">The details</a><a href="/soul/">My SOULI ↗</a></nav></header>
    <main>
      <div v-if="!LIVE_SALE.enabled" class="buy-closed"><b>Sale not open yet.</b><span>Explore the levels, or try a purchase with test assets.</span><a href="/testnet/">Try testnet ↗</a></div>
      <WalletRelayStatus :state="wallet.relay.value" />
      <p v-if="wallet.notice.value" class="buy-wallet-notice" role="status">{{wallet.notice.value}}</p>
      <BuySouli standalone compact :public-availability="availability" :require-availability="LIVE_SALE.enabled" :wallet-state="state" :get-provider="wallet.getProvider" @connect="wallet.connect" @disconnect="wallet.disconnect" @switch-base="wallet.connect" @close="back"><template #availability><SaleAvailability v-if="LIVE_SALE.enabled" @update="availability = $event" /></template></BuySouli>
      <div class="buy-after"><a href="/soul/">Already holding? See your SOULI ↗</a></div>
      <details class="buy-more"><summary>Where does my ETH go?<small>50 / 50 plan · No LP yet</small></summary><p>50% is planned for liquidity. 50% funds the project. The team controls and moves these funds manually.</p><p><b>No LP or lock has been created yet.</b> A one-year LP lock is planned. Liquidity and resale are not guaranteed.</p><a href="/whitepaper/#funds">The funding plan ↗</a></details>
      <details class="buy-more"><summary>Check the contracts & receipts</summary><SaleProof compact /></details>
    </main>
    <footer><a href="/">Home</a><a href="/whitepaper/">Whitepaper</a><span>Game: Cooking · No token rewards</span></footer>
  </div>
</template>
