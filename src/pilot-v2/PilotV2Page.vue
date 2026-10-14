<script setup>
import { computed } from 'vue'
import BuySouli from '../lighthouse/BuySouli.vue'
import WalletRelayStatus from '../lighthouse/WalletRelayStatus.vue'
import { useWallet } from '../lighthouse/use-wallet.mjs'
import { PILOT_V2_SALE } from '../lighthouse/sale-profile.mjs'
const wallet = useWallet(8453)
const state = computed(() => ({ address: wallet.account.value, chainId: wallet.chain.value, busy: wallet.busy.value || wallet.relay.value.busy, error: wallet.error.value }))
const back = () => { location.href = '/soul/' }
</script>
<template>
  <div class="buy-page">
    <header class="buy-header"><a href="/" class="buy-brand"><img src="/images/fungi/token-logo.png" alt="">SOULI</a><nav aria-label="Purchase navigation"><a href="/soul/">My SOULI</a></nav></header>
    <main>
      <div class="buy-page-intro"><span>BASE MAINNET · REAL ETH</span><p>One small purchase.</p></div>
      <div class="buy-closed" role="note"><b>Purchase check · Start with 1 SOULI</b><span>Original SOULI. Real payment. Not testnet.</span></div>
      <WalletRelayStatus :state="wallet.relay.value" />
      <BuySouli standalone purchase-profile="pilot-v2" :wallet-state="state" :get-provider="wallet.getProvider" @connect="wallet.connect" @disconnect="wallet.disconnect" @switch-base="wallet.connect" @close="back" />
      <div class="buy-after">
        <p>On your phone: connect MetaMask, approve in the app, then return to this browser.</p>
        <a :href="'https://basescan.org/address/'+PILOT_V2_SALE.address" target="_blank" rel="noreferrer">View this sale ↗</a>
        <p><a :href="'https://repo.sourcify.dev/8453/'+PILOT_V2_SALE.address" target="_blank" rel="noreferrer">Verified source code ↗</a> · Not independently audited.</p>
        <details><summary>About this check</summary><p>This V2 contract was initially stocked with 42 SOULI. The available amount is read from the contract. Its lifetime cap is 4,200,000 SOULI, including this check; 42 is not the contract cap. The contract can be accessed by anyone while open.</p><p>The policy is 50% of purchase ETH for manual LP and 50% for operations. A one-year LP principal lock is planned; no pool or lock has been created. The split and lock are not enforced by this sale contract. Unsold stock can be recovered while paused. Each of the three authorized managers can act alone.</p></details>
      </div>
    </main>
    <footer><a href="/">Home</a><a href="/soul/">My SOULI</a><span>Game cooking · No automatic LP or refunds</span></footer>
  </div>
</template>
