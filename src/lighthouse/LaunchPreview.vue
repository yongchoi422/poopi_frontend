<script setup>
import { computed, ref, onMounted, onUnmounted, nextTick } from 'vue'
import { EXAMPLE_TARGETS, LAUNCH_COPY, launchProgress, poolPriceMove } from './launch.mjs'
import { formatUnits, quotePurchase } from './purchase.mjs'
const props = defineProps({ state: Object, souls: Array })
const emit = defineEmits(['close', 'fund', 'confirm', 'expire', 'refund', 'reset', 'target'])
const closeButton = ref(null), status = ref(null), demo = ref(false)
let previousFocus
const copy = computed(() => LAUNCH_COPY[props.state.phase])
const percent = computed(() => launchProgress(props.state))
const inventory = computed(() => quotePurchase(props.state.targetUsdc))
const units = value => formatUnits(value, 6)
async function act(event, value) { emit(event, value); await nextTick(); status.value?.focus({ preventScroll: true }) }
function trap(event) {
  if (event.key === 'Escape') emit('close')
  if (event.key !== 'Tab') return
  const nodes = [...event.currentTarget.querySelectorAll('button:not(:disabled), summary, a[href]')].filter(node => {
    const closed = node.closest('details:not([open])')
    return node.getClientRects().length > 0 && (!closed || node === closed.querySelector('summary'))
  })
  if (event.shiftKey && document.activeElement === nodes[0]) { event.preventDefault(); nodes.at(-1)?.focus() }
  else if (!event.shiftKey && document.activeElement === nodes.at(-1)) { event.preventDefault(); nodes[0]?.focus() }
}
onMounted(() => { previousFocus = document.activeElement; closeButton.value?.focus() })
onUnmounted(() => nextTick(() => (previousFocus?.isConnected ? previousFocus : document.querySelector('.world-launch-entry, .launch-entry'))?.focus({ preventScroll: true })))
</script>

<template>
  <div class="modal-backdrop launch-backdrop" @click.self="emit('close')" @keydown="trap">
    <section class="launch-dialog" role="dialog" aria-modal="true" aria-labelledby="launch-title" aria-describedby="launch-disclaimer">
      <header class="launch-heading"><div><small>THE COMMUNITY LAUNCH</small><h2 id="launch-title">One goal. One bright start.</h2></div><button ref="closeButton" class="hud-square" aria-label="Close launch preview" @click="emit('close')">✕</button></header>
      <p id="launch-disclaimer" class="launch-demo-label"><strong>PLANNING · NOT LIVE</strong> No sale contract or LP funding is connected.</p>
      <p class="launch-plan-intro">A fixed-price start. A shared funding goal. Then a pool everyone can verify.</p>
      <div class="launch-plan-stats"><div><small>Proposed fixed rate</small><strong>1 USDC = 14 SOULI</strong><span>$15M FDV · 210M supply</span></div><div><small>Proposed sale proceeds</small><strong>100% to liquidity</strong><span>0% to a team wallet</span></div></div>
      <ol class="launch-plan-steps"><li><b>01</b><div><strong>Gather together</strong><p>USDC stays in a sale contract until the goal is reached.</p></div></li><li><b>02</b><div><strong>Reach the goal</strong><p>An on-chain transaction pairs the USDC with project-supplied SOULI.</p></div></li><li><b>03</b><div><strong>Open the pool</strong><p>Trading opens after confirmation, with public LP custody and lock records.</p></div></li></ol>
      <p class="launch-plan-refund">If launch conditions are not met by the deadline, buyers should be able to claim a refund. These rules still need to be built into the contract.</p>
      <details class="launch-ledger launch-readiness"><summary>Live launch checklist</summary><dl><div><dt>Sale contract</dt><dd>Not deployed</dd></div><div><dt>Funding goal & deadline</dt><dd>Not set</dd></div><div><dt>Uniswap pool & LP lock</dt><dd>Not configured</dd></div><div><dt>Refunds & automatic execution</dt><dd>Not implemented</dd></div></dl><p>Gas and any protocol fees need a disclosed funding source to preserve the 100% LP plan. A liquidity lock does not guarantee price.</p></details>
      <button class="launch-demo-toggle" :aria-expanded="demo" aria-controls="launch-simulation" @click="demo=!demo">{{ demo ? 'Close the simulation −' : 'Try the launch simulation →' }}</button>
      <section v-if="demo" id="launch-simulation" class="launch-simulation" aria-label="Local launch simulation">
      <p class="launch-demo-label"><strong>SIMULATION</strong> No real money. No wallet transaction.</p>
      <div class="launch-scene" :class="`launch-scene-${state.phase}`">
        <svg viewBox="0 0 320 112" shape-rendering="crispEdges" aria-hidden="true">
          <rect width="320" height="112" fill="#253f55"/><path d="M0 75H30V64H69V76H106V65H146V74H210V60H259V70H294V60H320V112H0Z" fill="#3a685c"/><path d="M0 88H59V95H107V84H203V94H272V85H320V112H0Z" fill="#78a461"/><path d="M0 106H320V112H0Z" fill="#b5c889"/>
          <path d="M20 19h3v3h-3ZM62 30h2v2h-2ZM274 20h3v3h-3ZM231 41h2v2h-2Z" fill="#bec4cd"/>
          <path d="M127 96H194V102H127ZM142 49H179V96H142Z" fill="#8eaab0"/><path d="M142 49H153V96H142Z" fill="#d0d4b1"/><path d="M134 46H187V52H134ZM143 21H178V47H143Z" fill="#6e6c97"/>
          <rect x="148" y="25" width="25" height="19" :fill="state.phase === 'live' ? '#fff2aa' : state.phase === 'ready' ? '#eec17f' : '#839aa5'"/>
          <path d="M134 21H187V25H134ZM140 16H181V21H140ZM147 11H174V16H147ZM155 6H166V11H155Z" fill="#ada2ce"/><path d="M154 78H168V96H154Z" fill="#466575"/>
          <g v-if="state.phase === 'live'" class="launch-sparkles" fill="#ffe6a2"><path d="M158 32H43V29H66V25H100V22H143ZM175 29H235V31H273V35H176Z" opacity=".5"/><path d="M94 38h3v5h5v3h-5v5h-3v-5h-5v-3h5ZM224 57h3v5h5v3h-5v5h-3v-5h-5v-3h5Z"/></g>
        </svg>
        <img v-for="(soul,i) in souls.slice(0,3)" :key="i" :src="soul.url" :alt="`${soul.label}, selected SVG artwork`" :class="`launch-fren launch-fren-${i}`" />
        <span>SELECTED SVG ART · NO NEW TOKENS MINTED</span>
      </div>
      <div ref="status" class="launch-status" tabindex="-1" aria-live="polite"><small>{{ copy.label }} · EXAMPLE</small><h3>{{ copy.title }}</h3><p>{{ copy.line }}</p></div>
      <fieldset class="launch-targets"><legend>Compare example targets</legend><div><button v-for="target in EXAMPLE_TARGETS" :key="target" :aria-pressed="state.targetUsdc === target" :disabled="state.raised > 0n || state.phase !== 'gathering'" @click="act('target', target)">${{ Number(target).toLocaleString('en-US') }}</button></div><small>Illustrations, not sale terms. Reset the example to change targets.</small></fieldset>
      <div class="launch-meter"><div><span>Simulated contributions</span><strong>{{ units(state.raised) }} <small>/ {{ units(state.targetUnits) }} USDC</small></strong></div><progress :value="percent" max="100" aria-label="Example funding progress"></progress><p>{{ percent }}% of an example target · actual target not set</p></div>
      <div class="launch-terms"><div><small>Fixed price before pool launch</small><strong>1 USDC = 14 SOULI</strong></div><div><small>Proposed sale FDV</small><strong>$15M</strong></div></div>
      <div class="launch-sim-controls">
        <template v-if="state.phase === 'gathering'"><button class="launch-main-action" @click="act('fund', state.targetUnits / 4n)">Simulate +25% funding <span>✦</span></button><button class="launch-alt-action" @click="act('expire')">Test deadline missed</button></template>
        <button v-else-if="state.phase === 'ready'" class="launch-main-action" @click="act('confirm')">Simulate pool confirmation <span>→</span></button>
        <button v-else-if="state.phase === 'refundable'" class="launch-main-action" @click="act('refund')">Simulate refund <span>↩</span></button>
        <button v-else class="launch-main-action" @click="emit('close')">Back to the world <span>↗</span></button>
      </div>
      <details class="launch-ledger"><summary tabindex="0">Where the example funds go</summary><dl><div><dt>Held in sale contract</dt><dd>{{ units(state.escrow) }} USDC</dd></div><div><dt>Sent to pool</dt><dd>{{ units(state.liquidity) }} USDC</dd></div><div><dt>Returned</dt><dd>{{ units(state.refunded) }} USDC</dd></div><div><dt>Team sale proceeds</dt><dd>0 USDC</dd></div><div><dt>Buyer allocation at target</dt><dd>{{ formatUnits(inventory.soulUnits, 9) }} SOULI</dd></div><div><dt>Additional pool inventory</dt><dd>{{ formatUnits(inventory.matchingSoulUnits, 9) }} SOULI</dd></div></dl><p>Illustrates a new pool at the sale price with full-range liquidity, before fees. The project must supply both token allocations. Real LP custody, fees, lock terms and refund rules are not configured.</p></details>
      <details class="launch-ledger"><summary tabindex="0">How much could one trade move the pool?</summary><table class="pool-depth-table"><caption>Example ending pool-price change</caption><thead><tr><th>Trade size*</th><th>After a buy</th><th>After a sell</th></tr></thead><tbody><tr v-for="trade in [1000, 5000]" :key="trade"><td>${{ trade.toLocaleString('en-US') }}</td><td>+{{ poolPriceMove(Number(state.targetUsdc), trade, 'buy').toFixed(2) }}%</td><td>{{ poolPriceMove(Number(state.targetUsdc), trade, 'sell').toFixed(2) }}%</td></tr></tbody></table><p>*Each trade starts from the initial pool. Buy size is USDC paid; sell size is SOULI valued at the initial price. Constant-product illustration with all raised USDC in the pool, no fees or other trades. These are ending prices, not average fills, a forecast or a live quote.</p></details>
      <footer class="launch-preview-footer"><p>The preview changes the village beacon only. It does not buy tokens, assign ownership or change game rewards.</p><button @click="act('reset')">Reset launch example</button></footer>
      </section>
    </section>
  </div>
</template>
