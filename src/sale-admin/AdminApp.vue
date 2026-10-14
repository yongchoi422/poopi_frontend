<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { formatEther, formatUnits } from 'ethers'
import { MAINNET_ADMIN } from './config.mjs'
import testnet from './testnet.json'
import { createAdminClient, readAdminState } from './client.mjs'
import { useWallet } from '../lighthouse/use-wallet.mjs'
import { createAdminReader } from './read-rpc.mjs'
import WalletRelayStatus from '../lighthouse/WalletRelayStatus.vue'
import { walletRequestMessage } from '../lighthouse/wallet-errors.mjs'
import { saleEndLabel } from '../lighthouse/sale-window.mjs'
import { stockPlan } from '../lighthouse/launch-plan.mjs'
import { parseWholeSouli } from '../lighthouse/native-sale.mjs'

// A query can select this one bundled test manifest, never supply addresses/terms.
// Local pilot props are compiled out of production selection, just like BuySouli.
const props = defineProps({ developmentConfig: Object })
const development = import.meta.env.DEV && props.developmentConfig
const isTest = development ? development.chainId === 84532 : new URL(location.href).searchParams.get('network') === 'testnet'
const config = development || (isTest ? testnet : MAINNET_ADMIN), networkName = isTest ? 'Base Sepolia · test assets' : 'Base · real assets'
const developmentV2 = development && config.sale.terms.version === 2
const wallet = useWallet(config.chainId), { account, relay } = wallet
const view = ref(null), loading = ref(false), busy = ref(false), error = ref(''), notice = ref(''), amount = ref(development ? String(BigInt(config.sale.terms.saleCap) < 42n ? BigInt(config.sale.terms.saleCap) : 42n) : '210')
const plan = ref(null), acknowledged = ref(false), unsentChecked = ref(false), recoveryHash = ref(''), record = ref({ pending: null, receipts: [] })
let client, epoch = 0, timer, disposed = false, polling = false
const reader = createAdminReader(config.chainId)
const registered = computed(() => config.enabled && config.operators.some(a => a.toLowerCase() === account.value.toLowerCase()))
const budget = computed(() => {
  if (!view.value || config.sale?.terms?.version !== 2) return null
  const received = BigInt(view.value.proceedsWei), lp = received / 2n
  return { lp, operations: received - lp }
})
const staged = computed(() => !isTest && config.sale?.address === MAINNET_ADMIN.sale.address)
const stock = computed(() => view.value ? stockPlan(view.value, config.sale.terms.saleCap) : null)
const fundingError = computed(() => {
  if (!view.value) return ''
  let q
  try { q = parseWholeSouli(amount.value) } catch (e) { return e.message }
  if (q > stock.value.room) return 'This exceeds the remaining round capacity.'
  if (q * 1000000000n > view.value.walletTokens) return 'Your connected wallet needs more SOULI for this amount.'
  return ''
})
const needsApproval = computed(() => {
  try { return !view.value || view.value.allowance < parseWholeSouli(amount.value) * 1000000000n } catch { return true }
})
// Background balance reads must not blur the amount input every 15 seconds.
// A review and a send each verify the current chain state again.
const locked = computed(() => busy.value || wallet.busy.value || relay.value.busy || !!record.value.pending || !registered.value || !view.value)
const labels = { approve: 'Approve stock', revoke: 'Remove stock approval', deposit: 'Deposit stock', recover: 'Return unsold stock', start: 'Open sale', pause: 'Pause sale', collect: 'Collect ETH', held: 'Recover held tokens' }
const tokenLabel = isTest ? 'tSOULI' : 'SOULI', ethLabel = isTest ? 'test ETH' : 'ETH'
const eth = n => formatEther(n || 0n), whole = n => BigInt(n || 0).toLocaleString('en-US')
const tokens = n => { const [integer, fraction] = formatUnits(n || 0n, 9).split('.'); return `${whole(integer)}${fraction && fraction !== '0' ? '.' + fraction : ''}` }
const short = a => a ? `${a.slice(0, 6)}…${a.slice(-4)}` : ''
const link = (type, value) => `${isTest ? 'https://sepolia.basescan.org' : 'https://basescan.org'}/${type}/${value}`
const progress = computed(() => view.value ? Number(view.value.sold * 10000n / BigInt(config.sale.terms.saleCap)) / 100 : 0)
async function refresh() {
  if (!config.enabled || loading.value) return
  const version = epoch; loading.value = true
  try { const s = await readAdminState(reader, config, { allowTest: isTest, account: account.value }); if (!disposed && version === epoch) { view.value = s; error.value = '' } }
  catch (e) { if (!disposed && version === epoch) { view.value = null; error.value = e.message } }
  finally { if (version === epoch) loading.value = false }
}
async function act(task) {
  if (busy.value || wallet.busy.value || relay.value.busy) return
  const version = epoch, current = client; busy.value = true; error.value = ''; notice.value = ''
  try { await task(current); if (!disposed && version === epoch) { if (current) record.value = current.state(); await refresh() } }
  catch (e) { if (!disposed && version === epoch) error.value = walletRequestMessage(e) }
  finally { if (!disposed && version === epoch) { if (current) { try { record.value = current.state() } catch (e) { error.value = e.message } } busy.value = false } }
}
function review(action) { return act(async c => { const p = await c.review(action, amount.value); if (client === c) { plan.value = p; acknowledged.value = false } }) }
function confirm() { if (!acknowledged.value) return; const p = plan.value; return act(async c => { await c.send(p); if (client === c) { plan.value = null; notice.value = 'Sent. Checking two confirmations.' } }) }
function recover() { return act(async c => { const r = await c.recover(recoveryHash.value.trim()); if (client === c) notice.value = r ? `Transaction ${r.status}.` : 'No pending request.' }) }
function cancelReview() { client?.invalidate(); plan.value = null; acknowledged.value = false }
watch(amount, cancelReview)
watch([account, wallet.provider], () => {
  epoch++; client = null; view.value = null; record.value = { pending: null, receipts: [] }; plan.value = null; loading.value = false; busy.value = false; error.value = ''
  if (registered.value) {
    try { client = createAdminClient(config, wallet.getProvider, reader, localStorage, account.value, { allowTest: isTest }); record.value = client.state() }
    catch (e) { error.value = e.message }
  }
  refresh()
})
onMounted(() => {
  refresh()
  timer = setInterval(async () => {
    if (document.hidden || busy.value || loading.value || polling) return
    polling = true; const c = client, version = epoch
    try {
      if (c) {
        record.value = c.state()
        if (record.value.pending?.hash) { const r = await c.recover(); if (version === epoch && r) { record.value = c.state(); notice.value = `Transaction ${r.status}.` } }
      }
      if (version === epoch && !plan.value) await refresh()
    } catch (e) { if (version === epoch) error.value = e.message }
    finally { polling = false }
  }, 15000)
})
onUnmounted(() => { disposed = true; epoch++; clearInterval(timer); reader.destroy() })
</script>

<template>
  <div class="manager">
    <header class="manager-header"><a href="/" class="manager-brand"><img src="/images/fungi/token-logo.png" alt="">SOULI</a><a :href="development ? (developmentV2 ? '/tmp/commercial-v2/buy.html' : '/tmp/mainnet-pilot/buy.html') : isTest ? '/testnet/' : '/buy/'">{{development ? 'Local purchase ↗' : isTest ? 'Test purchase ↗' : 'Purchase page ↗'}}</a></header>
    <main>
      <div class="manager-title"><div><p class="eyebrow">SALE MANAGER</p><h1>Your shop.</h1><p>{{networkName}}</p></div><span class="network-pill" :class="{test:isTest}">{{isTest ? 'TESTNET' : 'MAINNET'}}</span></div>
      <nav class="manager-networks" aria-label="Management network"><a href="/manage/" :aria-current="!isTest?'page':undefined">Base</a><a href="/manage/?network=testnet" :aria-current="isTest?'page':undefined">Try on testnet</a></nav>
      <section v-if="!config.enabled" class="manager-card setup"><span class="big-icon" aria-hidden="true">◇</span><h2>Mainnet is not open yet.</h2><p>The reviewed sale contract and final terms will appear here before any management request is enabled.</p><a class="manager-button" href="/manage/?network=testnet">Try the test shop →</a><a href="/whitepaper/#funds">How funds are managed ↗</a></section>
      <template v-else>
        <p v-if="development" class="manager-note"><b>{{developmentV2 ? 'Local V2 check' : 'Local mainnet pilot'}} · {{config.sale.terms.saleCap}} SOULI lifetime maximum.</b> Real assets. The public commercial sale stays closed.</p>
        <p v-if="isTest" class="manager-note">Test assets only. This does not manage real SOULI or real ETH.</p>
        <p v-if="error || wallet.error.value" class="manager-error" role="alert">{{error || wallet.error.value}}</p>
        <p v-if="notice || wallet.notice.value" class="manager-note" role="status">{{notice || wallet.notice.value}}</p>
        <section class="manager-card">
          <div class="card-title"><h2>The shop</h2><button class="subtle" :disabled="loading||busy" @click="refresh">{{loading?'Reading…':'Refresh ↻'}}</button></div>
          <template v-if="view"><span class="status-pill">{{view.status}}</span><div class="manager-stats"><div><span>Stock available</span><strong>{{whole(view.available)}}</strong><small>{{tokenLabel}}</small></div><div><span>Tokens sold</span><strong>{{whole(view.sold)}}</strong><small>of {{whole(config.sale.terms.saleCap)}} {{tokenLabel}}</small></div><div><span>Room for more stock</span><strong>{{whole(view.remainingToFund)}}</strong><small>{{tokenLabel}} · within the round</small></div><div><span>Purchase ETH received</span><strong>{{eth(view.proceedsWei)}}</strong><small>{{ethLabel}} · cumulative</small></div><div><span>ETH still in contracts</span><strong>{{eth(view.saleEth+view.controllerEth)}}</strong><small>{{ethLabel}} · available to collect</small></div></div><progress :value="progress" max="100" aria-label="Token sale progress"></progress><p class="fine">As of block {{whole(view.block)}}. Contract ETH can include forced transfers. Collecting ETH does not add liquidity.</p></template>
          <div v-if="budget" class="manager-note"><b>50:50 budget from purchase ETH</b><p>Manual LP: {{eth(budget.lp)}} {{ethLabel}} + separate SOULI<br>Operations: {{eth(budget.operations)}} {{ethLabel}}</p><p class="fine">Cumulative allocation only, not a current balance or proof of LP funding. Forced ETH and founder top-ups are excluded. Collection does not split or lock funds.</p></div>
          <p v-if="staged" class="fine">First stock target: 1.4M including tokens already sold. Add the remaining 2.8M in batches, even while selling. The lifetime cap stays 4.2M. LP stock is separate.</p><p v-if="!view" role="status">{{loading?'Checking contracts and balances…':'Verified figures unavailable. No actions are enabled.'}}</p>
          <details><summary>Price, contracts & permissions</summary><p>1 {{tokenLabel}} = {{eth(config.sale.terms.unitPriceWei)}} {{ethLabel}}. Wallet limit: {{whole(config.sale.terms.walletCap)}} tokens.</p><p>Sale ends: {{saleEndLabel(config.sale.terms.endsAt)}}.</p><div class="contract-links"><a :href="link('address',config.sale.address)" target="_blank" rel="noreferrer">Sale {{short(config.sale.address)}} ↗</a><a :href="link('address',config.controller)" target="_blank" rel="noreferrer">Controller {{short(config.controller)}} ↗</a><a :href="link('token',config.sale.terms.token)" target="_blank" rel="noreferrer">Token {{short(config.sale.terms.token)}} ↗</a></div><p>Any one of the three registered wallets can act alone. This is not a multisig or an LP lock. Funds return to the registered wallet making the request.</p><p v-for="(a,i) in config.operators" :key="a" class="address">{{['A','B','C'][i]}} · {{a}}</p></details>
        </section>
        <section class="manager-card wallet-gate"><div><p class="eyebrow">OPERATOR ACCESS</p><h2>{{account?short(account):'Your wallet is your key.'}}</h2><p>{{!account?'Connect one of the three registered wallets.':registered?'Registered operator. Every action needs wallet approval.':'This wallet has no management permission.'}}</p></div><button :disabled="wallet.busy.value||relay.busy||busy" @click="account?wallet.disconnect():wallet.connect()">{{wallet.busy.value?'Checking…':account?'Disconnect':'Connect MetaMask'}}</button></section>
        <WalletRelayStatus :state="relay" />
        <template v-if="registered && client">
          <section v-if="record.pending" class="manager-card review-card"><h2>Check the earlier request.</h2><p>{{labels[record.pending.action]}} · {{record.pending.hash?'Waiting for confirmation':'Check MetaMask Activity'}}</p><a v-if="record.pending.hash" :href="link('tx',record.pending.hash)" target="_blank" rel="noreferrer">View transaction ↗</a><label for="recover-hash">Transaction hash</label><input id="recover-hash" v-model="recoveryHash" placeholder="0x…"><button :disabled="busy||relay.busy" @click="recover">Verify receipt</button><template v-if="!record.pending.hash"><label class="check-line"><input v-model="unsentChecked" type="checkbox">I checked MetaMask. Nothing was sent.</label><button class="subtle" :disabled="busy||relay.busy||!unsentChecked" @click="act(async c=>c.clearUnsent(unsentChecked))">Clear unsent request</button></template></section>
          <section v-else-if="plan" class="manager-card review-card"><p class="eyebrow">REVIEW BEFORE SIGNING</p><h2>{{labels[plan.action]}}</h2><dl><div><dt>Network</dt><dd>{{networkName}}</dd></div><div v-if="plan.quantity"><dt>Amount</dt><dd>{{whole(plan.quantity)}} {{tokenLabel}}</dd></div><div v-if="plan.action==='collect'"><dt>ETH available at review</dt><dd>{{eth(plan.collectableWei)}} {{ethLabel}}</dd></div><div><dt>Contract called</dt><dd class="address">{{plan.tx.to}}</dd></div><div><dt>{{['approve','revoke'].includes(plan.action)?'Approved spender':plan.action==='deposit'?'Via controller':['pause','start'].includes(plan.action)?'Sale':'Receiving wallet'}}</dt><dd class="address">{{plan.destination}}</dd></div><div><dt>Estimated network fee</dt><dd>{{eth(plan.estimatedFeeWei)}} {{ethLabel}}</dd></div></dl><p v-if="plan.action==='collect'">Collects all ETH held by this sale and controller at execution. This is a withdrawal to your wallet, not an LP transaction.</p><p v-if="plan.action==='start'">Opens the on-chain sale under its fixed opening conditions and quantity limits. The public purchase page uses this contract. If stock is available, this signature makes it buyable.</p><label class="check-line"><input v-model="acknowledged" type="checkbox">I checked the network, action and destination.</label><div class="button-row"><button :disabled="busy||relay.busy||!acknowledged" @click="confirm">{{busy?'Check MetaMask…':'Confirm in MetaMask →'}}</button><button class="subtle" :disabled="busy||relay.busy" @click="cancelReview">Back</button></div></section>
          <div v-else class="manager-actions"><section class="manager-card"><p class="eyebrow">01 · INVENTORY</p><h2>Stock your shop.</h2><label for="stock-amount">Whole {{tokenLabel}}</label><input id="stock-amount" v-model="amount" inputmode="numeric" autocomplete="off" :disabled="locked"><p class="fine" v-if="view">Your balance: {{tokens(view.walletTokens)}} · Approved: {{tokens(view.allowance)}} {{tokenLabel}}</p><div v-if="stock" class="stock-shortcuts" aria-label="Choose stock quantity"><button v-if="staged" class="subtle" :disabled="locked||stock.firstNeeded===0n" @click="amount=String(stock.firstNeeded)">Fill first 1.4M</button><button class="subtle" :disabled="locked||stock.walletMaximum===0n" @click="amount=String(stock.walletMaximum)">Use wallet balance</button><button class="subtle" :disabled="locked||stock.room===0n" @click="amount=String(stock.room)">Remaining round</button></div><p v-if="fundingError" class="fine" role="status">{{fundingError}}</p><div class="button-stack"><button :disabled="locked||!!fundingError" @click="review('approve')">1. Approve this amount</button><button :disabled="locked||!!fundingError||needsApproval" @click="review('deposit')">2. Deposit stock</button><button class="subtle" :disabled="locked||!view?.paused" @click="review('recover')">Return unsold stock</button></div><p class="fine">Approve only this amount, then deposit. You can add stock while the sale is open. Pause only when returning unsold stock. Do not deposit LP-reserve tokens here.</p></section><section class="manager-card"><p class="eyebrow">02 · SALE & ETH</p><h2>Stay in control.</h2><div class="button-stack"><button :disabled="locked" @click="review(view?.paused?'start':'pause')">{{view?.paused?'Open sale':'Pause sale'}}</button><button :disabled="locked||!view||(view.saleEth+view.controllerEth===0n)" @click="review('collect')">Collect ETH to my wallet</button></div><p>LP comes next, in a separate manual transaction. Publish the pool and receipt when it is added.</p><details><summary>Other actions</summary><button class="subtle" :disabled="locked" @click="review('revoke')">Remove stock approval</button><button class="subtle" :disabled="locked||!view?.heldTokens" @click="review('held')">Recover tokens sent to controller</button></details></section></div>
          <p v-if="record.storageWarning" class="manager-error">Recovery could not be saved on this device. Keep this page open and copy the transaction hash.</p>
          <details v-if="record.receipts.length" class="manager-card"><summary>Verified actions on this device</summary><p v-for="r in [...record.receipts].reverse()" :key="r.hash"><a :href="link('tx',r.hash)" target="_blank" rel="noreferrer">{{labels[r.action]}} · {{r.status}} ↗</a></p></details>
        </template>
      </template>
    </main><footer><a href="/whitepaper/#funds">Read the fund rules ↗</a><span>Your keys stay in your wallet.</span></footer>
  </div>
</template>
