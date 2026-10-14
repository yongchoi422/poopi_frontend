<script setup>
import { computed, onUnmounted, ref, shallowRef, watch } from 'vue'
import SoulCard from './SoulCard.vue'
import { readOwnedSouls } from './inscription.mjs'
import { createAdminReader } from '../sale-admin/read-rpc.mjs'
const props = defineProps({ address: String, title: { type: String, default: 'My SOULI.' }, refreshKey: String, minBlock: { type: Number, default: 0 } })
const souls = shallowRef([]), busy = ref(false), error = ref(''), total = ref(0), offset = ref(0), selected = ref(0), block = ref(0)
const current = computed(() => souls.value[selected.value])
let version = 0, reader
async function load(page = 0) {
  const id = ++version; reader?.destroy(); reader = undefined
  souls.value = []; selected.value = 0; error.value = ''; block.value = 0; total.value = 0; offset.value = page
  if (!props.address) { busy.value = false; return }
  busy.value = true
  try {
    reader = createAdminReader(8453)
    const data = await readOwnedSouls(reader, props.address, { offset: page })
    if (id !== version) return
    if (data.block < props.minBlock) throw Error('Base is catching up with your purchase. Refresh in a moment.')
    souls.value = data.souls; total.value = data.total; offset.value = data.offset; block.value = data.block
  } catch (e) { if (id === version) error.value = e.code === 'READ_RPC_UNAVAILABLE' ? 'Base is taking a moment. Try refreshing your artwork.' : e.message || 'Your artwork could not load. Try again.' }
  finally { if (id === version) busy.value = false }
}
watch([() => props.address, () => props.refreshKey], () => load(), { immediate: true, flush: 'sync' })
onUnmounted(() => { version++; reader?.destroy() })
</script>
<template>
  <section class="my-souli" aria-label="Wallet inscriptions" :aria-busy="busy">
    <header class="my-souli-header"><h3>{{ title }}</h3><button type="button" class="soul-text-button" :disabled="busy" @click="load()">Refresh ↻</button></header>
    <div v-if="busy" class="soul-loading" role="status"><span aria-hidden="true">✦</span>Finding your little soul…</div>
    <div v-else-if="error" class="soul-empty" role="status"><strong>Your artwork couldn’t load.</strong><p>{{ error }}</p><button type="button" class="soul-btn" @click="load()">Try artwork again</button></div>
    <template v-else-if="current">
      <SoulCard :soul="current" />
      <div v-if="total > 1" class="soul-collection" aria-label="Choose inscription"><button v-for="(soul, index) in souls" :key="soul.seed + ':' + soul.extra + ':' + index" type="button" class="soul-btn" :aria-pressed="selected === index" @click="selected = index">{{ offset + index + 1 }} · Lv. {{ soul.level + 1 }}</button></div>
      <div v-if="total > 6" class="soul-pagination"><button class="soul-btn" type="button" :disabled="offset === 0" @click="load(Math.max(0, offset - 6))">← Previous</button><span>{{ offset + 1 }}–{{ offset + souls.length }} of {{ total }}</span><button class="soul-btn" type="button" :disabled="offset + souls.length >= total" @click="load(offset + 6)">Next →</button></div>
      <details class="soul-details"><summary>About this soul</summary><p>This is your wallet’s current collection, read from the original SOULI contract. Buying more tokens can change your Dynamic inscription instead of creating another character.</p><p>Dynamic forms can change with token movements. Stable forms follow the original contract’s transfer rules. <a href="/whitepaper/#inscriptions">How it works ↗</a></p><p>The entire original 24 × 24 image is shown, including its background.</p><p>Read at Base block {{ block.toLocaleString('en-US') }}. <a :href="'https://basescan.org/address/' + address" target="_blank" rel="noreferrer">Wallet ↗</a></p></details>
    </template>
    <div v-else class="soul-empty"><strong>Your little soul is waiting.</strong><p>No SOULI inscriptions found in this wallet on Base.</p><a href="/buy/">Explore SOULI →</a></div>
  </section>
</template>
