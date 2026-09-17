<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { svgUrl, shortAddress } from './souli'
import { PURCHASE, quotePurchase, formatUnits } from './purchase.mjs'
import WalletAccess from './WalletAccess.vue'
const props = defineProps({ soul: Object, walletState: Object })
const emit = defineEmits(['close', 'launch', 'connect', 'disconnect', 'switch-base'])
const amount = ref('100'), reviewed = ref(false), message = ref('')
const address = computed(() => props.walletState.address), chainId = computed(() => props.walletState.chainId)
const balance = computed(() => props.walletState.usdcUnits), holding = computed(() => props.walletState.soulUnits)
const busy = computed(() => props.walletState.busy), reading = computed(() => props.walletState.reading)
const closeButton = ref(null)
let previousFocus = null
const quote = computed(() => { try { return { ...quotePurchase(amount.value), error: '' } } catch (e) { return { usdcUnits: 0n, soulUnits: 0n, matchingSoulUnits: 0n, requiredSoulUnits: 0n, error: e.message } } })
const receive = computed(() => formatUnits(quote.value.soulUnits, 9))
const payment = computed(() => formatUnits(quote.value.usdcUnits, 6))
const isBase = computed(() => chainId.value.toLowerCase() === PURCHASE.chainId)
const insufficient = computed(() => balance.value !== null && quote.value.usdcUnits > balance.value)
const balanceLabel = computed(() => balance.value === null ? '—' : formatUnits(balance.value, 6))
watch(amount, () => { reviewed.value = false; message.value = '' })
watch([address, chainId], () => { reviewed.value = false; message.value = '' })
function review() { if (!quote.value.error) { reviewed.value = true; message.value = 'Quote preview only. Nothing has been purchased or reserved.' } }
function trap(event) {
  if (event.key === 'Escape') { emit('close'); return }
  if (event.key !== 'Tab') return
  const nodes = [...event.currentTarget.querySelectorAll('button:not(:disabled), input, a[href], summary')].filter(node => {
    const closedDetails = node.closest('details:not([open])')
    return node.getClientRects().length > 0 && (!closedDetails || node === closedDetails.querySelector('summary'))
  })
  if (event.shiftKey && document.activeElement === nodes[0]) { event.preventDefault(); nodes.at(-1)?.focus() }
  else if (!event.shiftKey && document.activeElement === nodes.at(-1)) { event.preventDefault(); nodes[0]?.focus() }
}
onMounted(() => { previousFocus = document.activeElement; closeButton.value?.focus() })
onUnmounted(() => nextTick(() => previousFocus?.focus({ preventScroll: true })))
</script>

<template>
  <div class="modal-backdrop purchase-backdrop" @click.self="emit('close')" @keydown="trap">
    <section class="purchase-dialog" role="dialog" aria-modal="true" aria-labelledby="purchase-title" aria-describedby="sale-state">
      <header class="purchase-heading"><div class="purchase-brand">SOULI <span>ON BASE</span></div><button ref="closeButton" class="hud-square" aria-label="Close purchase" @click="emit('close')">✕</button></header>
      <div class="purchase-hero"><div class="purchase-soul"><img :src="svgUrl(soul.svg)" alt="Original on-chain SOULI SVG, artwork example" /></div><div><p class="purchase-kicker">LITTLE SOULS. BIG ADVENTURES.</p><h2 id="purchase-title">Get your SOULI.</h2><p>Your wallet. Your little legend.</p></div></div>
      <p id="sale-state" class="sale-state"><span>SALE PREVIEW</span> Purchases are not live yet.</p>
      <div class="purchase-price"><div><small>Proposed token price</small><strong>≈ $0.07142857 <span>/ SOULI</span></strong></div><div><small>Proposed FDV</small><strong>$15,000,000</strong></div></div>
      <p class="purchase-network"><span class="base-dot"></span> {{ address ? (isBase ? 'Base connected · USDC' : 'Select Base for USDC balances') : 'Purchases would use USDC on Base' }}</p>
      <button v-if="address && !isBase" class="switch-base" :disabled="busy" @click="emit('switch-base')">Switch to Base</button>
      <form @submit.prevent="review">
        <div class="purchase-amount"><div class="amount-label"><label for="purchase-amount">You pay</label><span v-if="address && isBase">{{ reading ? 'Reading balance…' : `Balance: ${balanceLabel} USDC` }}</span></div><div class="amount-input"><input id="purchase-amount" v-model="amount" type="text" inputmode="decimal" autocomplete="off" spellcheck="false" aria-describedby="amount-error purchase-rate" /><strong><span class="coin-usdc">$</span> USDC</strong></div><div class="quick-amounts"><button v-for="value in ['25','100','500','1000']" :key="value" type="button" :class="{ active: amount === value }" :aria-pressed="amount === value" @click="amount = value">{{ Number(value).toLocaleString('en-US') }}</button></div></div>
        <div class="purchase-arrow" aria-hidden="true">↓</div>
        <div class="purchase-receive"><small>You would receive</small><div><strong>{{ receive }}</strong><span>SOULI</span></div><p id="purchase-rate">1 USDC = 14 SOULI · proposed fixed rate</p></div>
        <p id="amount-error" class="purchase-error" v-if="quote.error || insufficient" role="alert">{{ quote.error || 'Your connected wallet has less USDC than this amount.' }}</p>
        <button class="purchase-review" :disabled="Boolean(quote.error)" type="submit">Preview amount <span>→</span></button>
      </form>
      <div v-if="reviewed" class="purchase-confirm"><h3>Your purchase preview</h3><dl><div><dt>Payment</dt><dd>{{ payment }} USDC</dd></div><div><dt>SOULI</dt><dd>{{ receive }}</dd></div><div><dt>Receive at</dt><dd>{{ address ? shortAddress(address) : 'Connect a wallet to select recipient' }}</dd></div><div><dt>Network fee</dt><dd>Not estimated yet · paid in ETH</dd></div></dl><button class="purchase-review" disabled>Buy SOULI · not live yet</button><p>A sale contract and token inventory must be connected before purchases can open.</p></div>
      <p v-if="message" class="purchase-notice" role="status">{{ message }}</p>
      <WalletAccess :state="walletState" @connect="emit('connect')" @disconnect="emit('disconnect')" />
      <details class="liquidity-plan">
        <summary>Follow the funds · proposed route</summary>
        <p class="liquidity-intro">Proposed route: sale USDC funds liquidity, with 0% of sale proceeds to a team wallet. Any protocol fees must be disclosed before launch.</p>
        <button class="launch-route-link" @click="emit('launch')">Try the goal-to-launch example →</button>
        <ol class="liquidity-route"><li><span>01</span><strong>Your wallet</strong><small>{{ payment }} USDC</small></li><li><span>02</span><strong>Sale contract</strong><small>Held until launch</small></li><li><span>03</span><strong>Uniswap pool</strong><small>USDC + SOULI</small></li></ol>
        <div class="liquidity-matching"><span>For this quote · before fees</span><p><strong>{{ receive }} SOULI</strong> for the buyer<br><strong>{{ payment }} USDC + {{ formatUnits(quote.matchingSoulUnits, 9) }} SOULI</strong> proposed for the pool</p><small>The project supplies the extra SOULI. This assumes a new full-range pool at the sale price; actual amounts depend on fees and pool design.</small></div>
        <details class="proof-details"><summary tabindex="0">Verify the plan & controls</summary><dl><div><dt>Sale contract</dt><dd>Not deployed</dd></div><div><dt>Destination pool</dt><dd>Not selected / verified</dd></div><div><dt>LP custody & withdrawal rights</dt><dd>Not configured</dd></div><div><dt>Lock duration / unlock date</dt><dd>Not set</dd></div><div><dt>Fee recipient</dt><dd>Not set</dd></div><div><dt>Refund deadline & conditions</dt><dd>Not set</dd></div><div><dt>Sale receipts</dt><dd>No live sale history</dd></div></dl><p>This is a proposed route, not proof of deposited or locked funds. Before launch, this view must link to the verified sale code, pool, LP owner, lock terms and transaction receipts. A liquidity lock does not guarantee price or prevent token sales.</p><a href="https://support.uniswap.org/hc/en-us/articles/20980786685069-Why-is-liquidity-position-ownership-represented-by-tokens-or-NFTs" target="_blank" rel="noreferrer">How liquidity ownership works ↗</a></details>
      </details>
      <details class="purchase-details"><summary tabindex="0">Token & sale details</summary><dl><div><dt>Total supply</dt><dd>210,000,000 SOULI</dd></div><div><dt>Supply snapshot</dt><dd>Base block {{ PURCHASE.supplyVerifiedBlock.toLocaleString('en-US') }}</dd></div><div><dt>Sale allocation</dt><dd>Not set</dd></div><div><dt>Sale contract</dt><dd>Not deployed / connected</dd></div><div v-if="holding !== null"><dt>Your SOULI balance</dt><dd>{{ formatUnits(holding, 9) }}</dd></div></dl><p>FDV means the proposed price multiplied by the full supply. It is not funds raised or an observed market valuation. This quote assumes 1 USDC = USD 1. No exchange listing, return or specific SVG appearance is promised.</p><p>Purchase eligibility is not verified by connecting a wallet.</p><a :href="`https://basescan.org/token/${PURCHASE.token}`" target="_blank" rel="noreferrer">SOULI token ↗</a><a :href="`https://basescan.org/token/${PURCHASE.usdc}`" target="_blank" rel="noreferrer">Native USDC ↗</a></details>
    </section>
  </div>
</template>
