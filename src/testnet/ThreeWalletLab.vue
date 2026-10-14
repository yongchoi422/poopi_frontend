<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import { formatEther, formatUnits } from 'ethers'
import bundle from './contracts.generated.json'
import published from './public-controller.json'
import { createControllerLab, readController, OPERATORS, TEST_TOKEN } from './three-wallet.mjs'
import { walletRequestMessage } from '../lighthouse/wallet-errors.mjs'
const props=defineProps({account:String,provider:Object,reader:Object,walletBusy:Boolean,selectedSale:String,purchasePending:Boolean})
const emit=defineEmits(['select-sale','connect','busy'])
const record=ref({receipts:[]}),view=ref(null),input=ref(''),amount=ref('210'),error=ref(''),notice=ref(''),busy=ref(false),recovery=ref('')
const loading=ref(true)
let lab,epoch=0,polling=false
const allowed=computed(()=>OPERATORS.some(x=>x.toLowerCase()===props.account?.toLowerCase()))
const locked=computed(()=>loading.value||props.walletBusy||busy.value||!!record.value.pending||!allowed.value)
watch(busy,value=>emit('busy',value),{flush:'sync'})
const explorer=(kind,value)=>`https://sepolia.basescan.org/${kind}/${value}`
const phoneUrl=computed(()=>`${location.origin}/testnet/?controller=${view.value?.address||published.address}#three-wallet`)
async function refresh(){
  if(!props.reader)return
  if(lab)record.value=lab.state()
  const address=record.value.controller||view.value?.address||new URL(location.href).searchParams.get('controller')||published.address
  const version=epoch
  if(!view.value)loading.value=true
  try{const result=await readController(props.reader,bundle.contracts,address);if(version===epoch)view.value=result}
  finally{if(version===epoch)loading.value=false}
}
async function act(task){if(busy.value||props.walletBusy)return;busy.value=true;error.value='';notice.value='';const version=epoch;try{await task();if(epoch===version)await refresh()}catch(e){if(epoch===version)error.value=walletRequestMessage(e)}finally{if(epoch===version)busy.value=false}}
function send(action){return act(async()=>{const current=lab;await current.send(action,amount.value);if(current===lab){record.value=current.state();notice.value='Request sent. Waiting for two confirmations.'}})}
async function load(){await act(async()=>{const current=lab;await current.load(input.value.trim());if(current===lab)await refresh()})}
async function recover(){await act(async()=>{const current=lab,result=await current.recover(recovery.value.trim());if(current===lab)notice.value=`Transaction ${result?.status}.`})}
watch(()=>[props.account,props.provider,props.reader],async()=>{
  epoch++;const version=epoch;loading.value=true;busy.value=false;lab=null;view.value=null;record.value={receipts:[]};error.value='';notice.value=''
  const address=new URL(location.href).searchParams.get('controller')||published.address
  if(!props.account||!props.provider){
    if(props.reader)try{const result=await readController(props.reader,bundle.contracts,address);if(epoch===version)view.value=result}catch(e){if(epoch===version)error.value=e.message}finally{if(epoch===version)loading.value=false}
    return
  }
  try{
    const current=createControllerLab(props.provider,props.reader,bundle.contracts,localStorage,props.account);lab=current
    record.value=current.state()
    if(!record.value.pending){input.value=address;await current.load(address)}
    if(epoch===version)await refresh()
  }catch(e){if(epoch===version)error.value=e.message}finally{if(epoch===version)loading.value=false}
},{immediate:true})
const timer=setInterval(async()=>{
  if(!lab||polling||document.hidden)return
  record.value=lab.state()
  if(busy.value||!record.value.pending?.hash)return
  polling=true;const current=lab,version=epoch
  try{const r=await current.recover();if(version===epoch){record.value=current.state();if(['confirmed','failed'].includes(r?.status)){error.value='';notice.value=`${r.action}: ${r.status}.`;await refresh()}}}catch(e){if(version===epoch)error.value=e.message}finally{polling=false}
},5000)
onUnmounted(()=>{epoch++;clearInterval(timer);emit('busy',false)})
</script>
<template>
  <section id="three-wallet" class="card three-wallet" aria-labelledby="three-wallet-title">
    <span class="step">CURRENT SHOP · THREE REGISTERED WALLETS</span><h2 id="three-wallet-title">Any one wallet can manage it.</h2>
    <p>This shop uses three registered operators. <b>One approval is enough.</b> It does not use Safe or a multisig. Any one compromised operator can withdraw the controlled funds.</p>
    <details><summary>Registered wallets & what they can do</summary><p v-for="(address,i) in OPERATORS" :key="address" class="address">Operator {{['A','B','C'][i]}}: {{address}}</p><p>Each operator can pause/resume, supply its own stock, recover unsold stock while paused, and collect ETH to itself. They cannot take tokens from a lost personal wallet. The operator list is fixed for this test; there is no replacement or upgrade function.</p><p>Sale → controller → calling registered wallet. This is manual custody, not an LP lock. Buyer tokens arrive immediately.</p></details>
    <template v-if="!account"><p class="message">Connect your registered wallet to manage this shop. On a phone, approve in MetaMask and return to this tab. Connecting does not request a payment.</p><button :disabled="walletBusy" @click="emit('connect')">Connect MetaMask</button></template>
    <p v-else-if="!allowed" class="message">This wallet can buy, but is not a registered operator.</p>
    <p v-if="error" class="message error" role="alert">{{error}}</p><p v-if="notice" class="message" role="status">{{notice}}</p>
    <template v-if="view">
      <div class="controller-links"><a :href="explorer('address',view.address)" target="_blank" rel="noreferrer">Controller ↗</a><a :href="explorer('address',view.sale.manifest.address)" target="_blank" rel="noreferrer">New sale ↗</a><a :href="explorer('token',TEST_TOKEN)" target="_blank" rel="noreferrer">tSOULI ↗</a></div>
      <div class="balance-row"><span>Sale status</span><b>{{view.sale.paused?'Paused':view.sale.chainTime>=Number(view.sale.endsAt)?'Ended':'Open'}}</b></div>
      <div class="balance-row"><span>Stock in this sale</span><b>{{formatUnits(view.sale.inventory,9)}} tSOULI</b></div>
      <div class="balance-row"><span>Sold / earned</span><b>{{String(view.sale.sold)}} / {{formatEther(view.sale.proceedsWei)}} test ETH</b></div>
      <div class="balance-row"><span>ETH still in this sale</span><b>{{formatEther(view.sale.saleEth)}} test ETH</b></div>
      <label for="controller-amount">Whole tSOULI to deposit or recover</label><input id="controller-amount" v-model="amount" inputmode="numeric" :disabled="locked">
      <div class="management-buttons"><button :disabled="locked" @click="send('approve')">1. Approve this amount</button><button :disabled="locked" @click="send('deposit')">2. Deposit stock</button><button :disabled="locked||!view.sale.paused||view.sale.available===0n" @click="send('start')">Start sale</button><button :disabled="locked||view.sale.paused" @click="send('pause')">Pause sale</button><button :disabled="locked||!view.sale.paused" @click="send('withdraw')">Return stock to my wallet</button><button :disabled="locked" @click="send('proceeds')">Collect test ETH to my wallet</button><button class="secondary" :disabled="busy||!!record.pending" @click="act(refresh)">Refresh</button></div>
      <p class="fine">Each button is a separate wallet request. No arbitrary payout address: stock and ETH return to the registered wallet making that request. Deposit approval is limited to the amount above.</p>
      <p v-if="selectedSale?.toLowerCase()===view.sale.manifest.address.toLowerCase()" class="success">✓ This shop is selected in the purchase form above.</p>
      <button v-else class="secondary" :disabled="!account||walletBusy||busy||!!record.pending||purchasePending" @click="emit('select-sale',view.sale.manifest.address)">Use this sale for the purchase form ↑</button>
      <div class="phone-link"><b>Open on your other device</b><a :href="phoneUrl" class="address">{{phoneUrl}}</a><small>Connect operator B or C to manage, or another wallet to buy. These are test assets only.</small></div>
      <details><summary>Recover tokens sent directly to the controller</summary><p>Returns held tSOULI to your registered wallet. It does not touch buyer wallets or sale inventory.</p><button :disabled="locked" @click="send('held')">Recover held test tokens</button></details>
    </template>
    <template v-else-if="published.address"><p class="fine" role="status">{{loading ? 'Reading the verified test shop…' : 'The test shop could not be loaded. Retry the read before continuing.'}}</p><button class="secondary" :disabled="loading||busy||walletBusy" @click="act(refresh)">Reload test shop</button></template>
    <template v-else><p class="fine">No new controller loaded. The existing single-wallet test shop above is separate. Create a new controller and sale together; no stock or ETH is moved by deployment.</p><button :disabled="locked||!account" @click="send('deploy')">Deploy three-wallet test shop</button></template>
    <div v-if="record.pending" class="review"><b>{{record.pending.action}} · {{record.pending.hash?'Waiting for chain confirmation':'Check MetaMask Activity'}}</b><a v-if="record.pending.hash" :href="explorer('tx',record.pending.hash)" target="_blank" rel="noreferrer">View transaction ↗</a><label for="controller-recover">Original transaction hash</label><input id="controller-recover" v-model="recovery" placeholder="0x…"><button :disabled="busy" @click="recover">Verify exact receipt</button><button v-if="!record.pending.hash" :disabled="busy" class="secondary" @click="act(async()=>{lab.clearUnsent();record=lab.state()})">I checked: nothing was sent</button></div>
    <details><summary>Load an existing three-wallet controller</summary><label for="controller-address">Base Sepolia controller address</label><input id="controller-address" v-model="input" placeholder="0x…"><button class="secondary" :disabled="busy||!!record.pending||!account" @click="load">Verify and load</button><p>Checks compiled code, all three operator addresses, test token and sale ownership. No wallet signature is requested for this read.</p></details>
    <details v-if="record.receipts?.length"><summary>Confirmed actions on this device</summary><p v-for="r in record.receipts" :key="r.hash"><a :href="explorer('tx',r.hash)" target="_blank" rel="noreferrer">{{r.action}} · {{r.status}} ↗</a></p></details>
  </section>
</template>
<style scoped>
.three-wallet{border:2px solid #2455ee;scroll-margin-top:20px;background:#f0f5ff}.three-wallet .step{color:#183aad}.controller-links{display:flex;flex-wrap:wrap;gap:20px;font-size:13px;margin:25px 0}.three-wallet>label{display:block;margin:22px 0 8px;font-size:13px;font-weight:750}.three-wallet>input{max-width:350px}.phone-link{margin:25px 0;padding:18px;background:#fff5c9;border-radius:14px;display:grid;gap:10px}.phone-link small{font-size:12px}.three-wallet .management-buttons{margin-bottom:20px}.review input{margin:12px 0}
</style>
