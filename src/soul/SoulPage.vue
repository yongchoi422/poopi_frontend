<script setup>
import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue'
import MySouli from './MySouli.vue'
import SoulCard from './SoulCard.vue'
import WalletRelayStatus from '../lighthouse/WalletRelayStatus.vue'
import { useWallet } from '../lighthouse/use-wallet.mjs'
import { createAdminReader } from '../sale-admin/read-rpc.mjs'
import { parseSoulLink, readSharedSoul } from './inscription.mjs'
const wallet = useWallet(8453), shared = shallowRef(null), hasLink = ref(false), busy = ref(false), error = ref('')
const short = computed(() => wallet.account.value.slice(0, 6) + '…' + wallet.account.value.slice(-4))
let reader, version = 0
async function load() {
  const id = ++version; reader?.destroy(); reader = undefined; shared.value = null; error.value = ''; busy.value = false
  hasLink.value = !!location.hash && location.hash !== '#'
  try {
    const pair = parseSoulLink(location.hash)
    if (!pair) return
    busy.value = true; reader = createAdminReader(8453)
    const value = await readSharedSoul(reader, pair)
    if (id === version) shared.value = value
  } catch (e) { if (id === version) error.value = e.code === 'READ_RPC_UNAVAILABLE' ? 'Base is taking a moment. Try again shortly.' : e.message || 'This soul could not load.' }
  finally { if (id === version) busy.value = false }
}
onMounted(() => { load(); window.addEventListener('hashchange', load) })
onUnmounted(() => { version++; reader?.destroy(); window.removeEventListener('hashchange', load) })
</script>
<template>
  <div class="soul-page">
    <header class="soul-page-header"><a class="soul-page-brand" href="/"><img src="/images/fungi/token-logo.png" alt="">SOULI</a><nav aria-label="SOULI navigation"><a href="/whitepaper/#inscriptions">The details</a><a href="/whitepaper/#world">World cooking ↗</a></nav></header>
    <main class="soul-page-main">
      <div class="soul-page-intro"><span>A LITTLE WORLD TO HODL</span><h1>{{ hasLink ? 'gm, meet this soul.' : 'gm, meet your soul.' }}</h1><p>{{ hasLink ? 'An on-chain character. A shareable little moment.' : 'In your wallet. Ready for the world.' }}</p></div>
      <template v-if="hasLink">
        <div v-if="busy" class="soul-loading" role="status"><span aria-hidden="true">✦</span>Reading the original artwork…</div>
        <div v-else-if="error" class="soul-empty" role="status"><strong>This soul couldn’t load.</strong><p>{{ error }}</p><button class="soul-btn" type="button" @click="load">Try again</button></div>
        <template v-else-if="shared"><SoulCard :soul="shared"/><details class="soul-details"><summary>What am I looking at?</summary><p>This look is rendered by the original SOULI contract on Base from the seed in this link. It is a snapshot of a form, not proof of current ownership, rarity, or a purchase.</p><p>This is the entire original 24 × 24 image, including its background. Buying more tokens can change a Dynamic soul.</p><a href="/whitepaper/#inscriptions">Meet ERC-20i inscriptions ↗</a></details></template>
        <div class="soul-page-bottom"><a class="soul-btn soul-btn-gold" href="/soul/">Meet your SOULI →</a><a href="/buy/">Explore SOULI ↗</a></div>
      </template>
      <template v-else>
        <WalletRelayStatus :state="wallet.relay.value" />
        <template v-if="wallet.account.value && wallet.correctChain.value"><div class="soul-page-wallet"><span>Base · {{ short }}</span><button type="button" :disabled="wallet.busy.value" @click="wallet.disconnect">Disconnect</button></div><MySouli :address="wallet.account.value" /></template>
        <div v-else class="soul-start"><img src="/images/fungi/token-logo.png" alt="SOULI coin"><button class="soul-btn soul-btn-gold" :disabled="wallet.busy.value || wallet.relay.value.busy" @click="wallet.connect">{{ wallet.busy.value || wallet.relay.value.busy ? 'Check your wallet…' : 'Connect MetaMask' }}</button><p>Just a look. No payment or signature.</p></div>
        <p v-if="wallet.error.value" class="soul-notice" role="alert">{{ wallet.error.value }}</p><p v-if="wallet.notice.value" class="soul-notice" role="status">{{ wallet.notice.value }}</p>
        <div class="soul-page-bottom"><a href="/buy/">Explore SOULI ↗</a><a href="/whitepaper/#world">World cooking ↗</a></div>
      </template>
    </main><footer class="soul-page-footer">Original ERC-20i inscriptions · Base · A world in development</footer>
  </div>
</template>
