<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import PixelSoulWorld from './PixelSoulWorld.vue'
import IdleVillageView from './IdleVillageView.vue'
import { WORLD, BIOMES, biomeAt, soulRoutine, clampCamera } from './world.mjs'
import { createContributionPreview, addPreviewLight } from './community.mjs'
import { ROLES } from './engine.mjs'
import { svgUrl } from './souli'
const props = defineProps({ mode: String, modes: Object, game: Object, souls: Array, selected: Number, night: Number, memories: Number, bank: Number, nights: Array, active: Boolean, remaining: Number, progress: Number, score: Number, message: String, source: String, libraryOpen: Boolean, launchPhase: String, launchProgress: Number, launchLabel: String })
const emit = defineEmits(['mode', 'role', 'select', 'chill', 'claim', 'library', 'purchase', 'launch'])
const legacyEvents = Object.fromEntries(['mode', 'role', 'select', 'chill', 'claim', 'library', 'purchase', 'launch'].map(name => [name, (...args) => emit(name, ...args)]))
const classic = ref(false), viewport = ref(null), size = ref({width: 1000,height:800})
const camera = ref({x:600,y:658,zoom:.56}), dragging = ref(false), following = ref(false), far = ref(false)
const explore = ref(false), exploreButton = ref(null)
const journal = ref(false), rolesOpen = ref(false), contribution = ref(createContributionPreview()), helper = ref(null)
const toast = ref(''), pulse = ref(0), fullscreen = ref(false)
const here = computed(() => biomeAt(camera.value.y))
const selectedSoul = computed(() => props.souls[props.selected])
const residents = computed(() => props.souls.map((soul,i) => ({...soul,...soulRoutine(i,props.mode,props.game.elapsed),index:i})))
const boardStyle = computed(() => ({transform:`translate(${-camera.value.x*2*camera.value.zoom}px,${-camera.value.y*2*camera.value.zoom}px) scale(${camera.value.zoom})`}))
const climate = computed(() => props.mode === 'up' ? {title:'An upward kind of day',copy:'Warm updrafts. Sky expeditions. Little discoveries.',icon:'↗'} : props.mode === 'down' ? {title:'The shadows are stirring',copy:'The abyss wakes. The souls hold the light together.',icon:'↘'} : {title:'The world is taking a breath',copy:'A little mining. A little gardening. Elite-level chilling.',icon:'~'})
let observer, start = null, previousFocus, firstSize = true
function clamp() { camera.value = clampCamera(camera.value,size.value) }
function nearZoom() { return size.value.width < 650 ? .4 : .56 }
function travel(id, manual=true) {
  const biome = BIOMES.find(item => item.id === id)
  if (!biome) return
  if (manual) following.value = false
  far.value = false; camera.value = {x:600,y:biome.y-(id==='home'?50:0),zoom:nearZoom()}; clamp()
}
function wholeWorld() {
  following.value = false; far.value = true
  camera.value = {x:600,y:1200,zoom:Math.max(.08,Math.min((size.value.width-60)/2400,(size.value.height-65)/4800))}; clamp()
}
function followTide() {
  following.value = !following.value
  if (following.value) travel(props.mode === 'up' ? 'sky' : props.mode === 'down' ? 'abyss' : 'home',false)
}
function zoomBy(amount) { camera.value.zoom = Math.max(.08,Math.min(1.5,camera.value.zoom+amount)); far.value = camera.value.zoom < .3; following.value = false; clamp() }
function dragStart(event) {
  if(event.button !== 0 || event.target.closest('button, a, input, select, summary, aside, nav')) return
  start = {x:event.clientX,y:event.clientY,camera:{...camera.value}}
  dragging.value = true; following.value = false; viewport.value.setPointerCapture(event.pointerId)
}
function drag(event) {
  if(!start) return
  camera.value = {...start.camera,x:start.camera.x-(event.clientX-start.x)/(camera.value.zoom*2),y:start.camera.y-(event.clientY-start.y)/(camera.value.zoom*2)}; clamp()
}
function stopDrag() { start = null; dragging.value = false }
function wheel(event) {
  following.value = false
  if(event.ctrlKey || event.metaKey) zoomBy(event.deltaY>0 ? -.035 : .035)
  else { camera.value.y += event.deltaY/(camera.value.zoom*2); camera.value.x += event.deltaX/(camera.value.zoom*2); clamp() }
}
function keyMove(event) {
  if(event.target !== viewport.value) return
  const delta = {ArrowUp:[0,-70],ArrowDown:[0,70],ArrowLeft:[-70,0],ArrowRight:[70,0]}[event.key]
  if(delta) { event.preventDefault(); following.value=false; camera.value.x+=delta[0];camera.value.y+=delta[1];clamp() }
}
function findSoul(index=props.selected) {
  const soul = residents.value[index]; following.value=false;far.value=false;emit('select',index)
  camera.value={x:soul.x,y:soul.y-85,zoom:nearZoom()};clamp()
}
function revealSoul(index) {
  const person=residents.value[index]
  if(Math.abs(person.x-camera.value.x)>size.value.width/(camera.value.zoom*4)-35 || Math.abs(person.y-camera.value.y)>size.value.height/(camera.value.zoom*4)-60) findSoul(index)
}
function addLight() {
  if(!contribution.value.light) { contribution.value=addPreviewLight(contribution.value,props.selected);helper.value={...selectedSoul.value} }
  travel('home');pulse.value++;toast.value='Your +1 lit the last lantern. Smol soul. Big help. · Local demo'
}
function returnToWorld() { classic.value=false; nextTick(attachViewport) }
function attachViewport() {
  observer?.disconnect(); if(!viewport.value) return
  observer=new ResizeObserver(entries=>{
    const rect=entries[0].contentRect, wasDefaultZoom=Math.abs(camera.value.zoom-nearZoom())<.001
    size.value={width:rect.width,height:rect.height}
    if(firstSize){firstSize=false;const entry=new URLSearchParams(window.location.search).get('region');travel(BIOMES.some(item=>item.id===entry)?entry:'home',false)}
    else if(far.value)wholeWorld()
    else { if(wasDefaultZoom)camera.value.zoom=nearZoom();clamp() }
  })
  observer.observe(viewport.value)
}
async function toggleFullscreen() { try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen()}catch{toast.value='Expand the browser panel for a bigger world.'} }
function syncFullscreen(){fullscreen.value=Boolean(document.fullscreenElement)}
function journalKeys(event) {
  if(event.key==='Escape')journal.value=false
  if(event.key==='Tab'){event.preventDefault();document.querySelector('.world-journal-close')?.focus()}
}
watch(journal,async open=>{if(open){previousFocus=document.activeElement;await nextTick();document.querySelector('.world-journal-close')?.focus()}else{await nextTick();previousFocus?.focus()}})
watch(()=>props.mode,()=>{if(following.value)travel(props.mode==='up'?'sky':props.mode==='down'?'abyss':'home',false)})
watch(()=>props.active,active=>{if(active){rolesOpen.value=false;if(following.value)travel(props.mode==='up'?'sky':props.mode==='down'?'abyss':'home',false)}})
onMounted(()=>{attachViewport();document.addEventListener('fullscreenchange',syncFullscreen)})
onUnmounted(()=>{observer?.disconnect();document.removeEventListener('fullscreenchange',syncFullscreen)})
</script>

<template>
  <template v-if="classic">
    <IdleVillageView v-bind="props" v-on="legacyEvents" />
    <button class="return-side-world" :inert="libraryOpen || null" @click="returnToWorld">↟ Return to the living world</button>
  </template>
  <div v-else class="soul-world" :class="[`soul-weather-${mode}`, {'is-dragging':dragging,'is-overview':far}]" :style="{'--biome-accent':here.color}">
    <div class="soul-world-surface" :inert="libraryOpen || journal || null">
      <header class="world-hud">
        <a class="world-brand" href="./" aria-label="SOULI home"><svg viewBox="0 0 16 20" shape-rendering="crispEdges" aria-hidden="true"><path d="M6 0h4v2h2v2h2v12h-2v2H4v-2H2V4h2V2h2Z" fill="#dcb9ee"/><path d="M5 6h2v3H5Zm4 0h2v3H9Z" fill="#304839"/><path d="M5 12h6v2H5Z" fill="#fcf3d8"/></svg><div><h1>SOULI</h1><p>A LITTLE WORLD TO HODL</p></div></a>
        <nav class="world-main-nav" aria-label="Main navigation"><button class="is-current" aria-current="page" @click="explore=false;travel('home')">World</button><button @click="emit('library')">My Souls</button><button class="world-launch-entry" @click="emit('launch')">Launch <i aria-hidden="true"></i></button></nav>
        <span class="world-preview-tag">LOCAL PREVIEW</span>
        <button class="world-shop" @click="emit('purchase')" aria-label="Preview SOULI purchase">Get SOULI <span>↗</span></button>
      </header>
      <main ref="viewport" class="soul-world-viewport" tabindex="0" aria-label="Explore the layered SOULI world. Drag, scroll, or use arrow keys to travel." @pointerdown="dragStart" @pointermove="drag" @pointerup="stopDrag" @pointercancel="stopDrag" @lostpointercapture="stopDrag" @wheel.prevent="wheel" @keydown="keyMove">
        <div class="soul-world-board" :style="boardStyle">
          <PixelSoulWorld :mode="mode" :active="active" :light="contribution.light" :overview="far" :souls="souls" :launch-phase="launchPhase" :game="game" />
          <button v-for="person in residents" :key="person.index" class="world-soul" :class="{'is-selected':selected===person.index,'is-resting':person.resting}" :style="{left:`${person.x*2}px`,top:`${person.y*2}px`}" :aria-label="`Select ${person.label}, ${person.biome.activity}`" :aria-pressed="selected===person.index" @click="emit('select',person.index)" @focus="revealSoul(person.index)">
            <span v-if="selected===person.index" class="world-speech">{{ active ? person.line : 'ready when you are, fren' }}</span>
            <img :src="person.url" :alt="person.label" draggable="false"/>
            <span class="world-soul-name">{{ person.label }} <b v-if="contribution.light && contribution.slot===person.index">+1 ✧</b></span>
          </button>
          <div v-if="contribution.light" :key="pulse" class="world-personal-lantern" :class="{'far-personal-lantern':far}" style="left:1416px;top:1470px"><img :src="helper.url" alt="Your demo light's SOULI SVG"/><span>YOUR LIGHT +1 <small>DEMO</small></span></div>
        </div>
        <div class="world-vignette" aria-hidden="true"></div>
        <section class="world-location" aria-live="polite"><p>DAY {{ night }} <span>·</span> {{ far ? 'THE WHOLE WORLD' : here.short.toUpperCase() }}</p><h2>{{ far ? 'Little lights. One home.' : here.name }}</h2><div>{{ far ? '100K scale concept · simulated lights' : here.line }}</div></section>
        <button ref="exploreButton" class="world-explore-toggle" :aria-expanded="explore" aria-controls="world-explore-panel" @click="explore=!explore">{{ explore ? 'Close ×' : 'Explore ⊞' }}</button>
        <aside v-if="explore" id="world-explore-panel" class="world-explore-panel" aria-label="World controls" @keydown.esc.stop="explore=false;exploreButton?.focus()" @wheel.stop>
          <p class="pixel-eyebrow">YOUR LITTLE EXPEDITION</p><h3>Take the scenic route.</h3>
          <nav class="world-depth-nav" aria-label="Travel between world layers"><button v-for="biome in BIOMES" :key="biome.id" :class="{current:here.id===biome.id&&!far}" :aria-current="here.id===biome.id&&!far?'location':null" :aria-label="`Travel to ${biome.short}`" @click="travel(biome.id);explore=false"><b>{{ biome.mark }}</b><span>{{ biome.short }}</span></button></nav>
          <div class="world-climate"><strong>{{ climate.icon }} {{ climate.title }}</strong><p>{{ climate.copy }}</p><div class="world-tide-buttons" role="group" aria-label="Preview market weather"><button v-for="(item,key) in modes" :key="key" :disabled="active" :aria-pressed="mode===key" @click="emit('mode',key)">{{ item.word }}</button></div><small>{{ active ? 'Pause to try a different weather.' : 'Simulated weather · no live price feed.' }}</small></div>
          <button class="world-option" :aria-pressed="following" @click="followTide">Follow weather <span>{{ following ? 'ON' : 'OFF' }}</span></button>
          <button class="world-option" @click="wholeWorld();explore=false">View all layers <span>100K concept</span></button>
          <button class="world-option" @click="explore=false;journal=true">Adventure journal <span>↗</span></button>
          <button class="world-option" @click="explore=false;classic=true">Original village <span>↗</span></button>
          <button class="world-option" @click="toggleFullscreen">{{ fullscreen ? 'Exit fullscreen' : 'Fullscreen' }} <span>⛶</span></button>
          <p class="world-explore-note">Real SOULI artwork. Local game progress. Multiplayer and market data are not connected.</p>
        </aside>
        <aside class="world-contribution"><span class="world-lantern-icon" aria-hidden="true">✦</span><div><strong>{{ contribution.light ? 'A little brighter. Thanks, fren.' : 'One little soul can help.' }}</strong><p>{{ contribution.light ? '16 / 16 lanterns lit · local demo' : '15 / 16 lanterns lit · local demo' }}</p></div><button @click="addLight">{{ contribution.light ? 'Find +1' : 'Add +1' }}</button></aside>
        <div class="world-camera"><button @click="zoomBy(-.12)" aria-label="Zoom out">−</button><button @click="findSoul()" aria-label="Find selected soul">◎</button><button @click="zoomBy(.12)" aria-label="Zoom in">+</button></div>
        <div class="world-map-hint">DRAG TO WANDER · SCROLL TO GO DEEPER</div>
      </main>
      <footer class="world-dock">
        <button class="world-portrait" @click="findSoul()" aria-label="Find selected SOULI SVG"><img :src="svgUrl(selectedSoul.svg)" :alt="`${selectedSoul.label}, original SOULI SVG`"/></button>
        <div class="world-selected"><small>{{ source }}</small><h3>{{ selectedSoul.label }}</h3><button @click="rolesOpen=!rolesOpen" :aria-expanded="rolesOpen" aria-controls="world-role-menu">{{ ROLES[game.roles[selected]].mark }} {{ ROLES[game.roles[selected]].name }} ⌄</button><div v-if="rolesOpen" id="world-role-menu" class="world-role-menu" @keydown.esc.stop="rolesOpen=false"><strong>Give your soul a purpose</strong><button v-for="(role,key) in ROLES" :key="key" :disabled="active" :aria-pressed="game.roles[selected]===key" @click="emit('role',key);rolesOpen=false">{{ role.mark }} {{ role.name }}</button><small>{{ active ? 'Pause to change roles.' : 'Your soul does the rest.' }}</small></div></div>
        <div class="world-memory"><small>MEMORIES</small><strong>✧ {{ memories.toLocaleString('en-US') }}</strong><span>Just game points.</span></div>
        <div class="world-play-controls"><button class="world-claim" :disabled="!bank" @click="emit('claim')"><strong>+{{ bank.toLocaleString('en-US') }}</strong><span>Collect</span></button><div class="world-idle"><button :class="{'is-chilling':active}" :aria-label="active?'Pause chilling':'Start chilling'" @click="emit('chill')"><span>{{ active ? 'Chilling…' : 'Start chilling' }}</span><b>{{ active ? 'Ⅱ' : '▶' }}</b></button><progress :value="progress" max="100" aria-label="Current adventure progress"></progress><small>{{ active ? `${remaining}s · exploring, gathering, defending` : 'Log off. Your little soul carries on.' }}</small></div></div>
      </footer>
      <div v-if="toast" class="world-toast" role="status"><span>{{ toast }}</span><button @click="toast=''" aria-label="Dismiss world message">✕</button></div>
    </div>
    <div v-if="journal" class="modal-backdrop" @click.self="journal=false" @keydown="journalKeys"><section class="journal-dialog" role="dialog" aria-modal="true" aria-labelledby="world-journal-title"><header class="dialog-heading"><div><small>PROOF OF A LITTLE LIFE</small><h2 id="world-journal-title">While the world was turning</h2></div><button class="hud-square world-journal-close" aria-label="Close journal" @click="journal=false">✕</button></header><p class="world-journal-message">{{ message }}</p><ol class="journal-list"><li v-for="(entry,i) in nights" :key="i"><span>{{ entry.mode==='down'?'☾':'✧' }}</span><div><strong>{{ entry.message }}</strong><p>{{ entry.help }}</p><small>Day {{ entry.night }} · +{{ entry.earned||0 }} memories</small></div></li></ol><p class="journal-footnote">Local prototype. Residents follow scripted routines, with no AI service connected. Tides and other residents are simulated. Memories are game points, not tokens. Idle progress is saved in this browser with up to two hours of catch-up. The 100K view illustrates scale; it is not a multiplayer server.</p></section></div>
  </div>
</template>
