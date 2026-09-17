<script setup>
defineProps({ state: Object })
const emit = defineEmits(['connect', 'disconnect'])
</script>

<template>
  <section class="wallet-access" aria-label="Wallet connection permissions">
    <div class="wallet-access-top"><div><small>READ-ONLY CONNECTION</small><strong>{{ state.address ? 'Your wallet is connected.' : 'Bring your soul. Keep control.' }}</strong></div><button v-if="!state.address" class="wallet-connect" :disabled="state.busy" @click="emit('connect')">{{ state.busy ? 'Check wallet…' : 'Connect wallet' }} ↗</button></div>
    <p>Share your public address to view balances and SOULI artwork.</p>
    <div class="wallet-permissions"><span>No signature</span><span>No spending approval</span><span>No payment</span></div>
    <template v-if="state.address"><code class="wallet-full-address">{{ state.address }}</code><button class="wallet-clear" :disabled="state.busy" @click="emit('disconnect')">Clear this page’s session</button><small class="wallet-clear-note">Wallet site permissions and earlier approvals stay unchanged.</small></template>
    <p v-if="state.error" class="purchase-error" role="alert">{{ state.error }}</p>
    <p v-if="state.notice" class="wallet-clear-note" role="status">{{ state.notice }}</p>
  </section>
</template>
