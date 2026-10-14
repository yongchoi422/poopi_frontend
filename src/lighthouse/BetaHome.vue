<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { betaApi } from './beta-api.mjs'
const props=defineProps({walletState:Object,current:Object,getProvider:Function})
const emit=defineEmits(['connect','switch-base','attach','detach'])
const status=ref(null),home=ref(props.current),session=ref(null),busy=ref(false),error=ref('')
let epoch=0, mounted=true
const short=a=>`${a.slice(0,6)}…${a.slice(-4)}`
const sameWallet=address=>props.walletState.address?.toLowerCase()===address.toLowerCase()&&props.walletState.chainId?.toLowerCase()==='0x2105'
async function run(action){if(busy.value)return;busy.value=true;error.value='';try{await action()}catch(e){if(mounted)error.value=e.code===4001?'Sign-in cancelled. No transaction was sent.':e.message||'Please try again.'}finally{if(mounted)busy.value=false}}
async function load(){const request=epoch,data=await betaApi('/world/auto',{});if(mounted&&request===epoch)home.value=data}
async function signIn(){await run(async()=>{
  const request=epoch,wallet=props.getProvider?.(),address=props.walletState.address
  if(!wallet||!address)throw Error('Connect MetaMask first.')
  if(!sameWallet(address))throw Error('Switch your wallet to Base first.')
  const current=()=>mounted&&request===epoch&&sameWallet(address)
  const challenge=await betaApi('/auth/challenge',{address})
  if(!current())throw Error('Wallet changed. Please sign in again.')
  const message=`0x${[...new TextEncoder().encode(challenge.message)].map(b=>b.toString(16).padStart(2,'0')).join('')}`
  const signature=await wallet.request({method:'personal_sign',params:[message,address]})
  const [accounts,chain]=await Promise.all([wallet.request({method:'eth_accounts'}),wallet.request({method:'eth_chainId'})])
  if(!current()||accounts[0]?.toLowerCase()!==address.toLowerCase()||chain.toLowerCase()!=='0x2105')throw Error('Wallet changed. Please sign in again.')
  const verified=await betaApi('/auth/verify',{id:challenge.id,signature})
  if(!current()){await betaApi('/auth/logout',{});throw Error('Sign-in interrupted. Please sign in again.')}
  session.value=verified
  await load();if(current()&&home.value)emit('attach',home.value)
})}
function useHome(){if(home.value)emit('attach',home.value)}
async function contribute(){await run(async()=>{const request=epoch,data=await betaApi('/world/contribute',{});if(mounted&&request===epoch){home.value=data;emit('attach',data)}})}
async function signOut(){await run(async()=>{await betaApi('/auth/logout',{});session.value=null;home.value=null;emit('detach')})}
watch([()=>props.walletState.address,()=>props.walletState.chainId],()=>{epoch++;if(session.value&&!sameWallet(session.value.address)){session.value=null;home.value=null;betaApi('/auth/logout',{}).catch(()=>{});emit('detach')}})
onMounted(()=>run(async()=>{
  const request=epoch
  status.value=await betaApi('/status')
  try{
    const existing=await betaApi('/auth/session')
    if(!mounted||request!==epoch)return
    if(!sameWallet(existing.address)){home.value=null;return}
    session.value=existing;await load()
  }catch(e){if(e.status!==401)throw e;session.value=null;home.value=null}
}))
onUnmounted(()=>{mounted=false;epoch++})
</script>
<template>
  <div class="san-beta-home">
    <p>A little town. Better together.</p>
    <p v-if="status" class="san-service-label">{{ status.mode==='local-development'?'Development service · running on this computer':'Private beta service' }} · purchases unavailable</p>
    <p v-if="error" class="san-error" role="alert">{{ error }}</p>
    <p v-if="walletState.error" class="san-error" role="alert">{{ walletState.error }}</p>
    <div v-if="!home" class="san-beta-welcome">
      <h3>Move in. Help automatically.</h3>
      <p>Own SOULI on Base? Sign in to join a town. Your solo save stays here.</p>
      <p><strong>Sign in. No payment.</strong> MetaMask EOA accounts supported.</p>
      <button v-if="!walletState.address" class="san-secondary" :disabled="busy||walletState.busy||!status" @click="emit('connect')">{{ walletState.busy?'Check wallet…':'Connect MetaMask' }} ↗</button>
      <button v-else-if="walletState.chainId.toLowerCase()!=='0x2105'" class="san-secondary" :disabled="busy||!status" @click="emit('switch-base')">Switch to Base ↗</button>
      <button v-else-if="session" class="san-secondary" :disabled="busy" @click="run(load)">Check my SOULI again ↗</button>
      <button v-else class="san-secondary" :disabled="busy||!status" @click="signIn">{{ busy?'Checking…':'Sign in & find my home' }} ↗</button>
    </div>
    <template v-else>
      <div class="san-beta-welcome"><span class="san-kind">VERIFIED WALLET</span><h3>{{ short(home.address) }} · your home</h3><p>Memories {{ home.home.memories }} · supplies {{ home.home.supplies }} · glowstones {{ home.home.glowstones }}</p><button class="san-primary" @click="useHome">Enter my saved home →</button></div>
      <div class="san-beta-project"><small>NEIGHBORHOOD {{ home.project.id.slice(0,6).toUpperCase() }}</small><h3>{{ home.project.name }}</h3><p>{{ home.project.members }} settled {{ home.project.members===1?'home':'homes' }} · up to 32 in this neighborhood. This is a membership count, not live attendance.</p><progress :value="home.project.supplies" :max="home.project.targetSupplies" aria-label="Shared garden supply progress"></progress><p>{{ home.project.supplies }} / {{ home.project.targetSupplies }} supplies · {{ home.project.glowstones }} / {{ home.project.targetGlowstones }} glowstones</p><button class="san-secondary" :disabled="busy||home.project.supplies>=home.project.targetSupplies" @click="contribute">{{ home.project.supplies>=home.project.targetSupplies?'Our garden is complete':'Help with 8 supplies + 4 glowstones' }}</button><p class="san-disclosure">Your contribution: {{ home.project.contribution.supplies }} supplies. Only server-earned game materials can be used. No SOULI is spent.</p></div>
    </template>
    <button v-if="session" class="san-secondary" :disabled="busy" @click="signOut">Sign out of saved home</button>
    <p class="san-disclosure">Private homes and a shared building project are separate. ETH storms: automatic shared help for up to 2 hours after a verified visit. Scenery visitors are sample artwork. Live avatars, chat and invitations are not connected.</p>
  </div>
</template>
