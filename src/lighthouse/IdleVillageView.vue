<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import PixelVillage from './PixelVillage.vue'
import PixelWilds from './PixelWilds.vue'
import CommunityLights from './CommunityLights.vue'
import { WORLD_SCALES, createContributionPreview, addPreviewLight } from './community.mjs'
import { ROLES, ALTARS } from './engine.mjs'
import { svgUrl } from './souli'
const props = defineProps({ mode: String, modes: Object, game: Object, souls: Array, selected: Number, night: Number, memories: Number, bank: Number, nights: Array, active: Boolean, remaining: Number, progress: Number, score: Number, message: String, source: String, libraryOpen: Boolean, launchPhase: String, launchProgress: Number, launchLabel: String })
const emit = defineEmits(['mode', 'role', 'select', 'chill', 'claim', 'library', 'purchase', 'launch'])
const W = 3840, H = 2560
const viewport = ref(null), zoom = ref(1), pan = ref({ x: 0, y: 0 }), dragging = ref(false)
const selectedBuilding = ref(''), journalOpen = ref(false), squadOpen = ref(false), tideOpen = ref(false)
const fullscreen = ref(false), notice = ref(''), viewportSize = ref({ width: 1280, height: 720 })
const contribution = ref(createContributionPreview()), communityWorld = ref(false), worldScale = ref(100000)
const helperSoul = ref(null), lightPulse = ref(0)
const worldCount = computed(() => worldScale.value - 1 + contribution.value.light)
let dragStart = null, observer = null, previousFocus = null, firstSize = true
const current = computed(() => props.modes[props.mode])
const selectedSoul = computed(() => props.souls[props.selected])
const worldTransform = computed(() => `translate(-50%, -50%) translate(${pan.value.x}px, ${pan.value.y}px) scale(${zoom.value})`)
const miniRect = computed(() => ({
  x: Math.max(0, (W / 2 - pan.value.x / zoom.value - viewportSize.value.width / zoom.value / 2) / W * 144),
  y: Math.max(0, (H / 2 - pan.value.y / zoom.value - viewportSize.value.height / zoom.value / 2) / H * 96),
  width: Math.min(144, viewportSize.value.width / zoom.value / W * 144),
  height: Math.min(96, viewportSize.value.height / zoom.value / H * 96),
}))
const activity = computed(() => props.game.status === 'finished' ? 'Quick nap. Next adventure soon.' : props.mode === 'up' ? 'Touching grass. Finding memories.' : props.mode === 'down' ? 'Diamond hands. Tiny defenders.' : 'Sideways market. Elite-level chilling.')
const buildingInfo = computed(() => ({
  lighthouse: { title: 'HODL Lighthouse', text: 'Keep the little light alive. The squad defends it automatically.', value: `${Math.round(props.game.shield)}% shield`, symbol: '✦' },
  home: { title: 'Cozy Soul House', text: 'A place to nap after a long day of being a little legend.', value: 'Village scenery', symbol: '⌂' },
  workshop: { title: 'Proof of Vibes', text: 'No charts here. Just a cozy workshop for the soul squad.', value: 'Village scenery', symbol: '⚒' },
  observatory: { title: 'Wen Moon Observatory', text: 'Up: explore. Sideways: rest. Down: defend. Repeat, together.', value: 'Village scenery', symbol: '✧' },
}[selectedBuilding.value]))
function clampPan() {
  const maxX = Math.max(0, (W * zoom.value - viewportSize.value.width) / 2)
  const maxY = Math.max(0, (H * zoom.value - viewportSize.value.height) / 2)
  pan.value = { x: Math.max(-maxX, Math.min(maxX, pan.value.x)), y: Math.max(-maxY, Math.min(maxY, pan.value.y)) }
}
function centerMap() { communityWorld.value = false; pan.value = { x: 0, y: 0 }; zoom.value = Math.max(.78, Math.min(1.1, Math.max(.92, viewportSize.value.width / 1100), viewportSize.value.height / 720)); clampPan() }
function overview() { pan.value = { x: 0, y: 0 }; zoom.value = Math.max(.08, Math.min(viewportSize.value.width / W, viewportSize.value.height / H) * .96) }
function toggleCommunityWorld() { if (communityWorld.value) centerMap(); else { communityWorld.value = true; overview() } }
function findMyLight() {
  centerMap()
  const index = contribution.value.slot ?? props.selected
  const altar = ALTARS[index]
  // Frame the helper, beacon, and completed path together, including on phones.
  const left = Math.min(altar.x * 3.84, 188), right = Math.max(altar.x * 3.84, 231)
  zoom.value = Math.min(zoom.value, (viewportSize.value.width - 65) / ((right - left + 45) * 1280 / 384))
  pan.value = { x: (W / 2 - (1280 + (left + right) / 2 * 1280 / 384)) * zoom.value, y: (H / 2 - (853.333 + 108.5 * 1280 / 384)) * zoom.value + 35 }
  selectedBuilding.value = ''; emit('select', index); clampPan(); lightPulse.value++
  notice.value = 'Your +1 lit the last lantern. Smol soul. Big help. (Local demo)'
}
function tryOneSoul() {
  if (!contribution.value.light) {
    helperSoul.value = { ...selectedSoul.value }
    contribution.value = addPreviewLight(contribution.value, props.selected)
  }
  findMyLight()
}
function zoomBy(delta) { zoom.value = Math.max(.12, Math.min(1.75, Math.round((zoom.value + delta) * 100) / 100)); clampPan() }
function startDrag(event) {
  if (event.button !== 0 || event.target.closest('button, details, .camera-controls, .minimap')) return
  dragging.value = true
  dragStart = { x: event.clientX, y: event.clientY, panX: pan.value.x, panY: pan.value.y }
  viewport.value.setPointerCapture(event.pointerId)
}
function drag(event) {
  if (!dragging.value || !dragStart) return
  pan.value = { x: dragStart.panX + event.clientX - dragStart.x, y: dragStart.panY + event.clientY - dragStart.y }; clampPan()
}
function stopDrag() { dragging.value = false; dragStart = null }
function moveByKey(event) {
  if (event.target !== viewport.value) return
  const movement = { ArrowLeft: [80, 0], ArrowRight: [-80, 0], ArrowUp: [0, 80], ArrowDown: [0, -80] }[event.key]
  if (movement) { event.preventDefault(); pan.value = { x: pan.value.x + movement[0], y: pan.value.y + movement[1] }; clampPan() }
}
function miniNavigate(event) {
  if (event.detail === 0) { centerMap(); return }
  const bounds = event.currentTarget.querySelector('svg').getBoundingClientRect()
  const x = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width))
  const y = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height))
  if (zoom.value < .5) zoom.value = .92
  pan.value = { x: (W / 2 - x * W) * zoom.value, y: (H / 2 - y * H) * zoom.value }; clampPan()
}
function choose(index) { selectedBuilding.value = ''; emit('select', index) }
async function toggleFullscreen() {
  try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen() }
  catch { notice.value = 'Fullscreen is unavailable here. Expand the browser panel for a bigger world.' }
}
function syncFullscreen() { fullscreen.value = Boolean(document.fullscreenElement) }
function trapJournal(event) {
  if (event.key === 'Escape') journalOpen.value = false
  if (event.key !== 'Tab') return
  const nodes = [...event.currentTarget.querySelectorAll('button, a[href]')]
  if (event.shiftKey && document.activeElement === nodes[0]) { event.preventDefault(); nodes[nodes.length - 1].focus() }
  else if (!event.shiftKey && document.activeElement === nodes[nodes.length - 1]) { event.preventDefault(); nodes[0].focus() }
}
watch(journalOpen, async open => {
  if (open) { previousFocus = document.activeElement; await nextTick(); document.querySelector('.journal-close')?.focus() }
  else { await nextTick(); previousFocus?.focus() }
})
watch(() => props.active, active => { if (active) { squadOpen.value = false; tideOpen.value = false } })
onMounted(() => {
  observer = new ResizeObserver(entries => {
    const size = entries[0].contentRect
    viewportSize.value = { width: size.width, height: size.height }
    if (firstSize) { firstSize = false; centerMap() }
    if (communityWorld.value) overview(); else clampPan()
  })
  observer.observe(viewport.value); document.addEventListener('fullscreenchange', syncFullscreen)
})
onUnmounted(() => { observer?.disconnect(); document.removeEventListener('fullscreenchange', syncFullscreen) })
</script>

<template>
  <div class="village-game idle-village has-community" :class="[`tide-${mode}`, { 'community-world': communityWorld }]">
    <div class="game-surface" :inert="libraryOpen || journalOpen || null">
      <header class="game-hud">
        <div class="village-identity"><div class="village-emblem"><svg viewBox="0 0 24 24" shape-rendering="crispEdges" aria-hidden="true"><path d="M9 1H15V4H18V8H21V15H18V19H15V22H9V19H6V15H3V8H6V4H9Z" fill="#b9a8da" /><path d="M10 5H14V8H17V14H14V18H10V14H7V8H10Z" fill="#eee5ba" /><path d="M11 8H13V15H11Z" fill="#fff9dc" /></svg></div><div><h1>SOULI <span>VILLAGE</span></h1><p>little souls, big world <span>· day {{ night }}</span></p></div></div>
        <div class="hud-resources"><div class="resource memory-resource"><span>✧</span><div><small>Memories</small><strong>{{ memories.toLocaleString() }}</strong></div></div><div class="resource shield-resource"><span>▣</span><div><small>Beacon</small><strong>{{ Math.round(game.shield) }}<em>%</em></strong></div></div></div>
        <button class="purchase-entry" @click="emit('purchase')" aria-label="Buy SOULI"><span>✦</span><strong>Buy SOULI</strong></button>
        <button class="hud-square fullscreen-button" @click="toggleFullscreen" :aria-label="fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'">{{ fullscreen ? '↙' : '⛶' }}</button>
      </header>
      <div class="weather-hud"><span class="season-title">{{ current.name }} <b>{{ current.change }}</b></span><span class="demo-label">DEMO TIDE · AUTO</span><button class="tide-edit" :aria-expanded="tideOpen" aria-controls="tide-options" @click="tideOpen = !tideOpen" aria-label="Show demo tide controls">⌄</button><div v-if="tideOpen" id="tide-options" class="tide-popover"><p>Simulated weather, zero chart stress.</p><div class="tide-controls"><button v-for="(item, key) in modes" :key="key" :disabled="active" :class="{ active: mode === key }" :aria-pressed="mode === key" @click="emit('mode', key)">{{ key === 'up' ? '↗' : key === 'down' ? '↘' : '—' }} {{ item.word }}</button></div><small>{{ active ? 'Pause to preview a different tide.' : 'The tides rotate when your squad is chilling.' }}</small></div></div>
      <aside class="community-card" :class="{ 'is-helped': contribution.light }" aria-label="Shared world local demo">
        <small>ONE WORLD · LOCAL DEMO</small>
        <template v-if="!communityWorld">
          <h2>{{ contribution.light ? 'Smol soul. Big help.' : 'One SOULI. One light.' }}</h2>
          <p>{{ contribution.light ? 'You lit the last lantern. The path is brighter for everyone.' : 'A little light is missing. Preview how your one SOULI could help.' }}</p>
          <div class="community-lanterns" aria-hidden="true"><i v-for="n in 16" :key="n" :class="{ lit: n <= contribution.lanterns, 'your-lantern': n === 16 && contribution.light }"></i></div>
          <p class="community-progress" role="status">{{ contribution.lanterns }} / 16 lanterns · {{ contribution.light ? 'your light: +1' : '15 simulated helpers' }}</p>
          <button class="community-action" @click="tryOneSoul">{{ contribution.light ? 'Find my light ↗' : 'Try 1 SOULI · demo' }}</button>
        </template>
        <template v-else>
          <h2>{{ worldCount.toLocaleString('en-US') }} lights.<br>One home.</h2>
          <p>Simulated holders, one shared map. Every little light belongs here.</p>
          <div class="community-scales" role="group" aria-label="Simulated world size"><button v-for="size in WORLD_SCALES" :key="size" :aria-pressed="worldScale === size" @click="worldScale = size">{{ size === 100000 ? '100K' : size === 1000 ? '1K' : '100' }}</button></div>
          <button class="community-action" @click="tryOneSoul">{{ contribution.light ? 'Find my light ↗' : 'Add my one · demo' }}</button>
        </template>
        <button class="launch-entry" :class="`launch-entry-${launchPhase}`" aria-label="Preview community launch" @click="emit('launch')"><span>✦</span><strong>Launch example · {{ launchProgress }}% ↗</strong></button>
      </aside>
      <div ref="viewport" class="village-viewport" :class="{ dragging }" tabindex="0" aria-label="Pixel world. Drag or use arrow keys to explore." @pointerdown="startDrag" @pointermove="drag" @pointerup="stopDrag" @pointercancel="stopDrag" @lostpointercapture="stopDrag" @keydown="moveByKey">
        <div class="world-board" :style="{ transform: worldTransform }"><PixelWilds :mode="mode" /><div class="village-core"><PixelVillage :mode="mode" :game="game" :souls="souls" :selected="selected" :paused="!active" :selected-building="selectedBuilding" :launch-phase="launchPhase" :contribution="contribution" :light-pulse="lightPulse" :helper-soul="helperSoul" @select="choose" @building="selectedBuilding = $event" /></div><CommunityLights v-if="communityWorld" :count="worldCount" :light="contribution.light" :slot="contribution.slot" :soul="helperSoul" /></div>
        <div class="map-corner"><span>HODL THE LIGHT, TOGETHER</span><p>{{ current.line }}</p></div>
        <button class="minimap" @click="miniNavigate" aria-label="World minimap. Click to travel, or press Enter to return home."><svg viewBox="0 0 144 96" shape-rendering="crispEdges" aria-hidden="true"><rect width="144" height="96" fill="#44876a" /><path d="M0 0H144V12H0ZM0 75H144V96H0Z" fill="#306752" /><path d="M17 13H39V27H17Z M109 0H116V46H120V96H113V50H107Z" fill="#55c2d6" /><path d="M47 32H96V64H47Z" fill="#a4c468" /><path d="M66 42H77V52H66Z" fill="#f6dea0" /><path d="M123 18H134V27H123ZM84 78H91V84H84Z" fill="#b797e2" /><rect v-bind="miniRect" fill="#fff9cd16" stroke="#fff2b4" stroke-width="1.5" /></svg><span>THE COZY WORLD</span></button>
        <div class="camera-controls"><span>Drag to wander</span><button class="community-overview" :aria-pressed="communityWorld" @click="toggleCommunityWorld">{{ communityWorld ? 'Back to village' : '100K world · demo ↗' }}</button><button class="overview-button" @click="overview">World map ↗</button><div><button @click="zoomBy(-.15)" aria-label="Zoom out">−</button><button @click="centerMap" aria-label="Return to village">⌂</button><button @click="zoomBy(.15)" aria-label="Zoom in">+</button></div></div>
        <p v-if="communityWorld" class="community-world-note">One map. One beacon. One shared tide.<br>Grouped lights · scale preview, not live players.</p>
        <div v-if="active" class="battle-banner"><span class="battle-dot"></span>{{ activity }}<b>{{ remaining }}s</b></div>
      </div>
      <div class="game-toast" role="status">{{ notice || message }}</div>
      <footer class="game-dock">
        <section v-if="selectedBuilding" class="selection-panel building-panel"><div class="building-icon">{{ buildingInfo.symbol }}</div><div class="building-copy"><small>{{ buildingInfo.value }}</small><h2>{{ buildingInfo.title }}</h2><p>{{ buildingInfo.text }}</p></div><button class="panel-close" aria-label="Back to selected soul" @click="selectedBuilding = ''">✕</button></section>
        <section v-else class="selection-panel"><button class="selected-portrait" @click="emit('library')" aria-label="Change selected SOULI SVG"><img :src="svgUrl(selectedSoul.svg)" :alt="`${selectedSoul.label}, original SOULI SVG`" /></button><div class="selection-details"><small>{{ source }}</small><h2>{{ selectedSoul.label }}</h2><button class="squad-toggle" @click="squadOpen = !squadOpen" :aria-expanded="squadOpen" aria-controls="squad-options">{{ ROLES[game.roles[selected]].mark }} {{ ROLES[game.roles[selected]].name }} <span>· Auto squad ⌄</span></button></div><div v-if="squadOpen" id="squad-options" class="squad-popover"><strong>Little legends, big teamwork.</strong><p>{{ active ? 'Pause to change roles.' : 'Your balanced squad is ready. Changing roles is optional.' }}</p><div class="role-controls"><button v-for="(role, key) in ROLES" :key="key" :disabled="active" :class="{ active: game.roles[selected] === key }" :aria-pressed="game.roles[selected] === key" @click="emit('role', key)"><span :style="{ color: role.color }">{{ role.mark }}</span>{{ role.name }}</button></div><button class="text-button" @click="squadOpen = false">Got it</button></div></section>
        <div class="dock-menu"><button @click="emit('library')"><span>♧</span>Souls</button><button @click="journalOpen = true"><span>▤</span>Journal<span v-if="nights.length" class="menu-count">{{ nights.length }}</span></button></div>
        <div class="idle-actions"><button class="claim-button" :disabled="!bank" @click="emit('claim')"><span>✧ {{ bank.toLocaleString() }}</span><strong>Claim</strong></button><div class="expedition-controls"><button class="launch-button" :class="{ chilling: active }" @click="emit('chill')" :aria-label="active ? 'Pause chilling' : 'Start chilling'"><span>{{ active ? 'Chilling…' : 'Start chilling' }}</span><strong>{{ active ? 'Ⅱ' : '▶' }}</strong></button><div class="idle-hint">{{ active ? 'Auto explore · rest · defend' : 'One click. The squad does the rest.' }}</div><progress :value="progress" max="100" aria-label="Current adventure progress"></progress></div></div>
      </footer>
    </div>
    <div v-if="journalOpen" class="modal-backdrop" @click.self="journalOpen = false" @keydown="trapJournal"><section class="journal-dialog" role="dialog" aria-modal="true" aria-labelledby="journal-title"><header class="dialog-heading"><div><small>PROOF OF GOOD VIBES</small><h2 id="journal-title">The little things we did</h2></div><button class="hud-square journal-close" aria-label="Close journal" @click="journalOpen = false">✕</button></header><p v-if="!nights.length" class="journal-empty">A little exploring. A little bonking.<br>Your adventures will appear here.</p><ol class="journal-list"><li v-for="(entry,index) in nights" :key="index"><span>{{ entry.mode === 'down' ? '☾' : '✧' }}</span><div><strong>{{ entry.message }}</strong><p>{{ entry.help }}</p><small>Day {{ entry.night }} · +{{ entry.earned || 0 }} memories</small></div></li></ol><p class="journal-footnote">Local demo with real on-chain SVGs, simulated tides and practice companions. Your squad keeps going for up to 2 hours away while chilling. Memories are game points, not tokens. Progress stays in this browser.</p></section></div>
  </div>
</template>
