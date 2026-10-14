<script setup>
import {computed} from 'vue'
import BuySouli from '../../src/lighthouse/BuySouli.vue'
import WalletRelayStatus from '../../src/lighthouse/WalletRelayStatus.vue'
import {useWallet} from '../../src/lighthouse/use-wallet.mjs'
import manifest from './verified-sale.json'
const wallet=useWallet(8453)
const state=computed(()=>({address:wallet.account.value,chainId:wallet.chain.value,busy:wallet.busy.value||wallet.relay.value.busy,error:wallet.error.value}))
const back=()=>{location.href='/tmp/mainnet-pilot/manage.html'}
</script>
<template><div class="buy-page"><header class="buy-header"><a href="/" class="buy-brand">SOULI</a><nav><a href="/tmp/mainnet-pilot/manage.html">Pilot manager ↗</a></nav></header><main><div class="buy-page-intro"><span>LOCAL PILOT · REAL BASE ETH + ORIGINAL SOULI</span><p>A small real-world check.</p></div><div class="buy-closed"><b>42-token mainnet pilot · 10 per wallet.</b><span>Real payment. This is separate from the public commercial sale.</span></div><WalletRelayStatus :state="wallet.relay.value"/><BuySouli standalone :sale-config="manifest" :wallet-state="state" :get-provider="wallet.getProvider" @connect="wallet.connect" @disconnect="wallet.disconnect" @switch-base="wallet.connect" @close="back"/></main></div></template>
