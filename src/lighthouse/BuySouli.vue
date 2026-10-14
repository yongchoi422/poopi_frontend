<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { TOKEN, artForStage } from './soul-art'
import levelSnapshot from './purchase-levels.json'
import exampleSnapshot from './inscription-examples.json'
import InscriptionExamples from './InscriptionExamples.vue'
import MySouli from '../soul/MySouli.vue'
import PurchaseReveal from '../soul/PurchaseReveal.vue'
import { wholeAmount, guideForAmount, amountProblem, ethAmount, estimatedEth } from './purchase-guide.mjs'
import { saleProfile } from './sale-profile.mjs'
import { saleEndLabel } from './sale-window.mjs'
import { purchaseAvailability } from '../buy/purchase-availability.mjs'
import './native-sale.css'

const props=defineProps({soul:Object,walletState:Object,getProvider:Function,saleConfig:Object,standalone:Boolean,compact:Boolean,publicAvailability:Object,requireAvailability:Boolean,purchaseProfile:{type:String,default:'commercial'}})
const emit=defineEmits(['close','launch','connect','disconnect','switch-base','purchased'])
// An arbitrary development manifest cannot enable production sales.
const config=saleProfile(props.purchaseProfile,{development:import.meta.env.DEV,override:props.saleConfig})
const enabled=config.enabled,testMode=enabled&&config.mode==='test'
const levels=levelSnapshot.levels.map(level=>({...level,...artForStage(level.svg)}))
const quantity=ref('1'),info=ref(null),quote=ref(null),checked=ref(false),busy=ref(false),refreshing=ref(false),ready=ref(false)
const message=ref(''),error=ref(''),recovery=ref(null),result=ref(null),replacementHash=ref(''),clock=ref(Date.now())
const dialog=ref(null),heading=ref(null),closeButton=ref(null),quantityInput=ref(null)
const polling=ref(false)
let client,reader,previousFocus,timer,disposed=false,epoch=0,readEpoch=0,lastPoll=0,lastStatePoll=0
const account=computed(()=>props.walletState?.address||'')
const correctChain=computed(()=>{try{return BigInt(props.walletState?.chainId||0)===BigInt(config.chainId)}catch{return false}})
const expired=computed(()=>quote.value&&clock.value>=quote.value.validUntil)
const shownError=computed(()=>error.value||props.walletState?.error||'')
const selected=computed(()=>guideForAmount(levels,quantity.value)||levels[0])
const availability=computed(()=>purchaseAvailability({snapshot:props.publicAvailability,required:props.requireAvailability,wallet:info.value,walletCap:config.terms?.walletCap||'4200000',now:clock.value}))
const inputProblem=computed(()=>amountProblem(quantity.value,props.requireAvailability?availability.value.info:info.value))
const cost=computed(()=>ready.value&&wholeAmount(quantity.value)!==null?wholeAmount(quantity.value)*BigInt(config.terms.unitPriceWei):null)
const showPicker=computed(()=>!quote.value&&!recovery.value&&result.value?.status!=='success')
const currentStep=computed(()=>result.value?.status==='success'||recovery.value?3:quote.value?2:1)
const levelUnavailable=level=>enabled&&BigInt(level.minimum)>availability.value.limit
const levelUnavailableReason=level=>!levelUnavailable(level)?'':props.requireAvailability&&!availability.value.info?'Stock not verified':'Above available stock or wallet limit'
const title=computed(()=>result.value?.status==='success'?'Welcome home.':recovery.value?'On its way.':quote.value?'One last look.':props.compact?'Buy SOULI.':'Meet your SOULI.')
const short=value=>value?value.slice(0,6)+'…'+value.slice(-4):''
const number=value=>BigInt(value).toLocaleString('en-US')
const explorer=hash=>config.chainId===8453?'https://basescan.org/tx/'+hash:config.chainId===84532?'https://sepolia.basescan.org/tx/'+hash:null
const addressLink=value=>config.chainId===8453?'https://basescan.org/address/'+value:config.chainId===84532?'https://sepolia.basescan.org/address/'+value:null
const networkLabel=computed(()=>testMode?(config.chainId===31337?'Local test':'Base Sepolia'):'Base')
const primaryLabel=computed(()=>!enabled?'Purchases open soon':props.requireAvailability&&availability.value.blocked?availability.value.message:props.walletState?.busy?'Connecting…':!account.value?(testMode?'Use test wallet':'Connect MetaMask'):!correctChain.value?'Switch to Base':busy.value||refreshing.value?'Checking…':'Review purchase →')
const primaryDisabled=computed(()=>Boolean(!enabled||busy.value||props.walletState?.busy||(props.requireAvailability&&(availability.value.blocked||!!inputProblem.value))||(account.value&&correctChain.value&&(!ready.value||refreshing.value||!info.value?.open||!!inputProblem.value))))
const walletBusy=computed(()=>busy.value||!!props.walletState?.busy)
const needsConnection=computed(()=>!account.value||!correctChain.value)
function reconnect(){if(!walletBusy.value)emit(account.value?'switch-base':'connect')}
function disconnect(){if(!walletBusy.value)emit('disconnect')}

function reset(){epoch++;quote.value=null;checked.value=false;error.value='';client?.invalidateQuote()}
function pick(level){if(!busy.value)quantity.value=level.minimum}
async function focusStep(){await nextTick();if(!disposed){if(props.standalone)heading.value?.scrollIntoView({block:'start'});else dialog.value?.scrollTo({top:0});heading.value?.focus({preventScroll:true})}}
async function edit(){reset();await nextTick();quantityInput.value?.focus()}
function openTerms(){const details=dialog.value?.querySelector('#eth-sale-details');if(details){details.open=true;details.scrollIntoView({block:'nearest'})}}
async function refresh(){
  if(!client||!account.value||!correctChain.value)return
  lastStatePoll=Date.now();const id=++readEpoch;refreshing.value=true;error.value=''
  try{const data=await client.read();if(!disposed&&id===readEpoch)info.value=data}
  catch(e){if(!disposed&&id===readEpoch){info.value=null;error.value=e.message}}
  finally{if(!disposed&&id===readEpoch)refreshing.value=false}
}
async function primary(){
  if(primaryDisabled.value)return
  if(!account.value){emit('connect');return}
  if(!correctChain.value){emit('switch-base');return}
  await review()
}
async function review(){
  if(busy.value||!client||inputProblem.value)return
  reset();result.value=null;message.value='';busy.value=true;const id=epoch
  try{const data=await client.quote(quantity.value);if(!disposed&&id===epoch){quote.value=data;await focusStep()}}
  catch(e){if(!disposed&&id===epoch)error.value=e.message}
  finally{busy.value=false}
}
async function purchase(){
  if(busy.value||!checked.value||expired.value||!quote.value)return
  busy.value=true;error.value='';message.value='Confirm in your wallet.'
  try{recovery.value=await client.buy(quote.value);quote.value=null;message.value='Waiting for confirmation.';await focusStep()}
  catch(e){error.value=e.message;recovery.value=client.pending();quote.value=null;message.value=''}
  finally{busy.value=false;await check()}
}
async function check(hash){
  if(polling.value||!client||!account.value||!correctChain.value)return
  polling.value=true;lastPoll=Date.now()
  try{
    const receipt=await client.checkReceipt(hash)
    if(disposed||!receipt)return
    recovery.value=client.pending()
    if(receipt.status==='success'){result.value=receipt;message.value='';error.value='';emit('purchased',receipt);await refresh();await focusStep()}
    else if(receipt.status==='failed'||receipt.status==='replaced'){result.value=receipt;message.value=receipt.status==='failed'?'Purchase failed. No SOULI was bought. Network fees may apply.':'Transaction replaced. No purchase confirmed here.'}
    else if(receipt.status==='confirming')message.value='Transaction found. Confirming…'
    else if(receipt.hash)message.value='You can close this window and return.'
    else message.value='Check your wallet before trying again.'
  }catch(e){if(!disposed)error.value=e.message}
  finally{polling.value=false}
}
function clearUnknown(){try{client.clearUnknown();recovery.value=null;message.value='';error.value='';reset()}catch(e){error.value=e.message}}
function keys(event){
  if(props.standalone)return
  if(event.key==='Escape'){emit('close');return}
  if(event.key!=='Tab')return
  const nodes=[...event.currentTarget.querySelectorAll('button:not(:disabled),input:not(:disabled),a[href],summary')].filter(n=>n.getClientRects().length)
  if(event.shiftKey&&document.activeElement===nodes[0]){event.preventDefault();nodes.at(-1)?.focus()}
  else if(!event.shiftKey&&document.activeElement===nodes.at(-1)){event.preventDefault();nodes[0]?.focus()}
}
watch(quantity,reset)
watch([account,()=>props.walletState?.chainId],()=>{readEpoch++;reset();info.value=null;refreshing.value=false;refresh();check()})
onMounted(async()=>{
  previousFocus=document.activeElement;if(!props.standalone)closeButton.value?.focus()
  if(!enabled)return
  try{
    const module=await import('./native-sale.mjs')
    let storage;try{storage=window.localStorage}catch{}
    if(config.chainId===8453){const transport=await import('../sale-admin/read-rpc.mjs');reader=transport.createAdminReader(config.chainId)}
    client=module.createNativeSaleClient(config,()=>props.getProvider?.(),{allowTest:import.meta.env.DEV,storage,quoteTtlSeconds:600,reader});ready.value=true
    recovery.value=client.pending();await refresh();await check()
  }catch(e){error.value=e.message}
  if(!disposed)timer=setInterval(()=>{clock.value=Date.now();if(!document.hidden&&recovery.value&&clock.value-lastPoll>5000)check();else if(!document.hidden&&!recovery.value&&!quote.value&&!busy.value&&!refreshing.value&&clock.value-lastStatePoll>30000)refresh()},1000)
})
onUnmounted(()=>{disposed=true;epoch++;readEpoch++;clearInterval(timer);reader?.destroy();previousFocus?.focus()})
</script>

<template>
  <div :class="standalone?'standalone-purchase':'modal-backdrop san-modal-backdrop'" @click.self="!standalone&&emit('close')" @keydown="keys">
    <section ref="dialog" class="san-dialog eth-sale" :class="{'compact-checkout':compact}" :role="standalone?'region':'dialog'" :aria-modal="standalone?undefined:true" aria-labelledby="get-souli-title">
      <header class="eth-sale-header">
        <div><span class="eth-sale-network"><i aria-hidden="true"></i> ETH ON {{networkLabel.toUpperCase()}}</span><component :is="compact?'h1':'h2'" ref="heading" id="get-souli-title" tabindex="-1">{{title}}</component></div>
        <button v-if="!standalone" ref="closeButton" class="san-dialog-close" aria-label="Close purchase" @click="emit('close')">×</button>
      </header>
      <p v-if="testMode" class="eth-sale-test">Test only · No real funds or SOULI are used.</p>
      <div v-if="enabled&&account" class="eth-sale-wallet" aria-label="Connected wallet"><span><b>{{short(account)}}</b> · {{correctChain?networkLabel:'Wrong network'}}</span><button type="button" :disabled="walletBusy" @click="disconnect">Disconnect</button></div>
      <ol v-if="!compact||!showPicker" class="eth-sale-steps" aria-label="Purchase steps"><li v-for="(step,i) in ['Choose','Review','Receive']" :key="step" :aria-current="currentStep===i+1?'step':undefined"><span>{{i+1}}</span>{{step}}</li></ol>
      <slot name="availability" />

      <template v-if="showPicker">
        <div class="eth-sale-picker">
        <div class="eth-sale-choice">
        <InscriptionExamples :level="selected.displayLevel" :compact="compact" />
        <fieldset class="eth-sale-levels" :disabled="busy"><legend>Starting level · minimum SOULI</legend><div class="eth-sale-level-grid">
          <button v-for="level in levels" :key="level.displayLevel" :data-level="level.displayLevel" type="button" :disabled="levelUnavailable(level)" :title="levelUnavailableReason(level)||undefined" :aria-pressed="selected.displayLevel===level.displayLevel&&!!wholeAmount(quantity)" :aria-label="'Level '+level.displayLevel+': '+number(level.minimum)+' SOULI minimum'+(levelUnavailable(level)?' — '+levelUnavailableReason(level):'')" @click="pick(level)">
            <span>Lv. {{level.displayLevel}}</span><img :src="level.url" alt=""/><strong>{{number(level.minimum)}}</strong><small v-if="compact&&levelUnavailable(level)">{{publicAvailability?'Not available':'Checking'}}</small>
          </button>
        </div></fieldset>
        <p class="eth-sale-sample-note">Already holding? Adding tokens may change your current soul.</p>
        </div>
        <form class="eth-sale-checkout" @submit.prevent="primary">
          <div class="eth-sale-label-row"><label for="eth-souli-quantity">Your amount</label></div>
          <div class="eth-sale-input"><input ref="quantityInput" id="eth-souli-quantity" v-model="quantity" :disabled="busy" type="text" inputmode="numeric" autocomplete="off" spellcheck="false" :aria-invalid="!!inputProblem" :aria-describedby="inputProblem?'eth-amount-error':undefined"/><span>SOULI</span></div>
          <p v-if="inputProblem" id="eth-amount-error" class="eth-sale-field-error" role="status">{{inputProblem}}</p>
          <div class="eth-sale-price"><span>You pay</span><strong :title="cost===null?undefined:ethAmount(cost)+' ETH'">{{cost===null?(enabled?'—':'Checkout closed'):(compact?'≈ '+estimatedEth(cost):ethAmount(cost))+' ETH'}}</strong></div>
          <p class="eth-sale-fee-note">{{enabled?(compact?'Rounded estimate + gas. Exact price at review.':'Network fee shown before you confirm.'):'Purchases are not open yet.'}}</p>
          <p v-if="info&&!info.open" class="eth-sale-field-error" role="status">{{info.paused?'Sale paused.':info.available===0n?'No stock available right now.':'Sale not open.'}}</p>
          <p v-if="enabled&&!testMode" class="eth-sale-essentials"><b>Tokens now. Game: Cooking.</b><span>No automatic refunds. Resale is not guaranteed.</span></p>
          <button type="submit" class="san-primary" :disabled="primaryDisabled">{{primaryLabel}}</button>
          <p v-if="compact" class="eth-sale-assurance">{{enabled?'Review first. Pay in your wallet.':'Explore the levels · No payment requested'}}</p>
        </form>
        </div>
        <p v-if="!compact" class="eth-sale-assurance">{{enabled?'Review the total before you pay.':'Explore the levels · No payment requested'}}</p>
        <button v-if="enabled&&account&&correctChain&&(!info?.open||shownError)" class="eth-sale-text-button" :disabled="refreshing" @click="refresh">Check availability again</button>
        <button v-if="!enabled" class="eth-sale-text-button" @click="emit('close')">Back to the world →</button>
      </template>

      <div v-if="quote" class="eth-sale-review">
        <button class="eth-sale-text-button eth-sale-back" :disabled="busy" @click="edit">← Edit amount</button>
        <div class="eth-sale-order"><img :src="selected.url" alt="Inscription example, not the guaranteed purchase result"/><div><span>YOU RECEIVE</span><strong>{{number(quote.quantity)}} SOULI</strong><small>Tokens, not this exact character. Your form may change.</small></div></div>
        <dl class="eth-sale-receipt"><div><dt>Token subtotal</dt><dd>{{ethAmount(quote.cost)}} ETH</dd></div><div><dt>Estimated network fee</dt><dd>~ {{estimatedEth(quote.feeWei)}} ETH</dd></div><div class="eth-sale-total"><dt>Estimated total</dt><dd>~ {{estimatedEth(BigInt(quote.cost)+BigInt(quote.feeWei))}} ETH</dd></div><div><dt>Your wallet on {{networkLabel}}</dt><dd><a v-if="addressLink(quote.account)" :href="addressLink(quote.account)" target="_blank" rel="noreferrer" :title="quote.account">{{short(quote.account)}} ↗</a><span v-else :title="quote.account">{{short(quote.account)}}</span></dd></div></dl>
        <p class="eth-sale-review-facts">Tokens after confirmation. Game in development.<br>No automatic refunds. Resale is not guaranteed.</p>
        <p v-if="config.terms?.version===2" class="eth-sale-fee-note">50% LP plan / 50% operations. Team managed. No LP yet.</p>
        <label class="eth-sale-consent"><input v-model="checked" :disabled="busy" type="checkbox"/><span>I reviewed the <a href="#eth-sale-details" @click.prevent="openTerms">sale details</a>, including the game’s current status. My SOULI’s form may change.</span></label>
        <button class="san-primary" :disabled="walletBusy||!checked||expired" @click="purchase">{{busy?'Confirm in MetaMask…':expired?'Quote expired':'Continue to MetaMask →'}}</button>
        <button v-if="expired" class="eth-sale-text-button" @click="review">Refresh quote</button>
        <p v-else class="eth-sale-assurance">Confirm payment in MetaMask · ETH on {{networkLabel}}</p>
      </div>

      <div v-if="recovery" class="eth-sale-recovery">
        <div class="eth-sale-progress-icon" aria-hidden="true">↗</div><strong>{{recovery.hash?'Purchase submitted':'Check your wallet'}}</strong><p>We’ll check this purchase before starting another.</p>
        <a v-if="recovery.hash&&explorer(recovery.hash)" :href="explorer(recovery.hash)" target="_blank" rel="noreferrer">View transaction ↗</a>
        <template v-if="needsConnection"><p>Reconnect to check your saved purchase. This does not send a new payment.</p><button class="san-primary" :disabled="walletBusy" @click="reconnect">{{walletBusy?'Connecting…':account?'Switch to '+networkLabel:'Reconnect MetaMask'}}</button></template>
        <button v-else-if="recovery.hash" class="san-primary" :disabled="polling" @click="check()">Check transaction</button>
        <p v-if="recovery.storageWarning" class="eth-sale-error">Transaction sent, but browser storage failed. Save this hash: {{recovery.hash}}</p>
        <details><summary>Need help with this transaction?</summary><p>Sped up or cancelled in your wallet? Paste the replacement transaction hash. If no hash appeared here, use the purchase hash from your wallet activity.</p><label for="replacement-hash">Transaction hash</label><input id="replacement-hash" v-model="replacementHash" class="eth-sale-hash" placeholder="0x…"/><button class="san-secondary" :disabled="needsConnection||polling||!/^0x[0-9a-fA-F]{64}$/.test(replacementHash)" @click="check(replacementHash)">Verify transaction</button><template v-if="!recovery.hash"><p>Only clear this request after checking that your wallet did not send it.</p><button class="san-secondary" :disabled="walletBusy" @click="clearUnknown">I checked: no transaction was sent</button></template></details>
      </div>
      <PurchaseReveal v-if="result?.status==='success'" :receipt="result" :chain-id="config.chainId" :connected-account="account" :back-label="compact?'View my SOULI →':undefined" @back="emit('close')"/>

      <details v-if="showPicker&&account&&correctChain&&config.chainId===8453" class="eth-sale-owned" :open="!compact"><summary>My SOULI · in this wallet</summary><MySouli :address="account"/></details>

      <p v-if="message" class="eth-sale-status" role="status">{{message}}</p><p v-if="shownError" id="eth-sale-error" class="eth-sale-error" role="alert">{{shownError}}</p>
      <div v-if="enabled&&account&&!quote" class="eth-sale-connected"><a v-if="addressLink(config.address)" :href="addressLink(config.address)" target="_blank" rel="noreferrer">Sale contract on {{networkLabel}} ↗</a></div>
      <details id="eth-sale-details" class="eth-sale-details"><summary>What is SOULI? · Sale details</summary>
        <h3>A token with a little soul.</h3><p>Your SOULI tokens form a seed. The contract turns it into a 24 × 24 character on Base. That character is your inscription. Adding SOULI can change its Dynamic form.</p>
        <p>ERC-20i means an ERC-20 token with native inscriptions. Your character is part of the token system, not a separate ERC-721 NFT.</p>
        <h3>Same level. Different souls.</h3><p>A level is based on one inscription’s seed amount. Within the same level, shapes, colors and effects can differ. These are real examples from the SOULI renderer, not characters you select or reserve. Previewing them never changes your order.</p>
        <p>Adding tokens to a Dynamic inscription changes its seed data and can change its look. It does not guarantee a separate new character each time. Some exact-seed transfers preserve the existing appearance as a Stable inscription. Your existing inscriptions and the transfer path matter.</p>
        <p>The artwork is generated from seed data on-chain. It is deterministic, not a promise of perfectly random, equally likely or unique results. Stable preservation has transfer conditions; simply sending any amount to another wallet does not guarantee it.</p>
        <p>Levels 1–5 here correspond to contract levels 0–4. New-soul minimums were read from Base at block {{levelSnapshot.block.toLocaleString('en-US')}}; the appearance examples were read at block {{exampleSnapshot.block.toLocaleString('en-US')}} with illustrative seed/extra inputs. No level increase or market price is guaranteed.</p>
        <a :href="'https://basescan.org/address/'+TOKEN" target="_blank" rel="noreferrer">Original SOULI contract ↗</a>
        <h3>Tokens now. A world in progress.</h3><p>The game is cooking. Original inscriptions can be viewed and shared today; the new 3D game is in development. Buying SOULI does not unlock a finished game or guarantee beta access, future features, rewards or a release date.</p>
        <p>No exchange listing, liquidity, resale price or return is guaranteed. LP funding is a manual operator plan, not a restriction enforced by the sale contract. Read the <a href="/whitepaper/#roadmap">current feature status</a> before buying.</p>
        <template v-if="config.terms?.version===2||(!enabled&&purchaseProfile==='commercial')"><h3>50% liquidity. 50% building.</h3><p>The first-sale policy allocates half of actual purchase ETH to manual LP, plus separate matching SOULI. Half funds project operations. The approved plan is to lock LP principal for one year after the first pool is created; no lock is in place yet. These are planned uses, not automatic deposits or on-chain withdrawal restrictions. <a href="/whitepaper/#funds">Follow the funds ↗</a></p></template>
        <template v-if="enabled&&ready">
          <h3>What you’re buying</h3><p>SOULI, delivered immediately for a fixed ETH price. Its USD value changes with ETH. No automatic LP deposit or post-purchase refund is included.</p>
          <p>Authorized managers can pause sales and recover unsold stock while paused. Only the fixed treasury can withdraw sale proceeds. Under the three-operator controller, any one registered wallet can collect those funds to itself; two approvals are not required. Price, treasury and sale limits cannot be changed. The controller’s operator list is fixed.</p>
          <dl><div><dt>Price per SOULI</dt><dd>{{ethAmount(config.terms.unitPriceWei)}} ETH</dd></div><div><dt>Wallet limit</dt><dd>{{number(config.terms.walletCap)}} SOULI</dd></div><div><dt>Sale cap</dt><dd>{{number(config.terms.saleCap)}} SOULI</dd></div><div><dt>Sale ends</dt><dd>{{saleEndLabel(config.terms.endsAt)}}</dd></div></dl>
          <p class="eth-sale-address">Sale: <a v-if="addressLink(config.address)" :href="addressLink(config.address)" target="_blank" rel="noreferrer">{{config.address}}</a><span v-else>{{config.address}}</span><br/>Proceeds wallet (treasury): {{config.terms.treasury}}<br/>Sale token: {{config.terms.token}}</p>
        </template>
        <p v-else>Checkout is closed. Read the <a href="/whitepaper/#funds">confirmed terms and receipts</a> while launch preparation continues.</p>
      </details>
    </section>
  </div>
</template>
