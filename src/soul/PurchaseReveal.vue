<script setup>
import MySouli from './MySouli.vue'
defineProps({ receipt: { type: Object, required: true }, chainId: Number, connectedAccount: { type: String, default: '' }, backLabel: { type: String, default: 'Back to my world →' } })
const emit = defineEmits(['back'])
const short = value => value.slice(0, 6) + '…' + value.slice(-4)
const explorer = (chainId, hash) => chainId === 8453 ? 'https://basescan.org/tx/' + hash : chainId === 84532 ? 'https://sepolia.basescan.org/tx/' + hash : null
</script>
<template>
  <div class="eth-sale-success">
    <strong>{{ BigInt(receipt.quantity).toLocaleString('en-US') }} SOULI received.</strong><p>Delivered to {{ short(receipt.account) }}.</p>
    <a v-if="explorer(chainId, receipt.hash)" :href="explorer(chainId, receipt.hash)" target="_blank" rel="noreferrer">View receipt ↗</a>
    <MySouli v-if="chainId === 8453" :address="receipt.account" :refresh-key="receipt.hash" :min-block="receipt.blockNumber || 0" :title="receipt.account.toLowerCase() === connectedAccount.toLowerCase() ? 'Your soul, now.' : 'Recipient’s SOULI.'"/>
    <p v-else>Your test tokens are in your wallet. Original SOULI artwork is on Base mainnet.</p>
    <button type="button" class="san-primary" @click="emit('back')">{{ backLabel }}</button>
  </div>
</template>
