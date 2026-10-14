<script setup>
import { ref } from 'vue'
import PurchaseReveal from '../../src/soul/PurchaseReveal.vue'
import MySouli from '../../src/soul/MySouli.vue'
import SoulCard from '../../src/soul/SoulCard.vue'
import examples from '../../src/lighthouse/inscription-examples.json'
import '../../src/buy/buy.css'
import '../../src/lighthouse/native-sale.css'
const buyer = '0x1375b43B72676067079fb66969cb85F33EC1768B'
const receipt = { quantity: '1', account: buyer, hash: '0xa5c53410b5af2935dcab5e2bb6f9ebc5b59b6cfbc26083953821f01ce85234d5', blockNumber: 52110072 }
const mode = ref('receipt'), address = ref(buyer)
const sample = { ...examples.levels[4].examples[1], level: 4, source: 'shared' }
</script>
<template><div class="buy-page"><header class="buy-header"><a class="buy-brand" href="/">SOULI</a><span>LOCAL REVIEW · READ ONLY</span></header><main><p>Confirmed buyer receipt · No wallet connected · No transaction controls</p><div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:25px"><button @click="mode='receipt'">Purchase receipt</button><button @click="mode='sample'">Level 5 example</button><button @click="mode='wallet';address=buyer">Read buyer</button><button @click="mode='wallet';address='0x4a4AA86208EcFdBACBaD551dF7baf5D3C84425BB'">Read manager</button><button @click="mode='wallet';address='0x0000000000000000000000000000000000000001'">Read empty</button><button @click="mode='wallet';address='invalid'">Invalid address</button></div><div class="standalone-purchase"><section class="san-dialog eth-sale"><PurchaseReveal v-if="mode==='receipt'" :receipt="receipt" :chain-id="8453" :connected-account="buyer" @back="mode='wallet'"/><SoulCard v-else-if="mode==='sample'" :soul="sample"/><MySouli v-else :address="address"/></section></div></main></div></template>
