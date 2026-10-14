<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { formatEther, formatUnits, JsonRpcProvider, FetchRequest } from 'ethers'
import bundle from './contracts.generated.json'
import { createLab, NETWORK, CHAIN, STOCK, UNIT, requireSepolia, readTestShop } from './lab.mjs'
import published from './public-sale.json'
import { createWalletConnector } from '../lighthouse/wallet-connect.mjs'
import WalletRelayStatus from '../lighthouse/WalletRelayStatus.vue'
import { walletRequestMessage } from '../lighthouse/wallet-errors.mjs'
import ThreeWalletLab from './ThreeWalletLab.vue'

const account = ref(''), chain = ref(''), error = ref(''), notice = ref(''), busy = ref(false), snapshot = ref(null)
const record = ref({ receipts: [] }), saleInput = ref(''), recoveryHash = ref(''), purchaseHash = ref('')
const quantity = ref('210'), quote = ref(null), consent = ref(false), pendingPurchase = ref(null), purchaseResult = ref(null)
const publicShop = ref(null), publicError = ref(''), publicUpdated = ref('')
const relayState = ref({ busy: false, link: '' })
const connector = createWalletConnector(window, { chainId: NETWORK.chainId, onChange: state => { relayState.value = state }, onDisconnect: disconnected })
let provider, lab, buyer, timer, publicTimer, publicRpc, publicBusy = false, pollBusy = false, epoch = 0, operation = 0, connecting = false, disposed = false, resuming = false
const managementBusy = ref(false)
const walletBusy = computed(() => busy.value || managementBusy.value || relayState.value.busy)
const shop = computed(() => snapshot.value?.sale || publicShop.value)
const shopStatus = computed(() => !shop.value ? 'Not loaded' : shop.value.paused ? 'Paused' : shop.value.chainTime >= Number(shop.value.endsAt) ? 'Ended' : shop.value.chainTime < Number(shop.value.startsAt) ? 'Starts soon' : shop.value.available === 0n ? 'No stock' : 'Open')
const progress = computed(() => shop.value ? Number(shop.value.sold * 1000000n / shop.value.saleCap) / 10000 : 0)
const shownSale = computed(() => record.value.sale || shop.value?.manifest.address || published.address)
const currentShop = computed(() => shownSale.value?.toLowerCase() === published.address.toLowerCase())
const legacyShop = computed(() => shownSale.value?.toLowerCase() === published.legacyAddress.toLowerCase())
const shopLabel = computed(() => currentShop.value ? 'Current shop · three operators' : legacyShop.value ? 'Earlier shop · one operator' : 'Custom test shop')
const shownToken = computed(() => record.value.token || shop.value?.souli)
const onSepolia = computed(() => chain.value === NETWORK.chainId)
const owner = computed(() => snapshot.value?.sale?.owner?.toLowerCase() === account.value.toLowerCase())
const treasury = computed(() => snapshot.value?.sale?.treasury?.toLowerCase() === account.value.toLowerCase())
const locked = computed(() => walletBusy.value || !onSepolia.value || !!record.value.pending || !!pendingPurchase.value)
const leftToFund = computed(() => snapshot.value?.sale ? STOCK - snapshot.value.sale.sold - snapshot.value.inventory / UNIT : 0n)
const short = value => value ? value.slice(0, 6) + '…' + value.slice(-4) : '—'
const count = value => BigInt(value || 0).toLocaleString('en-US')
const tokens = value => { const [whole, fraction] = formatUnits(value || 0n, 9).split('.'); return BigInt(whole).toLocaleString('en-US') + (fraction && fraction !== '0' ? '.' + fraction : '') }
const eth = value => formatEther(value || 0n)
const link = (type, value) => `https://sepolia.basescan.org/${type}/${value}`
function invalidate() { quote.value = null; consent.value = false; buyer?.invalidateQuote() }
const readQueue = [], maxReads = 4
let activeReads = 0
function pumpReads() {
  while (activeReads < maxReads && readQueue.length) {
    const {method,params,resolve,reject}=readQueue.shift(); activeReads++
    if (!publicRpc) {
      const transport = new FetchRequest(NETWORK.rpcUrls[0]); transport.timeout = 12000
      publicRpc = new JsonRpcProvider(transport, undefined, { batchMaxCount: 1, cacheTimeout: -1 })
    }
    publicRpc.send(method,params).then(resolve,reject).finally(()=>{activeReads--;pumpReads()})
  }
}
const publicReader = { request: ({method,params=[]}) => new Promise((resolve,reject)=>{readQueue.push({method,params,resolve,reject});pumpReads()}) }
const makeLab = () => createLab(provider, bundle.contracts, window.localStorage, account.value, {readProvider:publicReader})
function bind(next) {
  provider?.removeListener?.('accountsChanged', changed); provider?.removeListener?.('chainChanged', changed); provider?.removeListener?.('disconnect', disconnected)
  provider = next
  provider?.on?.('accountsChanged', changed); provider?.on?.('chainChanged', changed); provider?.on?.('disconnect', disconnected)
}
function clearWallet() {
  epoch++; connecting = false; invalidate(); bind(null); lab = null; buyer = null; account.value = ''; chain.value = ''; snapshot.value = null
  record.value = { receipts: [] }; pendingPurchase.value = null; purchaseResult.value = null
}
function disconnected() {
  operation++; connecting = false; busy.value = false; clearWallet()
  notice.value = 'Disconnected. Reconnect to check this account. Saved transaction receipts are kept.'
}
function changed() {
  // MetaMask emits accounts/chain changes during connect/switch. The connection
  // flow checks the final identity itself; don't null its in-flight lab.
  if (connecting) return
  operation++; busy.value = false; clearWallet()
  notice.value = 'Wallet changed. Connect again to check this account.'
}
async function act(task) {
  if (walletBusy.value) return
  const actionId = ++operation
  busy.value = true; error.value = ''; notice.value = ''
  try { await task() } catch (e) { if (!disposed && actionId === operation) error.value = walletRequestMessage(e) }
  finally { if (!disposed && actionId === operation) { busy.value = false; if (lab) record.value = lab.state() } }
}
async function connect() {
  await act(async () => {
    const version = ++epoch
    const current = () => !disposed && epoch === version
    connecting = true
    try {
    const next = await connector.resolve()
    if (!current()) return
    if (!next) throw Error('Could not start MetaMask. Please try again.')
    bind(next)
    await next.request({ method: 'eth_requestAccounts' })
    if (!current()) return
    const connectedChain = await next.request({ method: 'eth_chainId' })
    if (!current()) return
    chain.value = connectedChain
    if (chain.value !== NETWORK.chainId) {
      try { await next.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: NETWORK.chainId }] }) }
      catch (e) {
        if (Number(e.code) !== 4902) throw e
        if (!current()) return
        await next.request({ method: 'wallet_addEthereumChain', params: [NETWORK] })
        if (!current()) return
        await next.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: NETWORK.chainId }] })
      }
    }
    if (!current()) return
    const selectedAccount = await requireSepolia(next)
    if (!current()) return
    account.value = selectedAccount; chain.value = NETWORK.chainId
    const nextLab = makeLab(); lab = nextLab
    if (!nextLab.state().sale && !nextLab.state().pending && published.address) await nextLab.loadSale(published.address)
    if (!current()) return
    await requireSepolia(next, selectedAccount)
    if (!current()) return
    record.value = nextLab.state(); await refresh()
    } catch (e) { if (current()) clearWallet(); throw e }
    finally { if (current()) connecting = false }
  })
}
async function disconnect() {
  await act(async () => {
    clearWallet()
    const revoked = await connector.disconnect()
    notice.value = revoked
      ? 'Disconnected. Choose an account in MetaMask, then tap Connect MetaMask.'
      : 'Disconnected here. Choose your account in MetaMask, then reconnect. You can also remove this site in MetaMask’s connected sites.'
    // Per-account transaction recovery and receipts remain in storage.
  })
}
async function refresh() {
  if (!lab) return
  const current = lab, version = epoch
  const next = await current.snapshot()
  if (lab !== current || version !== epoch) return
  snapshot.value = next; record.value = current.state()
  publicUpdated.value = new Date().toLocaleTimeString('en-US')
  if (record.value.sale && !buyer) {
    const nextBuyer = await current.purchaseClient()
    if (lab !== current || version !== epoch || disposed) return
    buyer = nextBuyer; pendingPurchase.value = buyer.pending()
  }
}
async function refreshPublic() {
  if (!published.address || publicBusy || document.hidden) return
  publicBusy = true
  try {
    publicShop.value = await readTestShop(publicReader, bundle.contracts, published.address)
    publicUpdated.value = new Date().toLocaleTimeString('en-US'); publicError.value = ''
  } catch { publicError.value = 'Live testnet data is temporarily unavailable. Check the explorer; previously loaded figures may be out of date.' }
  finally { publicBusy = false }
}
async function action(name) {
  await act(async () => {
    invalidate()
    const current = lab
    await current.send(name)
    if (current !== lab) return
    record.value = current.state(); notice.value = 'Sent. Waiting for two block confirmations.'
  })
}
async function load() {
  await act(async () => {
    if (buyer?.pending()) throw Error('Check the pending purchase before switching shops.')
    const current = lab; invalidate(); await current.loadSale(saleInput.value.trim()); if (current !== lab) return
    buyer = null; pendingPurchase.value = null; purchaseResult.value = null; await refresh()
  })
}
async function useControllerSale(address) {
  saleInput.value=address
  await load()
  document.querySelector('.buy-card')?.scrollIntoView({behavior:'smooth'})
}
async function review() {
  await act(async () => {
    const version = epoch, current = lab; invalidate()
    const client = buyer || await current.purchaseClient()
    if (version !== epoch) return
    buyer = client
    const nextQuote = await client.quote(quantity.value)
    if (version !== epoch) return
    quote.value = nextQuote; pendingPurchase.value = client.pending()
  })
}
async function buy() {
  if (!quote.value || !consent.value) return
  await act(async () => {
    const version = epoch, client = buyer, approvedQuote = quote.value
    try { const sent = await client.buy(approvedQuote); if (version === epoch) { pendingPurchase.value = sent; notice.value = 'Test purchase sent. Checking the receipt.' } }
    finally { if (version === epoch) { pendingPurchase.value = client.pending(); quote.value = null; consent.value = false } }
  })
}
async function check() {
  if (!lab || pollBusy || busy.value || document.hidden) return
  pollBusy = true
  const version = epoch
  try {
    if (record.value.pending?.hash) {
      const result = await lab.recover()
      if (version !== epoch) return
      record.value = lab.state()
      if (result && ['confirmed', 'failed', 'replaced'].includes(result.status)) { notice.value = `Test ${result.action}: ${result.status}.`; await refresh() }
    }
    if (buyer?.pending()) {
      const result = await buyer.checkReceipt()
      if (version !== epoch) return
      pendingPurchase.value = buyer.pending()
      if (result && ['success', 'failed', 'replaced'].includes(result.status)) { purchaseResult.value = result; notice.value = ''; await refresh() }
    }
  } catch (e) { if (version === epoch) error.value = e.message }
  finally { pollBusy = false }
}
async function manualRecover() {
  await act(async () => { const version = epoch; const result = await lab.recover(recoveryHash.value.trim()); if (version !== epoch) return; notice.value = `Test transaction: ${result?.status}.`; await refresh() })
}
async function manualPurchaseRecover() {
  await act(async () => { const version = epoch, client = buyer; const result = await client.checkReceipt(purchaseHash.value.trim()); if (version !== epoch) return; purchaseResult.value = result; pendingPurchase.value = client.pending(); notice.value = ''; await refresh() })
}
async function resumed() {
  if (document.hidden || walletBusy.value || resuming || !account.value || !provider) return
  resuming = true
  const version = epoch, current = provider, expected = account.value
  try { await requireSepolia(current, expected); if (version === epoch) { await check(); await refresh() } }
  catch { if (version === epoch) changed() }
  finally { resuming = false }
}
onMounted(async () => {
  document.addEventListener('visibilitychange', resumed)
  timer = setInterval(check, 5000)
  refreshPublic(); publicTimer = setInterval(async () => { if (document.hidden || busy.value) return; if (lab) { try { await refresh(); publicError.value = '' } catch { publicError.value = 'Could not refresh the shop. Previously loaded figures may be out of date.' } } else refreshPublic() }, 30000)
  // Restore only a previously authorized account on the test network. No prompt,
  // network switch, signature or transaction is requested by page load.
  try {
    const version = epoch
    const existing = await connector.resolve({ silent: true })
    if (!existing || version !== epoch || disposed) return
    const selectedAccount = await requireSepolia(existing)
    if (version !== epoch || disposed) return
    if (selectedAccount) {
      bind(existing)
      account.value = selectedAccount; chain.value = NETWORK.chainId
      const nextLab = makeLab(); lab = nextLab
      record.value = nextLab.state()
      if (!nextLab.state().sale && !nextLab.state().pending && published.address) await nextLab.loadSale(published.address)
      if (version !== epoch || disposed) return
      await refresh()
    }
  } catch { /* Silent restoration must not interrupt an explicit connection or prompt. */ }
})
onUnmounted(() => { disposed = true; operation++; clearWallet(); clearInterval(timer); clearInterval(publicTimer); document.removeEventListener('visibilitychange', resumed); publicRpc?.destroy(); connector.destroy() })
</script>

<template>
  <div class="test-strip">BASE SEPOLIA ONLY · TEST TOKENS HAVE NO VALUE</div>
  <main>
    <header class="top"><a href="/" class="brand"><img src="/images/fungi/token-logo.png" alt="SOULI"><span>SOULI <small>PLAYGROUND</small></span></a><a href="/">Back to SOULI ↗</a></header>
    <section class="intro"><span class="eyebrow">GM, TEST FREN.</span><h1>A little practice.<br>A lot less guesswork.</h1><p>Try wallet payments with pretend ETH.<br>Your real SOULI stays in its own world.</p></section>
    <section class="card shop-overview" aria-labelledby="shop-heading">
      <div class="overview-heading"><div><span class="step">THE TEST SHOP · ON-CHAIN NUMBERS</span><h2 id="shop-heading">Everything, in plain sight.</h2></div><span class="shop-state">{{shopStatus}}</span></div>
      <p>No wallet needed to view the shared test shop. These are test tokens, not the real SOULI ERC-20i.</p>
      <p><strong>{{shopLabel}}</strong> · <a :href="link('address',shownSale)" target="_blank" rel="noreferrer">{{short(shownSale)}} ↗</a></p>
      <template v-if="shop">
        <div class="shop-stats">
          <div><span>Tokens in the contract</span><strong>{{tokens(shop.inventory)}}</strong><small>tSOULI held right now</small></div>
          <div><span>Available to buy</span><strong>{{count(shop.available)}}</strong><small>tSOULI within the remaining sale cap</small></div>
          <div><span>Already sold</span><strong>{{count(shop.sold)}}</strong><small>tSOULI delivered to buyers</small></div>
          <div><span>Price for 1 tSOULI</span><strong class="eth-number">{{eth(shop.unitPriceWei)}}</strong><small>test ETH · fixed for this shop</small></div>
          <div><span>Total sales earned</span><strong class="eth-number">{{eth(shop.proceedsWei)}}</strong><small>test ETH · stays counted after withdrawals</small></div>
          <div><span>ETH still in the contract</span><strong class="eth-number">{{eth(shop.saleEth)}}</strong><small>test ETH · changes when withdrawn</small></div>
        </div>
        <div class="sale-progress"><span>{{count(shop.sold)}} / {{count(shop.saleCap)}} tSOULI sold</span><b>{{progress}}%</b><progress :value="Number(shop.sold)" :max="Number(shop.saleCap)" aria-label="Test tokens sold"></progress></div>
        <div class="overview-links"><a :href="link('address',shop.manifest.address)" target="_blank" rel="noreferrer">Check the sale contract ↗</a><a :href="link('token',shop.souli)" target="_blank" rel="noreferrer">Check test-token balances ↗</a><small>Block {{count(shop.block)}} · Updated {{publicUpdated}}</small></div>
      </template>
      <p v-else class="overview-empty">{{published.address ? 'Reading the test shop from Base Sepolia…' : 'The shared test shop is being set up. Confirmed on-chain figures will appear here after deployment.'}}</p>
      <p v-if="publicError" role="status" class="message">{{publicError}}</p>
    </section>
    <section id="test-wallet" class="card wallet-card">
      <div><span class="step">01 · YOUR TEST WALLET</span><h2>{{account ? short(account) : 'Connect. Switch. Try.'}}</h2><p v-if="account" class="address">{{account}}</p><p v-else>MetaMask will ask to connect and select Base Sepolia.</p></div>
      <div class="wallet-actions"><button v-if="account" class="secondary" :disabled="walletBusy" @click="disconnect">Disconnect</button><button v-else :disabled="walletBusy" @click="connect">{{walletBusy ? 'Check your wallet…' : 'Connect MetaMask'}}</button><span v-if="snapshot">{{eth(snapshot.eth)}} test ETH</span></div>
    </section>
    <WalletRelayStatus :state="relayState"/>
    <p v-if="!account" class="faucet">On your phone: approve in the MetaMask app, then return to this tab. On a computer: use the extension or scan the QR code.</p>
    <p class="faucet">Need test ETH? <a href="https://docs.base.org/get-started/get-funds" target="_blank" rel="noreferrer">Base faucet guide ↗</a> · Only receive <strong>Base Sepolia</strong> ETH. No real money is needed.</p>
    <p v-if="error" role="alert" class="message error">{{error}}</p><p v-if="notice" role="status" class="message">{{notice}}</p>
    <section v-if="account && !currentShop" class="card" aria-label="Choose the current test shop">
      <h2>{{legacyShop ? 'You’re in the earlier shop.' : 'You’re in a different shop.'}}</h2>
      <p>Your earlier purchases and receipts are kept. Use the current shop to test the three-operator sale.</p>
      <button :disabled="locked" @click="useControllerSale(published.address)">Use current test shop →</button>
      <p v-if="pendingPurchase || record.pending" class="fine">Check the pending transaction first. Switching never sends a payment.</p>
    </section>
    <section v-if="record.pending" class="card pending"><h2>One transaction at a time.</h2><p>{{record.pending.action}} · {{record.pending.hash ? 'Waiting for confirmation.' : 'Check MetaMask Activity before trying again.'}}</p><a v-if="record.pending.hash" :href="link('tx',record.pending.hash)" target="_blank" rel="noreferrer">View test transaction ↗</a><button v-if="!record.pending.hash&&['token','sale'].includes(record.pending.action)" class="secondary" :disabled="busy" @click="act(async()=>{const result=await lab.findDeployment();notice='Deployment: '+result?.status;await refresh()})">Find deployment receipt</button><details><summary>Recover a transaction</summary><label for="recover">Original transaction hash</label><input id="recover" v-model="recoveryHash" placeholder="0x…"><button :disabled="busy" @click="manualRecover">Verify on-chain</button><button v-if="!record.pending.hash" class="secondary" :disabled="busy" @click="act(async()=>{lab.clearUnsent();record=lab.state()})">I checked: no transaction was sent</button></details><details><summary>Request details</summary><p v-for="(value,key) in record.pending.tx" :key="key" class="address">{{key}} ({{typeof value}}): {{key==='data' ? String(value).slice(0,18)+'… ['+String(value).length+' characters]' : value}}</p></details></section>
    <div class="columns">
      <section class="card">
        <span class="step">{{shownSale ? '02 · THE TEST SHOP' : '02 · MAKE A TEST SHOP'}}</span><h2>{{shownSale ? 'Ready for a practice run.' : 'Your very own sandbox.'}}</h2><p>{{shownSale ? currentShop ? 'Connect to buy. Registered operators manage this shop below.' : owner ? 'You manage this shop. Its contract decides who can move stock and collect test ETH.' : 'Connect your wallet to try a purchase. Only the shop owner manages the stock.' : 'Two deployments. You own the test stock and receive the test ETH.'}}</p>
        <div class="setup-row"><span><b>Test token</b><small>10,000,000 tSOULI · 9 decimals</small></span><a v-if="shownToken" :href="link('address',shownToken)" target="_blank" rel="noreferrer">{{short(shownToken)}} ↗</a><span v-else-if="shownSale">Loading…</span><button v-else :disabled="locked||!account" @click="action('token')">Create token</button></div>
        <div class="setup-row"><span><b>Test sale</b><small>5,000,000 stock cap · 14 days</small></span><a v-if="shownSale" :href="link('address',shownSale)" target="_blank" rel="noreferrer">{{short(shownSale)}} ↗</a><button v-else :disabled="locked||!record.token" @click="action('sale')">Create sale</button></div>
        <div v-if="owner" class="setup-buttons"><button class="secondary" :disabled="locked||leftToFund<=0n||snapshot.allowance>=leftToFund*UNIT" @click="action('approve')">1. Approve test stock</button><button class="secondary" :disabled="locked||leftToFund<=0n||snapshot.allowance<leftToFund*UNIT" @click="action('deposit')">2. Deposit test stock</button><button :disabled="locked||!snapshot.sale.paused||snapshot.inventory===0n" @click="action('start')">3. Start test sale</button></div>
        <details><summary>Already have a test sale?</summary><p>Paste a sale address from this playground to test with a second wallet. Code and terms are checked before use.</p><label for="sale-address">Base Sepolia test sale address</label><input id="sale-address" v-model="saleInput" placeholder="0x…"><button class="secondary" :disabled="locked||!account" @click="load">Load verified test sale</button></details>
      </section>
      <section class="card buy-card">
        <span class="step">03 · TRY A PURCHASE</span><h2>Test the happy little path.</h2><p>Wallet → test ETH → tSOULI. Each transaction needs your wallet approval.</p>
        <p><strong>{{shopLabel}}</strong><br><a :href="link('address',shownSale)" target="_blank" rel="noreferrer">{{short(shownSale)}} ↗</a></p>
        <template v-if="snapshot?.sale"><div class="balance-row"><span>Shop</span><b>{{shopStatus}}</b></div><div class="balance-row"><span>Available</span><b>{{count(snapshot.sale.available)}} tSOULI</b></div><div class="balance-row"><span>Your balance</span><b>{{tokens(snapshot.tokenBalance)}} tSOULI</b></div></template>
        <label for="quantity">How many test tokens?</label><input id="quantity" v-model="quantity" inputmode="numeric" :disabled="busy||!!pendingPurchase" @input="invalidate">
        <button :disabled="locked||!record.sale||snapshot?.sale?.paused" @click="review">Review test purchase</button>
        <div v-if="quote" class="review"><strong>{{count(quote.quantity)}} tSOULI</strong><p>{{eth(quote.cost)}} test ETH + about {{eth(quote.feeWei)}} in test gas.<br>Wallet approval expires at {{new Date(quote.deadline*1000).toLocaleTimeString('en-US')}}.</p><label class="check"><input v-model="consent" type="checkbox">I understand these tokens have no value.</label><button :disabled="busy||!consent" @click="buy">Confirm test purchase</button></div>
        <div v-if="pendingPurchase" class="review"><b>Checking your purchase.</b><a v-if="pendingPurchase.hash" :href="link('tx',pendingPurchase.hash)" target="_blank" rel="noreferrer">View test receipt ↗</a><details><summary>Recover / replaced transaction</summary><label for="purchase-hash">Transaction hash</label><input id="purchase-hash" v-model="purchaseHash" placeholder="0x…"><button :disabled="busy" @click="manualPurchaseRecover">Verify purchase</button><button v-if="!pendingPurchase.hash" class="secondary" :disabled="busy" @click="act(async()=>{buyer.clearUnknown();pendingPurchase=buyer.pending()})">I checked: no purchase was sent</button></details></div>
        <p v-if="purchaseResult?.status==='success'" class="success">✓ {{count(purchaseResult.quantity)}} tSOULI delivered. <a :href="link('tx',purchaseResult.hash)" target="_blank" rel="noreferrer">Receipt ↗</a></p>
        <p v-else-if="purchaseResult&&['failed','replaced'].includes(purchaseResult.status)" class="message">No purchase confirmed. Transaction {{purchaseResult.status}}.</p>
        <p class="fine">Payment test only. This token has no inscriptions, game rewards, market price, or mainnet redemption.</p>
      </section>
    </div>
    <section v-if="snapshot?.sale && !currentShop" class="card management"><span class="step">04 · PRACTICE RUNNING THE SHOP</span><h2>Pause. Withdraw. Check.</h2><p>Unsold test stock returns to the owner. Test ETH goes only to the fixed treasury wallet.</p><div class="balance-row"><span>Shop balance</span><b>{{eth(snapshot.saleEth)}} test ETH</b></div><div class="management-buttons"><button class="secondary" :disabled="locked||!owner||snapshot.sale.paused" @click="action('pause')">Pause sale</button><button class="secondary" :disabled="locked||!owner||!snapshot.sale.paused||snapshot.inventory===0n" @click="action('withdraw')">Withdraw unsold test tokens</button><button class="secondary" :disabled="locked||!treasury||snapshot.saleEth===0n" @click="action('proceeds')">Withdraw test ETH</button><button class="secondary" :disabled="busy" @click="act(refresh)">Refresh balances</button></div><details><summary>Addresses & confirmed actions</summary><p class="address">Token: {{record.token}}<br>Sale: {{record.sale}}<br>Owner: {{snapshot.sale.owner}}<br>Treasury: {{snapshot.sale.treasury}}</p><p v-for="item in record.receipts" :key="item.hash"><a :href="link('tx',item.hash)" target="_blank" rel="noreferrer">{{item.action}} · {{item.status}} ↗</a></p></details></section>
    <ThreeWalletLab :selected-sale="shownSale" :purchase-pending="!!pendingPurchase" :account="account" :provider="provider" :reader="publicReader" :wallet-busy="busy || relayState.busy" @busy="managementBusy=$event" @select-sale="useControllerSale" @connect="connect" />
    <footer>TESTNET PLAYGROUND · NOT A LIVE SALE<br><span>Built on Base Sepolia. Your wallet keeps your keys.</span><br><a href="/whitepaper/">Read the field guide ↗</a></footer>
  </main>
</template>
