<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { MAINNET_ADMIN } from '../sale-admin/config.mjs'
import { readAdminState } from '../sale-admin/client.mjs'
import { createAdminReader } from '../sale-admin/read-rpc.mjs'
const state = ref(null), loading = ref(false), unavailable = ref(false)
const emit = defineEmits(['update'])
const reader = createAdminReader(8453)
let timer, disposed = false
const count = value => BigInt(value).toLocaleString('en-US')
async function refresh() {
  if (loading.value || disposed) return
  loading.value = true
  try {
    const next = await readAdminState(reader, MAINNET_ADMIN)
    if (!disposed) { state.value = next; unavailable.value = false; emit('update', { ...next, checkedAt: Date.now() }) }
  } catch { if (!disposed) { state.value = null; unavailable.value = true; emit('update', null) } }
  finally { if (!disposed) loading.value = false }
}
const onVisible = () => { if (!document.hidden) refresh() }
onMounted(() => { refresh(); timer = setInterval(onVisible, 45000); document.addEventListener('visibilitychange', onVisible) })
onUnmounted(() => { disposed = true; clearInterval(timer); reader.destroy(); document.removeEventListener('visibilitychange', onVisible) })
</script>
<template>
  <section class="sale-availability" aria-label="Current sale availability">
    <div><strong :class="{'sale-open':state?.status==='Open'}">{{state ? (state.status==='Open' ? 'Sale open' : state.status==='Paused' ? 'Sale paused' : state.status) : unavailable ? 'Status unavailable' : 'Checking Base…'}}</strong><span v-if="state" class="stock-count">{{count(state.available)}} available</span><button :disabled="loading" @click="refresh" aria-label="Refresh sale availability">↻</button></div>
    <p v-if="state?.paused">Purchases are paused. Check back for updates.</p>
    <p v-else-if="unavailable">Could not verify current stock. Try again before buying.</p>
    <details><summary>Live stock details</summary><p v-if="state"><b>{{count(state.available)}} SOULI available</b> · {{count(state.sold)}} / 4.2M sold.</p><p>1.4M first stock target. Another 2.8M may be added while selling, within the same 4.2M lifetime cap. No extra personal limit. A stock target is not a dollar cap or an automatic LP launch.</p><a href="/whitepaper/#tokenomics">Price & funding plan ↗</a><small v-if="state">Verified at Base block {{count(state.block)}}. Your purchase checks stock again.</small></details>
  </section>
</template>
<style scoped>
.sale-availability{margin:22px 0;padding:18px 20px;border:1.5px solid #b5c8ee;border-radius:18px;background:#edf3ff;color:#172450;font:14px/1.6 var(--font-ui,system-ui)}.sale-availability>div{display:flex;align-items:center;justify-content:space-between}.sale-availability button{border:1px solid #a5b7d8;border-radius:10px;background:white;color:#234abd;min-width:42px;min-height:42px;font-size:22px;cursor:pointer}.sale-availability p{margin:6px 0}.sale-availability small{display:block;font-size:11px;margin-top:10px;color:#526180}.sale-availability summary{cursor:pointer;font-size:12px;font-weight:700}.sale-availability details{margin-top:10px}.sale-availability details p{font-size:12px}.sale-availability a{color:#2455ee}.sale-availability :focus-visible{outline:3px solid #2455ee;outline-offset:3px}
</style>

<style scoped>
.sale-availability{padding:13px 17px;margin:18px 0}.sale-availability>div{gap:12px}.sale-availability strong{font-size:13px}.sale-open::before{content:'';display:inline-block;width:7px;height:7px;margin-right:8px;border-radius:50%;background:#277453}.stock-count{margin-left:auto;font-size:12px;font-weight:650;text-align:right}.sale-availability button{min-width:32px;min-height:32px;font-size:18px}.sale-availability details{margin-top:5px}.sale-availability summary{font-size:11px;color:#526180}@media(max-width:360px){.sale-availability{padding:12px}.sale-availability>div{gap:8px}.stock-count{font-size:11px}}
</style>
