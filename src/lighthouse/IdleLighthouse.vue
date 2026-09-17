<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick, toRaw } from 'vue'
import { duration } from './engine.mjs'
import { createIdle, toggleIdle, advanceIdle, catchUpIdle, restoreIdle, claimMemories, setIdleTide, setIdleRole } from './idle.mjs'
import { publicSouls, sampleInfo, svgUrl, shortAddress, readAddress, TOKEN } from './souli'
import VillageView from './SoulWorldView.vue'
import BuySouli from './BuySouli.vue'
import LaunchPreview from './LaunchPreview.vue'
import WalletAccess from './WalletAccess.vue'
import { createWalletSession } from './wallet-session.mjs'
import { createLaunchPreview, fundLaunchPreview, confirmLaunchPreview, expireLaunchPreview, refundLaunchPreview, launchProgress, LAUNCH_COPY } from './launch.mjs'
const KEY = 'souli-idle-v2'
const modes = {
  up: { name: 'Good vibes', word: 'UP', change: '+6.4%', line: 'Bullish on touching grass.', result: 'Memories found' },
  calm: { name: 'Sideways & cozy', word: 'CHILL', change: '0.0%', line: 'No thoughts. Just little souls.', result: 'Altars restored' },
  down: { name: 'HODL the light', word: 'DOWN', change: '−5.2%', line: 'Market red. Friendship green.', result: 'Shadows bonked' },
}
const samples = publicSouls()
const launchOpen = ref(false), launchExample = ref(createLaunchPreview())
function showLaunch() { purchase.value = false; launchOpen.value = true }
const session = ref(createIdle()), selected = ref(0), assigned = ref([...samples])
const game = computed(() => session.value.game), mode = computed(() => game.value.mode), soul = computed(() => assigned.value[selected.value])
const progress = computed(() => Math.min(100, game.value.elapsed / duration(mode.value) * 100))
const remaining = computed(() => game.value.status === 'finished' ? Math.ceil(session.value.rest) : Math.max(0, Math.ceil(duration(mode.value) - game.value.elapsed)))
const score = computed(() => mode.value === 'down' ? game.value.kills : mode.value === 'up' ? game.value.memories : game.value.repairs)
const message = ref('GM, fren. Your only job today: start chilling.')
const library = ref(false), purchase = ref(false), address = ref(''), loaded = ref([]), total = ref(0), busy = ref(false), error = ref(''), loadedAddress = ref(''), reduced = ref(false)
const walletState = ref(null)
const walletSession = createWalletSession(() => window.ethereum, value => { walletState.value = value })
walletState.value = walletSession.state
const wallet = computed(() => walletState.value.address)
let request = 0, frame = 0, lastTick = 0, lastSave = 0, previousFocus = null
watch(library, async open => {
  if (open) { previousFocus = document.activeElement; await nextTick(); document.querySelector('#souli-address')?.focus(); if (wallet.value && loadedAddress.value.toLowerCase() !== wallet.value.toLowerCase()) { address.value = wallet.value; lookup() } }
  else { await nextTick(); previousFocus?.focus() }
})
function trapFocus(event) {
  if (event.key !== 'Tab') return
  const nodes = [...event.currentTarget.querySelectorAll('button:not(:disabled), input, a[href]')]
  if (event.shiftKey && document.activeElement === nodes[0]) { event.preventDefault(); nodes[nodes.length - 1]?.focus() }
  else if (!event.shiftKey && document.activeElement === nodes[nodes.length - 1]) { event.preventDefault(); nodes[0]?.focus() }
}
function save() {
  session.value.lastSavedAt = lastTick || Date.now()
  try { localStorage.setItem(KEY, JSON.stringify(session.value)) }
  catch { message.value = 'Storage is unavailable. This visit will not be saved.' }
  lastSave = Date.now()
}
function pump(now = Date.now()) {
  const seconds = Math.max(0, (now - lastTick) / 1000)
  lastTick = now
  if (!session.value.active || seconds <= 0) return
  let result
  if (seconds > 2) {
    const copy = JSON.parse(JSON.stringify(toRaw(session.value)))
    result = advanceIdle(copy, seconds); session.value = copy
  } else result = advanceIdle(session.value, seconds)
  if (seconds > 20 && result.earned) message.value = `Back from touching grass? +${result.earned} memories are waiting.`
  else if (result.rounds) message.value = session.value.log[0].message
}
function animate() {
  if (!document.hidden) { pump(); if (Date.now() - lastSave > 2000) save() }
  frame = requestAnimationFrame(animate)
}
function visibilityChanged() { pump(); save() }
function leave() { pump(); save() }
function chill() {
  pump()
  const active = toggleIdle(session.value)
  message.value = active ? 'The squad has this. Go touch grass, ser.' : 'Paused. Even diamond hands need a snack.'
  save()
}
function claim() {
  pump()
  const amount = claimMemories(session.value)
  if (amount) message.value = `+${amount} memories claimed. Proof of good vibes.`
  save()
}
function setMode(value) { if (setIdleTide(session.value, value)) { message.value = modes[value].line; save() } }
function setRole(value) { if (setIdleRole(session.value, selected.value, value)) { message.value = 'Squad updated. The little legends are ready.'; save() } }
async function lookup() {
  const token = ++request
  busy.value = true; error.value = ''; loaded.value = []; loadedAddress.value = ''
  const requested = address.value.trim()
  try {
    const result = await readAddress(requested)
    if (token !== request) return
    loaded.value = result.souls; total.value = result.total; loadedAddress.value = requested
    if (!result.souls.length) error.value = 'No SOULI inscriptions found at this address.'
  } catch (cause) {
    if (token === request) error.value = cause.message.startsWith('Enter') ? cause.message : 'Base is taking a breather. Check the address and try again.'
  } finally { if (token === request) busy.value = false }
}
async function connectWallet() {
  const account = await walletSession.connect()
  if (account) { address.value = account; await lookup() }
}
function chooseSoul(value) { assigned.value[selected.value] = { ...value }; message.value = `${value.label} joined the cozy squad.`; library.value = false }
watch(wallet, value => {
  request++; busy.value = false; loaded.value = []; loadedAddress.value = ''
  address.value = value
})
function sourceLabel(value) {
  if (value.source === 'public') return 'Public SVG · practice soul'
  if (wallet.value && value.owner.toLowerCase() === wallet.value.toLowerCase()) return 'Connected wallet · snapshot'
  return 'Address snapshot · ownership unverified'
}
onMounted(() => {
  reduced.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const now = Date.now()
  try {
    const saved = restoreIdle(localStorage.getItem(KEY))
    if (saved) {
      const away = catchUpIdle(saved, now); session.value = saved
      if (away.earned) message.value = `GM again. Your squad found ${away.earned} memories while you were away.`
    } else {
      const legacy = JSON.parse(localStorage.getItem('souli-lighthouse-v1') || 'null')
      if (legacy) {
        session.value = createIdle({ memories: Number.isFinite(legacy.memories) ? Math.max(0, legacy.memories) : 0, night: Number.isSafeInteger(legacy.night) && legacy.night > 0 ? legacy.night + 1 : 1 })
        session.value.log = (Array.isArray(legacy.nights) ? legacy.nights : []).slice(0, 6).map(entry => ({ ...entry, message: entry.mode === 'up' ? `The squad found ${entry.memories || 0} memories.` : entry.mode === 'down' ? 'Another night at the beacon. Still here. Still glowing.' : 'A cozy day in the village.', help: 'From your earlier village adventures.', earned: 0 }))
      }
    }
  } catch { /* Saved prototypes are optional; a fresh village always works. */ }
  const entry = new URLSearchParams(window.location.search)
  const entrySoul = entry.get('soul')
  if (entrySoul !== null && /^[0-5]$/.test(entrySoul)) selected.value = Number(entrySoul)
  if (entry.get('panel') === 'souls') library.value = true
  else if (entry.get('panel') === 'launch') launchOpen.value = true
  lastTick = now; save()
  document.addEventListener('visibilitychange', visibilityChanged); window.addEventListener('pagehide', leave)
  frame = requestAnimationFrame(animate)
})
onUnmounted(() => {
  leave(); request++; cancelAnimationFrame(frame)
  walletSession.destroy()
  document.removeEventListener('visibilitychange', visibilityChanged); window.removeEventListener('pagehide', leave)
})
</script>

<template>
  <div class="game-app" :class="{ 'reduce-motion': reduced }">
    <VillageView :mode="mode" :modes="modes" :game="game" :souls="assigned" :selected="selected"
      :night="game.night" :memories="session.memories" :bank="session.bank" :nights="session.log" :active="session.active"
      :remaining="remaining" :progress="progress" :score="score" :message="message" :source="sourceLabel(soul)" :library-open="library || purchase || launchOpen"
      :launch-phase="launchExample.phase" :launch-progress="launchProgress(launchExample)" :launch-label="LAUNCH_COPY[launchExample.phase].label"
      @mode="setMode" @role="setRole" @select="selected = $event" @chill="chill" @claim="claim" @library="library = true" @purchase="purchase = true" @launch="showLaunch" />
    <BuySouli v-if="purchase" :soul="soul" :wallet-state="walletState" @close="purchase = false" @launch="showLaunch" @connect="walletSession.connect()" @disconnect="walletSession.disconnect()" @switch-base="walletSession.switchBase()" />
    <LaunchPreview v-if="launchOpen" :state="launchExample" :souls="assigned" @close="launchOpen = false"
      @fund="launchExample = fundLaunchPreview(launchExample, $event)" @confirm="launchExample = confirmLaunchPreview(launchExample)"
      @expire="launchExample = expireLaunchPreview(launchExample)" @refund="launchExample = refundLaunchPreview(launchExample)" @reset="launchExample = createLaunchPreview(launchExample.targetUsdc)" @target="launchExample = createLaunchPreview($event)" />
    <div v-if="library" class="modal-backdrop" @click.self="library = false" @keydown.esc="library = false" @keydown="trapFocus">
      <section class="library-dialog" role="dialog" aria-modal="true" aria-labelledby="library-title">
        <div class="section-title"><div><p class="eyebrow">YOUR SOUL, YOUR STORY</p><h2 id="library-title">My Souls</h2></div><button class="square-button" @click="library = false" aria-label="Close soul library">✕</button></div>
        <p class="library-intro">Use the actual SOULI SVG from your wallet. Same soul. New adventure.</p>
        <form class="address-form" @submit.prevent="lookup"><label for="souli-address">Base wallet address <span>Read only</span></label><div><input id="souli-address" v-model="address" placeholder="0x…" autocomplete="off" spellcheck="false" /><button class="primary-button" :disabled="busy">{{ busy ? 'Looking…' : 'Find souls' }}</button></div></form>
        <WalletAccess :state="walletState" @connect="connectWallet" @disconnect="walletSession.disconnect()" />
        <button v-if="wallet" class="text-button" :disabled="busy" @click="address = wallet; lookup()">Load my connected wallet’s souls ↗</button>
        <p class="library-caption">No signatures or transactions. An address lookup is not proof of ownership.</p><p v-if="error" class="error-message" role="alert">{{ error }}</p>
        <div v-if="loaded.length" class="library-section"><h3>{{ shortAddress(loadedAddress) }} <small>{{ loaded.length }} of {{ total }} souls · up to 8 previewed</small></h3><div class="soul-library"><button v-for="(item,i) in loaded" :key="i" @click="chooseSoul(item)"><img :src="svgUrl(item.svg)" :alt="item.label" /><span>{{ item.label }}</span></button></div></div>
        <div class="library-section"><h3>Meet the practice squad <small>Real public SVGs. Simulated companions.</small></h3><div class="soul-library"><button v-for="(item,i) in samples" :key="i" @click="chooseSoul(item)"><img :src="svgUrl(item.svg)" :alt="item.label" /><span>{{ item.label }}</span></button></div><p class="library-caption">Original SVGs from Base block {{ sampleInfo.block.toLocaleString() }}. Bodies, eyes and colors stay unchanged; recognized background layers are separated on the map.</p><a class="contract-link" :href="`https://basescan.org/address/${TOKEN}`" target="_blank" rel="noreferrer">View SOULI contract ↗</a></div>
      </section>
    </div>
  </div>
</template>
