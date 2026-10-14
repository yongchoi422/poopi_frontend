<script setup>
import {ref,onMounted} from 'vue'
import BuySouli from '../../src/lighthouse/BuySouli.vue'
const config=ref(null),account=ref(''),wallet=ref({address:'',chainId:'0x7a69',busy:false}),mode=ref('normal'),connects=ref(0),sends=ref(0),closed=ref(false)
const provider={async request({method,params=[]}){
 if(method==='eth_accounts')return wallet.value.address?[wallet.value.address]:[]
 if(method==='eth_chainId')return wallet.value.chainId
 if(mode.value==='poor'&&method==='eth_getBalance')return '0x0'
 if(mode.value==='pending'&&method==='eth_getTransactionReceipt')return null
 if(method==='eth_sendTransaction'){
   if(mode.value==='reject')throw Object.assign(Error('Rejected'),{code:4001})
   sends.value++
 }
 const response=await fetch('/__checkout/rpc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({method,params})})
 const body=await response.json();if(body.error)throw Object.assign(Error(body.error.message),{code:body.error.code});return body.result
}}
function connect(){connects.value++;wallet.value={address:account.value,chainId:'0x7a69',busy:false}}
function disconnect(){wallet.value={address:'',chainId:'',busy:false}}
onMounted(async()=>{const value=await(await fetch('/__checkout/config')).json();config.value=value.sale;account.value=value.account})
</script>
<template><div class="buy-page"><header class="buy-header"><b>LOCAL UI CHECK · NO REAL ASSETS</b></header><aside style="padding:12px"><label>Scenario <select v-model="mode"><option value="normal">Normal</option><option value="poor">Insufficient ETH</option><option value="reject">Reject payment</option><option value="pending">Hold receipt</option></select></label><button @click="disconnect">Simulate lost connection</button><button @click="wallet={address:account,chainId:'0x1',busy:false}">Simulate wrong network</button><p>Connections {{connects}} · Payments sent {{sends}}</p></aside><main><BuySouli v-if="config&&!closed" standalone compact :sale-config="config" :wallet-state="wallet" :get-provider="()=>provider" @connect="connect" @switch-base="connect" @disconnect="disconnect" @close="closed=true"/><p v-if="closed">Exit complete.</p></main></div></template>
