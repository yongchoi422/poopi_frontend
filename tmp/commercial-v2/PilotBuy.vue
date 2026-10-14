<script setup>
import {computed} from 'vue'
import BuySouli from '../../src/lighthouse/BuySouli.vue'
import WalletRelayStatus from '../../src/lighthouse/WalletRelayStatus.vue'
import {useWallet} from '../../src/lighthouse/use-wallet.mjs'
import manifest from './verified-sale.json'
const wallet=useWallet(8453)
const state=computed(()=>({address:wallet.account.value,chainId:wallet.chain.value,busy:wallet.busy.value||wallet.relay.value.busy,error:wallet.error.value}))
const back=()=>{location.href='/tmp/commercial-v2/manage.html'}
</script>
<template><div class="buy-page"><header class="buy-header"><a href="/" class="buy-brand">SOULI</a><nav><a href="/tmp/commercial-v2/manage.html">Check manager ↗</a></nav></header><main><div class="buy-page-intro"><span>LOCAL V2 CHECK · REAL BASE ETH + ORIGINAL SOULI</span><p>A small real-world check.</p></div><div class="buy-closed"><b>Small mainnet check · 42 SOULI stock planned.</b><span>Real payment at the fixed V2 price. The public checkout remains closed; this contract has a lifetime 4.2M cap.</span></div><WalletRelayStatus :state="wallet.relay.value"/><BuySouli standalone :sale-config="manifest" :wallet-state="state" :get-provider="wallet.getProvider" @connect="wallet.connect" @disconnect="wallet.disconnect" @switch-base="wallet.connect" @close="back"/></main></div></template>
