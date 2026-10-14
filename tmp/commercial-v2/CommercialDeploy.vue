<script setup>
import {ref,computed,onMounted,onUnmounted,watch} from 'vue'
import {BrowserProvider,formatEther} from 'ethers'
import {createAdminReader} from '../../src/sale-admin/read-rpc.mjs'
import {useWallet} from '../../src/lighthouse/use-wallet.mjs'
import {createDeploymentClient} from '../../src/sale-admin/deploy-client.mjs'
import WalletRelayStatus from '../../src/lighthouse/WalletRelayStatus.vue'
import review from './deployment-review.json'
import context from './deployment-context.json'
import artifacts from './artifacts.json'
const wallet=useWallet(8453),{account,relay}=wallet
const transport=createAdminReader(8453)
const reader=new BrowserProvider(transport,undefined,{cacheTimeout:-1})
const client=createDeploymentClient(review,artifacts,wallet.getProvider,reader,localStorage)
const busy=ref(false),error=ref(''),notice=ref(''),plan=ref(null),record=ref({pending:null,completed:null}),receiptHash=ref(''),cancelled=ref(false)
const expected=computed(()=>account.value.toLowerCase()===review.input.deployer.toLowerCase())
const eth=value=>formatEther(BigInt(value)),date=value=>new Date(Number(value)*1000).toLocaleString('en-GB',{timeZone:'Asia/Seoul',hour12:false})+' KST'
let timer,disposed=false
function refresh(){record.value=client.state()}
async function act(fn){if(busy.value)return;busy.value=true;error.value='';try{await fn()}catch(e){error.value=e.shortMessage||e.message}finally{busy.value=false;try{refresh()}catch(e){error.value=e.message}}}
function prepare(){return act(async()=>{plan.value=await client.prepare();notice.value='Review the terms below. No transaction sent.'})}
function send(){return act(async()=>{notice.value='Check MetaMask. Base mainnet contract deployment; gas only.';const id=await client.send(plan.value);plan.value=null;notice.value='Sent. Verifying both deployed contracts.';receiptHash.value=id})}
function recover(){return act(async()=>{const result=await client.recover(receiptHash.value.trim());notice.value=result?.status==='verified'?'Both contracts verified. Sale is still paused.':`Transaction ${result?.status||'pending'}.`})}
watch(account,()=>{plan.value=null})
onMounted(()=>{try{refresh()}catch(e){error.value=e.message};timer=setInterval(()=>{if(!disposed&&!busy.value&&record.value.pending?.hash)recover()},5000)})
onUnmounted(()=>{disposed=true;clearInterval(timer);reader.destroy();transport.destroy()})
</script>
<template>
 <header><a href="/">SOULI</a><span>LOCAL V2 DEPLOYMENT</span></header>
 <main>
  <p class="eyebrow">BASE MAINNET · REAL ASSETS</p><h1>Your new SOULI sale.</h1>
  <p class="intro">4.2M SOULI capacity. Deploy paused, then check with just 42 SOULI.</p>
  <section class="card wallet"><div><b>Deployment wallet A</b><code>{{review.input.deployer}}</code><span v-if="account" class="status">Connected: {{account}}</span></div><button v-if="!account" :disabled="wallet.busy.value||busy" @click="wallet.connect">Connect MetaMask</button><button v-else :disabled="wallet.busy.value||busy" @click="wallet.disconnect">Disconnect</button></section>
  <WalletRelayStatus :state="relay"/>
  <p v-if="wallet.error.value" role="alert" class="error">{{wallet.error.value}}</p><p v-if="account&&!expected" class="error">Select wallet A in MetaMask, then reconnect.</p>
  <section class="card"><h2>What this creates</h2><div class="stats"><div><small>Round maximum</small><strong>4,200,000 SOULI</strong></div><div><small>Per wallet</small><strong>4,200,000 SOULI</strong></div><div><small>Starts paused</small><strong>No stock moved</strong></div></div>
   <dl><div><dt>Token</dt><dd><a :href="'https://basescan.org/token/'+review.terms.token" target="_blank" rel="noreferrer">Original SOULI ↗</a><code>{{review.terms.token}}</code></dd></div><div><dt>Fixed price / SOULI</dt><dd>{{context.unitPriceEth}} ETH</dd></div><div><dt>Price reference</dt><dd>$15m FDV / 210m supply · ETH ${{context.priceReference.ethUsd}}<small>Coinbase spot, {{new Date(context.preparedAt).toLocaleString('en-GB',{timeZone:'Asia/Seoul',hour12:false})}} KST. USD value changes with ETH.</small></dd></div><div><dt>Sale window</dt><dd>From {{date(review.terms.startsAt)}}<br>No calendar end · lifetime cap applies<small>Requires a separate operator action to open.</small></dd></div><div><dt>Funds & control</dt><dd>A, B or C can act independently. 50% purchase ETH for manual LP + separate SOULI; 50% operations. This is a plan, not an on-chain spending restriction. No purchase refund. LP principal lock: 1 year planned, not deployed.</dd></div></dl>
   <details><summary>Addresses and verification</summary><p>Predicted addresses, not yet a place to send tokens.</p><b>Controller</b><code>{{review.controller}}</code><b>Sale</b><code>{{review.sale}}</code><b>Operators</b><code v-for="a in review.operators" :key="a">{{a}}</code><b>Terms hash</b><code>{{review.termsHash}}</code><p>Direct wallet deployment. Nonce: {{review.input.nonce}}. Contract code, terms and operators are checked after two confirmations. Local automated tests passed; no independent audit is claimed.</p></details>
  </section>
  <section class="card action">
   <template v-if="record.completed"><h2>{{record.completed.status==='verified'?'Contracts verified.':'Deployment failed.'}}</h2><p>{{record.completed.status==='verified'?'Stock deposit and opening are separate approvals. No purchase is open yet.':'Review the receipt before any new deployment.'}}</p><a :href="'https://basescan.org/tx/'+record.completed.hash" target="_blank" rel="noreferrer">View deployment receipt ↗</a><code>{{record.completed.controller}}</code></template>
   <template v-else-if="record.pending"><h2>Check the saved request.</h2><p>No duplicate deployment will be sent.</p><a v-if="record.pending.hash" :href="'https://basescan.org/tx/'+record.pending.hash" target="_blank" rel="noreferrer">View transaction ↗</a><label>Deployment transaction hash<input v-model="receiptHash" placeholder="0x…"></label><button :disabled="busy" @click="recover">Verify receipt</button><details v-if="!record.pending.hash"><summary>No transaction was sent?</summary><label><input v-model="cancelled" type="checkbox"> I cancelled the request in MetaMask and checked Activity.</label><button :disabled="busy||!cancelled" @click="act(()=>client.clearUnsent(cancelled))">Clear unsent request</button></details></template>
   <template v-else-if="plan"><h2>Ready for your wallet.</h2><p>Creates the controller and sale. <b>0 ETH payment, no token approval or transfer.</b> You pay network fees only.</p><div class="fee"><span>Estimated network fee</span><strong>{{eth(plan.estimatedFeeWei)}} ETH</strong><small>Includes an L1 data estimate. MetaMask shows the final fee.</small></div><button :disabled="busy||!expected" @click="send">Request deployment in MetaMask →</button><button class="secondary" :disabled="busy" @click="plan=null">Back</button></template>
   <template v-else><h2>First, review the deployment.</h2><p>Read-only checks verify the wallet, network, nonce, original token and estimated fees.</p><button :disabled="busy||!expected" @click="prepare">Review deployment →</button></template>
   <p v-if="notice" role="status">{{notice}}</p><p v-if="busy" aria-live="polite">{{record.pending?'Check MetaMask…':'Checking…'}}</p><p v-if="error" role="alert" class="error">{{error}}</p><p v-if="record.storageWarning" class="error">Save the transaction hash. Browser storage failed; do not send again.</p>
  </section>
 </main>
</template>
<style>
*{box-sizing:border-box}body{margin:0;background:#f7f9ff;color:#19284f;font:15px/1.6 system-ui,sans-serif}a{color:#2854dc}header{max-width:1040px;margin:auto;padding:26px 28px;display:flex;justify-content:space-between;align-items:center}header>a{font:bold 27px monospace;text-decoration:none;letter-spacing:5px}header>span,.eyebrow{font-size:11px;letter-spacing:1.8px;font-weight:750;color:#466298}main{max-width:870px;margin:10px auto 80px;padding:0 24px}h1{font-size:42px;line-height:1.12;margin:14px 0}h2{font-size:22px;margin:0 0 14px}.intro{font-size:18px;margin-bottom:28px}.card{background:white;border:1px solid #c4d0e7;border-radius:22px;margin:18px 0;padding:26px;box-shadow:0 6px 0 #dae4f4}button{background:#ffdf58;border:1px solid #caa51e;border-radius:12px;padding:13px 18px;font:750 14px system-ui;color:#1c2a50;box-shadow:0 4px #c7a747;cursor:pointer}button:active{transform:translateY(3px);box-shadow:0 1px #c7a747}button:disabled{opacity:.5;cursor:default}button:focus-visible{outline:3px solid #315de9;outline-offset:3px}.secondary{background:#ecf1ff;margin-left:14px;border-color:#afbfdf;box-shadow:0 4px #bfcee6}.wallet{display:flex;align-items:center;gap:22px;justify-content:space-between}.wallet>div{min-width:0}code{display:block;overflow-wrap:anywhere;font-size:12px;margin:7px 0}.status{font-size:11px;overflow-wrap:anywhere}.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.stats>div{background:#e4edff;border-radius:12px;padding:16px}small{display:block;color:#627492;font-size:12px}.stats strong{display:block;font-size:20px;margin-top:4px}dl{margin-bottom:0}dl>div{display:grid;grid-template-columns:160px 1fr;gap:18px;padding:16px 0;border-bottom:1px solid #e7ecf6}dt{font-size:13px;color:#5b6c8b}dd{margin:0;overflow-wrap:anywhere}details{margin-top:22px}summary{cursor:pointer;font-weight:650}details p{font-size:13px}.fee{background:#fff6cc;padding:18px;border-radius:12px;margin:20px 0}.fee strong{display:block;font-size:22px}.error{background:#fff0f0;border:1px solid #e7b3b3;padding:14px;border-radius:9px;overflow-wrap:anywhere}.action button{margin-top:10px}label{display:block;margin:18px 0}input:not([type=checkbox]){display:block;width:100%;padding:12px;border:1px solid #b4c5df;border-radius:8px;margin-top:8px}input[type=checkbox]{margin-right:8px}@media(max-width:600px){h1{font-size:32px}main{padding:0 16px}.card{padding:20px}.wallet{display:block}.wallet button{margin-top:15px}.stats{grid-template-columns:1fr}.stats>div{padding:12px}.stats strong{font-size:19px}dl>div{grid-template-columns:1fr;gap:5px}.fee strong{font-size:18px;overflow-wrap:anywhere}}
</style>
