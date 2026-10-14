<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted, defineAsyncComponent } from 'vue'
import SanctuaryScene from './SanctuaryScene.vue'
import { tinySoul } from './soul-art'
import BetaHome from './BetaHome.vue'
import { betaApi } from './beta-api.mjs'
import WalletAccess from './WalletAccess.vue'
import BuySouli from './BuySouli.vue'
const LaunchPreview = import.meta.env.DEV ? defineAsyncComponent(() => import('./LaunchPreview.vue')) : null
import { publicSouls, readAddress, svgUrl, shortAddress, TOKEN, sampleInfo } from './souli'
import { createWalletSession } from './wallet-session.mjs'
import { createWalletConnector } from './wallet-connect.mjs'
import WalletRelayStatus from './WalletRelayStatus.vue'
import { createLaunchPreview, fundLaunchPreview, confirmLaunchPreview, expireLaunchPreview, refundLaunchPreview } from './launch.mjs'
import { WEATHER, freshMarket, defenseView } from './market-world.mjs'
import { LOCAL_WEATHER_KEY, restoreLocalWeather, advanceLocalWeather } from './local-weather.mjs'
import { enableAutomation, advanceAutomatic } from './sanctuary.mjs'
import { CLOUD_POLL_MS, projectCloudHome, projectDefense } from './cloud-checkpoint.mjs'
import { SANCTUARY_KEY, HOME_PROJECTS, nextHomeProject, createSanctuary, restoreSanctuary, soulKind } from './sanctuary.mjs'

const samples = publicSouls()
const coinIcon = import.meta.env.BASE_URL + 'images/fungi/token-logo.png'
const dot = tinySoul()
const motion = ref(true)
const cloud = ref(null), serverBusy = ref(false), syncError = ref(''), clockNow = ref(Date.now())
let cloudEpoch = 0, syncedAt = 0, receivedAt = 0
const selected = ref(samples[0]), zone = ref('grove'), panel = ref(''), details = ref(null), world = ref(null)
const market = ref(null), signal = ref(null), localWeather = ref(null), marketBusy = ref(false)
const development = import.meta.env.DEV, weatherPreview = ref('')
const previewDefense = computed(() => ['fog','aurora'].includes(weatherPreview.value))
let marketAt = 0, savedAt = 0, disposed = false
const liveMarket = computed(() => market.value?.status === 'live' && freshMarket(market.value, clockNow.value))
const cloudElapsed = ref(0)
const defense = computed(() => cloud.value ? projectDefense(cloud.value.defense,cloud.value.serverTime+cloudElapsed.value) : defenseView(localWeather.value?.event, clockNow.value, 'local'))
const defending = computed(() => defense.value && ['prepare','guard'].includes(defense.value.phase))
const weatherKind = computed(() => weatherPreview.value || (defending.value ? defense.value.kind : liveMarket.value ? market.value.kind : 'calm'))
const weather = computed(() => WEATHER[weatherKind.value].scene)
const weatherLabel = computed(() => !defending.value && !previewDefense.value && weatherKind.value==='fog' ? 'Quiet mist' : !defending.value && !previewDefense.value && weatherKind.value==='aurora' ? 'A glowing sky' : WEATHER[weatherKind.value].label)
const activity = computed(() => defending.value ? WEATHER[weatherKind.value].activity : weatherKind.value==='rain' ? 'Lighting the path' : 'Gathering light')
const marketLabel = computed(() => weatherPreview.value ? 'Weather demo' : liveMarket.value ? `ETH ${market.value.change24h>=0?'+':''}${market.value.change24h.toFixed(1)}% · 24h` : 'ETH feed offline')
const state = ref(createSanctuary()), toast = ref(''), storageError = ref(''), launchExample = ref(createLaunchPreview())
const address = ref(''), loaded = ref([]), loadedAddress = ref(''), total = ref(0), busy = ref(false), error = ref('')
const walletState = ref(null)
const relayState = ref({ busy: false, link: '' })
const walletDiscovery = createWalletConnector(window, { onChange: state => { relayState.value = state }, onDisconnect: () => walletSession.disconnect() })
const walletSession = createWalletSession(walletDiscovery.resolve, s => { walletState.value = s })
async function disconnectWallet() { await walletSession.disconnect(walletDiscovery.disconnect) }
walletState.value = walletSession.state
const wallet = computed(() => walletState.value.address)
const scenes = computed(() => [selected.value, ...samples.filter(s=>s.svg!==selected.value.svg)])
const kind = computed(() => soulKind(selected.value))
const isPractice = computed(() => selected.value.source === 'public')
const project = computed(() => nextHomeProject(state.value))
const projectsBuilt = computed(() => HOME_PROJECTS.filter(p=>state.value[p.id]).length)
let requestId = 0, timer, toastTimer, previousFocus
const showToast = message => { toast.value = message; clearTimeout(toastTimer); toastTimer = setTimeout(()=>{toast.value=''},7000) }
function save() { if(cloud.value)return;try { localStorage.setItem(SANCTUARY_KEY, JSON.stringify(state.value));localStorage.setItem(LOCAL_WEATHER_KEY,JSON.stringify(localWeather.value)) } catch { storageError.value = 'Browser storage is unavailable. This visit cannot be saved.' } }
function acceptCloud(data) {
  cloud.value=data;receivedAt=performance.now();cloudElapsed.value=0;state.value=projectCloudHome(data,0);syncedAt=Date.now();syncError.value=''
  if(data.market){market.value=data.market;signal.value=data.event;marketAt=Date.now()}
}
async function attachCloud(data) {
  save();cloudEpoch++;acceptCloud(data);panel.value=''
  showToast('Welcome to your saved home. Your local practice world is kept separately.')
  const epoch=cloudEpoch
  try{const result=await readAddress(data.address);if(epoch===cloudEpoch&&cloud.value&&result.souls[0])selected.value=result.souls[0]}catch{if(epoch===cloudEpoch)showToast('Home connected. Original artwork could not refresh; the practice companion is still shown.')}
}
function detachCloud() { cloudEpoch++;cloud.value=null;try{state.value=restoreSanctuary(localStorage.getItem(SANCTUARY_KEY))||createSanctuary()}catch{state.value=createSanctuary()}enableAutomation(state.value);advanceAutomatic(state.value);selected.value=samples[0] }
async function remote(path,body={}) {
  if(serverBusy.value||!cloud.value)return false
  const epoch=cloudEpoch;serverBusy.value=true;syncedAt=Date.now()
  try { const data=await betaApi(path,path==='/world'?undefined:body);if(epoch!==cloudEpoch)return false;acceptCloud(data);return true }
  catch(e){if(epoch===cloudEpoch){syncError.value='Reconnecting… Your saved home is safe.';if(e.status===401||e.status===403){detachCloud();syncError.value='';showToast(e.message)}}return false}
  finally{serverBusy.value=false}
}
async function refreshMarket() {
  if(marketBusy.value||disposed)return
  marketBusy.value=true;marketAt=Date.now()
  try{const data=await betaApi('/market');if(disposed)return;market.value=data.market;signal.value=data.event}
  catch{if(!disposed)market.value={...market.value,status:'unavailable'}}
  finally{marketBusy.value=false}
}
function tick() {
  clockNow.value=Date.now()
  if(cloud.value){
    cloudElapsed.value=Math.max(0,performance.now()-receivedAt)
    state.value=projectCloudHome(cloud.value,cloudElapsed.value)
    if(clockNow.value-syncedAt>CLOUD_POLL_MS)remote('/world')
    return
  }
  if(clockNow.value-marketAt>CLOUD_POLL_MS)refreshMarket()
  const before=projectsBuilt.value
  advanceAutomatic(state.value)
  localWeather.value=advanceLocalWeather(localWeather.value,signal.value,state.value,clockNow.value)
  if(projectsBuilt.value>before)showToast(state.value.journal.find(e=>e.kind==='build')?.text||'A new light is on.')
  if(clockNow.value-savedAt>10000){save();savedAt=clockNow.value}
}
function travel(place) { zone.value = place }
function choose(soul) { selected.value={...soul}; panel.value=''; showToast(`${soul.label} is exploring your ${cloud.value?'saved home':'local preview'}.`) }
async function lookup() {
  const id=++requestId, requested=address.value.trim()
  busy.value=true;error.value='';loaded.value=[];loadedAddress.value=''
  try { const result=await readAddress(requested); if(id!==requestId)return;loaded.value=result.souls;total.value=result.total;loadedAddress.value=requested;if(!result.souls.length)error.value='No SOULI inscriptions found at this Base address.' }
  catch(cause){if(id===requestId)error.value=cause.message.startsWith('Enter')?cause.message:'Base could not be reached. Try this address again.'}
  finally{if(id===requestId)busy.value=false}
}
async function connect() { const account=await walletSession.connect();if(account){address.value=account;panel.value='souls';await lookup()}else panel.value='souls' }
async function purchaseCompleted(receipt) {
  await walletSession.refresh()
  if(wallet.value?.toLowerCase()!==receipt.account.toLowerCase())return
  try{const result=await readAddress(receipt.account);if(wallet.value?.toLowerCase()===receipt.account.toLowerCase()&&result.souls[0]){selected.value=result.souls[0];loaded.value=result.souls;loadedAddress.value=receipt.account;total.value=result.total}}
  catch{showToast('Purchase confirmed. Your original artwork will refresh when Base is reachable.')}
}
watch(wallet,value=>{requestId++;busy.value=false;loaded.value=[];loadedAddress.value='';address.value=value})
watch([wallet,()=>walletState.value.chainId],()=>{if(cloud.value){detachCloud();betaApi('/auth/logout',{}).catch(()=>{});showToast('Wallet changed. Sign in again to reopen your saved home.')}})
watch(panel,async(value,old)=>{if(value&&!old)previousFocus=document.activeElement;await nextTick();if(value&&!['purchase','launch'].includes(value))details.value?.querySelector('button')?.focus();if(!value)previousFocus?.focus()})
function keys(event) {
  if(event.key==='Escape'){panel.value='';return}
  if(event.key!=='Tab')return
  const nodes=[...details.value.querySelectorAll('button:not(:disabled), input, a[href], summary')].filter(n=>n.getClientRects().length)
  if(event.shiftKey&&document.activeElement===nodes[0]){event.preventDefault();nodes.at(-1)?.focus()}
  else if(!event.shiftKey&&document.activeElement===nodes.at(-1)){event.preventDefault();nodes[0]?.focus()}
}
function leave(){if(!cloud.value){advanceAutomatic(state.value);localWeather.value=advanceLocalWeather(localWeather.value,signal.value,state.value,Date.now())}save()}
function visibility(){if(document.hidden)leave();else { tick(); walletSession.synchronize() }}
async function restoreHome(){
  await walletSession.restore()
  if(!wallet.value||walletState.value.chainId?.toLowerCase()!=='0x2105'||disposed)return
  const account=wallet.value,epoch=cloudEpoch
  try{
    const session=await betaApi('/auth/session')
    if(session.address.toLowerCase()!==account.toLowerCase())return
    const home=await betaApi('/world/auto',{})
    if(!disposed&&epoch===cloudEpoch&&wallet.value===account&&walletState.value.chainId?.toLowerCase()==='0x2105')await attachCloud(home)
  }catch{/* Expired sessions return to the free world without opening a wallet. */}
}
onMounted(()=>{
  try{const stored=restoreSanctuary(localStorage.getItem(SANCTUARY_KEY));if(stored){state.value=stored;const days=advanceAutomatic(state.value);if(days)showToast('Welcome back. Your SOULI kept busy.')}}catch{storageError.value='Browser storage is unavailable. This visit cannot be saved.'}
  if(!state.value.automation)enableAutomation(state.value)
  advanceAutomatic(state.value)
  try{localWeather.value=restoreLocalWeather(localStorage.getItem(LOCAL_WEATHER_KEY),Date.now())}catch{}
  refreshMarket();save()
  const entry=new URLSearchParams(window.location.search), place=entry.get('region')
  if(['grove','gallery','village'].includes(place))zone.value=place
  else if(place)zone.value='village'
  if(/^[0-5]$/.test(entry.get('soul')||''))selected.value=samples[Number(entry.get('soul'))]
  if(entry.get('soul')==='dot')selected.value=dot
  if(['souls','home','purchase','launch','preserve','about'].includes(entry.get('panel')))panel.value=entry.get('panel')==='launch'&&!development?'purchase':entry.get('panel')
  restoreHome()
  timer=setInterval(()=>{if(!document.hidden)tick()},250)
  window.addEventListener('pagehide',leave);document.addEventListener('visibilitychange',visibility)
})
onUnmounted(()=>{disposed=true;leave();cloudEpoch++;requestId++;clearInterval(timer);clearTimeout(toastTimer);walletSession.destroy();walletDiscovery.destroy();window.removeEventListener('pagehide',leave);document.removeEventListener('visibilitychange',visibility)})
</script>

<template>
  <div class="game-app sanctuary-app" :class="{'san-motion-off':!motion}">
    <div v-if="relayState.busy" style="position:fixed;left:16px;right:16px;top:12px;max-width:480px;margin:auto;z-index:10000"><WalletRelayStatus :state="relayState"/></div>
    <div class="san-shell" :inert="panel ? true : null">
      <header class="san-header">
        <a href="./" class="san-brand" aria-label="SOULI home"><img :src="coinIcon" alt="" class="san-coin-logo"/><span>SOULI</span></a>
        <div class="san-header-actions"><button class="san-wallet-button" @click="wallet ? panel='home' : connect()">{{ wallet ? 'My home' : 'Connect MetaMask' }}</button><button class="san-menu-button" aria-label="Open menu" @click="panel='menu'">☰</button></div>
      </header>
      <main class="san-simple-main">
        <section ref="world" class="san-world" aria-label="SOULI sanctuary">
          <SanctuaryScene :souls="scenes" :zone="zone" :weather="weather" :motion="motion" :active="state.active" :defending="previewDefense || !!defending" :town-lights="defense?.wins||0" :light="previewDefense ? 5 : defense?.light||0" :light-target="defense?.target||8" :lantern="state.lantern" :bench="state.bench" :gallery-restored="state.gallery" :garden="!!cloud && cloud.project.supplies>=cloud.project.targetSupplies && cloud.project.glowstones>=cloud.project.targetGlowstones"/>
          <div class="san-simple-top"><button class="san-market-chip" @click="panel='weather'"><span>{{ WEATHER[weatherKind].icon }}</span><span>{{ weatherLabel }}<small>{{ marketLabel }}</small></span></button><button class="san-mode-chip" @click="panel='home'">{{ weatherPreview?'Weather demo':cloud?'Shared town':'Solo' }} ↗</button></div>
          <div v-if="defending || previewDefense" class="san-guard-meter"><span>✦ {{ previewDefense?'Weather demo':defense.phase==='prepare'?'Getting ready':'Keep the town bright' }}</span><progress :value="previewDefense?5:Math.min(defense.light,defense.target)" :max="previewDefense?8:defense.target" aria-label="Town light"/></div>
          <div class="san-world-controls"><button class="san-companion-chip" :class="{'is-compact':selected.compact}" @click="panel='souls'"><img :src="selected.url" alt=""/><span>{{ selected.compact?'Little dot':selected.label }}<small>{{ isPractice?'Sample inscription':kind }}</small></span><span>↗</span></button><button class="san-motion-toggle" :aria-label="motion?'Pause motion':'Resume motion'" :aria-pressed="!motion" @click="motion=!motion">{{ motion?'Ⅱ':'▷' }}</button></div>
        </section>
      </main>
      <nav class="san-simple-zones" aria-label="Places"><button :aria-pressed="zone==='grove'" @click="travel('grove')">♧ Grove</button><button :aria-pressed="zone==='gallery'" @click="travel('gallery')">◇ Gallery</button><button :aria-pressed="zone==='village'" @click="travel('village')">⌂ Town</button></nav>
      <footer class="san-simple-dock"><div class="san-auto-status"><span class="san-live-dot"></span><div><strong>{{ activity }}</strong><small>All on its own.</small></div></div><button class="san-story-button" @click="panel='journal'">{{ project ? ({lantern:'A lantern is on the way',bench:'Making a place to rest',gallery:'Brightening the gallery'})[project.id] : defense?.result==='lit' ? 'One more light for our town' : 'Your little town is growing' }} <span>↗</span></button></footer>
      <p v-if="storageError" class="san-storage-error" role="alert">{{ storageError }}</p>
      <p v-if="syncError" class="san-storage-error" role="status">{{ syncError }}</p>
      <div v-if="toast" class="san-toast" role="status"><span>✦</span>{{ toast }}<button aria-label="Dismiss update" @click="toast=''">×</button></div>
    </div>

    <BuySouli v-if="panel==='purchase'" :soul="selected" :wallet-state="walletState" :get-provider="walletSession.getProvider" @purchased="purchaseCompleted" @close="panel=''" @launch="panel='launch'" @connect="walletSession.connect()" @disconnect="disconnectWallet" @switch-base="walletSession.switchBase()"/>
    <LaunchPreview v-else-if="development && panel==='launch'" :state="launchExample" :souls="scenes" @close="panel=''" @fund="launchExample=fundLaunchPreview(launchExample,$event)" @confirm="launchExample=confirmLaunchPreview(launchExample)" @expire="launchExample=expireLaunchPreview(launchExample)" @refund="launchExample=refundLaunchPreview(launchExample)" @reset="launchExample=createLaunchPreview()" @target="launchExample=createLaunchPreview($event)"/>
    <div v-else-if="panel" class="modal-backdrop san-modal-backdrop" @click.self="panel=''" @keydown="keys">
      <section ref="details" class="san-dialog" role="dialog" aria-modal="true" aria-labelledby="san-dialog-title">
        <header><div><small>SOULI / {{ panel==='souls'?'YOUR COLLECTION':panel==='preserve'?'GROW & KEEP':panel==='journal'?'LITTLE MEMORIES':panel==='home'?'HOME & NEIGHBORS':panel==='about'?'NATIVE INSCRIPTIONS':'YOUR WORLD' }}</small><h2 id="san-dialog-title">{{ panel==='souls'?'Choose a soul':panel==='preserve'?'Keep a favorite':panel==='journal'?'Your story':panel==='home'?'Neighbors':panel==='weather'?'ETH & the sky':panel==='menu'?'Your world':'Meet your inscription.' }}</h2></div><button class="san-dialog-close" aria-label="Close dialog" @click="panel=''">×</button></header>
        <div v-if="panel==='menu'" class="san-menu-grid"><button @click="panel='souls'">My souls ↗</button><button @click="panel='home'">Neighbors ↗</button><button @click="panel='journal'">Story ↗</button><button @click="panel='preserve'">Keep a form ↗</button><button @click="panel='purchase'">Get SOULI ↗</button><button @click="panel='about'">What is SOULI? ↗</button></div>
        <template v-else-if="panel==='weather'"><p>ETH moves. The sky changes. Your soul helps.</p><div class="san-weather-detail"><strong>{{ weatherLabel }}</strong><p>{{ marketLabel }}</p><p v-if="liveMarket">Coinbase Exchange · updated {{ new Date(market.observedAt).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}) }}</p><p v-else>Waiting for fresh prices. No new storms.</p></div><p v-if="defense">{{ defending?'Your soul brings light automatically.':defense.result==='lit'?'The town kept its light.':'Time to rest and rebuild.' }} {{ cloud ? `${defense.contributors} contributing homes.` : 'This is your solo event.' }}</p><details><summary>How the weather works</summary><p>ETH-USD, checked every 5 minutes. A 24-hour fall of 1% brings rain; 4% brings fog. A 4% rise brings a light storm. Events have 5 minutes to prepare, 15 minutes to help, and at least 6 hours between starts. No tokens are spent or lost. Each home adds the same light per minute.</p><p>A started event finishes even if the feed goes offline. New events wait for fresh data. Shared help continues for up to 2 hours after a verified visit. Visitors in the scenery are artwork, not live players.</p><a href="https://docs.cdp.coinbase.com/api-reference/exchange-api/rest-api/products/get-product-stats" target="_blank" rel="noreferrer">Price source ↗</a></details><details v-if="development"><summary>Weather preview</summary><p>Visual demo only. Your save and live event stay unchanged.</p><div class="san-menu-grid"><button v-for="(item,key) in WEATHER" :key="key" :aria-pressed="weatherPreview===key" @click="weatherPreview=key;panel=''">{{ item.label }}</button><button @click="weatherPreview='';panel=''">Live ETH</button></div></details></template>
        <BetaHome v-else-if="panel==='home'" :wallet-state="walletState" :current="cloud" :get-provider="walletSession.getProvider" @connect="walletSession.connect()" @switch-base="walletSession.switchBase()" @attach="attachCloud" @detach="detachCloud"/><template v-else-if="panel==='souls'">
          <p>Every SOULI has a little character: its inscription.</p><button class="san-inscription-link" @click="panel='about'">What is an inscription? ↗</button>
          <details :open="!!walletState.error || !!wallet"><summary>Bring my SOULI</summary><WalletAccess :state="walletState" @connect="connect" @disconnect="disconnectWallet"/>
          <form class="san-address" @submit.prevent="lookup"><label for="san-address">Look up a Base wallet <span>Read only</span></label><div><input id="san-address" v-model="address" placeholder="0x…" autocomplete="off" spellcheck="false"/><button class="san-secondary" :disabled="busy">{{ busy?'Looking…':'Find souls' }}</button></div></form>
          <p v-if="error" class="san-error" role="alert">{{ error }}</p>
          <div v-if="loaded.length" class="san-collection"><h3>{{ shortAddress(loadedAddress) }} <small>{{ loaded.length }} of {{ total }} originals · up to 8 shown</small></h3><div class="san-soul-grid"><button v-for="item in loaded" :key="`${item.seed}-${item.extra}`" @click="choose(item)"><img :src="svgUrl(item.svg)" :alt="item.label"/><strong>{{ item.label }}</strong><small>{{ item.dynamic?'Dynamic · growing':'Stable · stored' }}{{ item.level!==null?` · L${item.level}`:'' }}</small></button></div></div>
          </details><button class="san-tiny-choice" @click="choose(dot)"><span class="san-tiny-preview"><img :src="dot.url" alt="Original first-form SOULI, enlarged"/></span><span><strong>Little dot</strong><small>First-form sample</small></span><b>→</b></button>
          <div class="san-collection"><h3>Choose a visitor <small>Public samples</small></h3><div class="san-soul-grid"><button v-for="item in samples" :key="item.label" :aria-pressed="item.svg===selected.svg" @click="choose(item)"><img :src="svgUrl(item.svg)" :alt="item.label"/><strong>{{ item.label }}</strong><small>Practice soul</small></button></div></div>
          <details><summary>About these originals</summary><p class="san-disclosure">A public address lookup is not proof of ownership. Connecting is read only; no signature, approval or transaction is requested. Public originals: Base block {{ sampleInfo.block.toLocaleString('en-US') }}. Little dot: deployed renderer, seed 1 / extra 0 / contract level {{ dot.level }}, block {{ dot.block.toLocaleString('en-US') }}. Small artwork is framed closer without changing its foreground pixels.</p></details>
        </template>
        <template v-else-if="panel==='preserve'">
          <div class="san-preserve-portrait"><img :src="svgUrl(selected.svg)" :alt="selected.label"/><div><span class="san-kind">{{ kind }}</span><h3>{{ selected.label }}</h3><p>The original pixels. A form worth remembering.</p></div></div>
          <ol class="san-preserve-steps"><li><b>01</b><div><h3>Let it become.</h3><p>Adding SOULI can change your Dynamic soul’s stage and appearance. Game memories do not change its on-chain level.</p></div></li><li><b>02</b><div><h3>Keep the one you love.</h3><p>A qualifying token transfer to another wallet stores the soul’s seed and extra as a Stable original. The amount and receiving wallet must meet the contract’s conditions.</p></div></li><li><b>03</b><div><h3>A little place to live.</h3><p>Collect your stored originals and bring them into your town. Later spending can affect stored souls; Stable does not mean permanently locked.</p></div></li></ol>
          <p class="san-disclosure">Preservation transfers are not enabled in this preview. No tokens are moved here. A transfer review and MetaMask approval flow will follow contract verification.</p><a class="san-secondary" :href="`https://basescan.org/address/${TOKEN}`" target="_blank" rel="noreferrer">Explore the original contract ↗</a>
        </template>
        <template v-else-if="panel==='journal'">
          <div v-if="!state.journal.length" class="san-empty-journal"><span>✧</span><h3>Your story starts small.</h3><p>Your soul is already exploring.</p><button class="san-secondary" @click="panel=''">Back to the world →</button></div><ol v-else class="san-journal"><li v-for="(entry,i) in state.journal" :key="i"><span>{{ entry.kind==='build'?'✦':'✧' }}</span><div><small>LITTLE DAY {{ entry.day }}</small><p>{{ entry.text }}</p></div></li></ol><p class="san-disclosure">{{ cloud ? 'Your server-saved activity. No token rewards.' : 'Local activity, saved in this browser. No multiplayer or token rewards.' }}</p>
        </template>
        <template v-else>
          <div class="san-inscription-intro"><img :src="selected.url" :alt="selected.label"/><div><span class="san-kind">ERC-20i · BASE</span><h3>A token with a little soul.</h3><p>Your SOULI tokens form a seed. The contract turns it into a 24 × 24 character. That character is your inscription.</p></div></div>
          <div class="san-inscription-path"><span>SOULI tokens</span><b aria-hidden="true">→</b><span>A seed</span><b aria-hidden="true">→</b><span>Your character</span></div>
          <p>Your soul gathers, builds, and helps. Just watch.</p>
          <details><summary>How is it different from an NFT?</summary><p>SOULI is an ERC-20 token with native inscriptions, a format we call ERC-20i. Your character is part of that token system, not a separate ERC-721 NFT. The contract generates its art on Base.</p><p>Adding tokens can change a Dynamic form. Qualifying transfers can store a Stable form. Later spending and contract artwork settings can still affect it.</p><a class="san-inscription-link" href="./#inscriptions">More about SOULI ↗</a></details>
          <details><summary>Playing & saving</summary><dl class="san-preview-facts"><div><dt>Free play</dt><dd>Saved on this browser. Catch up for up to 2 hours away.</dd></div><div><dt>Neighbors</dt><dd>Sign in with a SOULI wallet for a shared town. Everyone adds the same light.</dd></div><div><dt>Your original</dt><dd>Your inscription’s pixels stay intact. Light effects belong to the scene.</dd></div><div><dt>Web3</dt><dd>Sales and preservation transfers are not enabled. Game light is not a token.</dd></div></dl></details>

        </template>
      </section>
    </div>
  </div>
</template>
