<script setup>
import { onMounted, ref } from 'vue'
import BuySouli from './BuySouli.vue'
import { tinySoul } from './soul-art.js'
import './village.css'
import './purchase.css'
import './pixel-ui.css'
import './world.css'
import './sanctuary.css'
const manifest=ref(null),error=ref(''),open=ref(true),wallet=ref({address:'',chainId:'0x7a69'}),soul=tinySoul()
let accounts=[],id=0
const provider={async request({method,params=[]}){
  if(method==='eth_accounts')return wallet.value.address?[wallet.value.address]:[]
  const response=await fetch('/__sale-demo/rpc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:++id,method,params})})
  const data=await response.json();if(data.error)throw Object.assign(Error(data.error.message),{code:data.error.code});return data.result
}}
async function connect(){if(!accounts.length)accounts=await provider.request({method:'eth_accounts_test'});wallet.value={address:accounts[1],chainId:'0x7a69'}}
function disconnect(){wallet.value={address:'',chainId:'0x7a69'}}
onMounted(async()=>{try{const r=await fetch('/__sale-demo/config');if(!r.ok)throw Error('Start npm run demo --prefix contracts first.');manifest.value=await r.json()}catch(e){error.value=e.message}})
</script>
<template><main class="purchase-lab sanctuary-app"><p>LOCAL PURCHASE TEST · No real funds · Development only</p><p>The test wallet confirms automatically on a disposable local chain. It is not MetaMask.</p><button class="san-primary" @click="open=true">Open purchase</button><p v-if="error">{{error}}</p><BuySouli v-if="manifest&&open" :soul="soul" :wallet-state="wallet" :get-provider="()=>provider" :sale-config="manifest" @connect="connect" @disconnect="disconnect" @close="open=false"/></main></template>
<style>.purchase-lab{min-height:100vh;background:linear-gradient(135deg,#e5f1ff,#f2e9ff 65%,#ffedf2);padding:32px;color:#53627b;font:14px system-ui}body{margin:0}</style>
