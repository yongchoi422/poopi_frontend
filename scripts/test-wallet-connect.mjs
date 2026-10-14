import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createWalletConnector, isWalletRelayLink } from '../src/lighthouse/wallet-connect.mjs'
import { createWalletSession } from '../src/lighthouse/wallet-session.mjs'
import { normalizeWalletError } from '../src/lighthouse/wallet-errors.mjs'

const A = '0x1111111111111111111111111111111111111111'
const memory = new Map(), states = [], requests = [], listeners = new Map()
const target = { location: { origin: 'https://souli.net', href: 'https://souli.net/testnet/#three-wallet' }, localStorage: { getItem: k => memory.get(k), setItem: (k,v) => memory.set(k,v) } }
let loads = 0, connects = 0, options, reject = false, sdkArgs
const provider = { request: async args => { requests.push(args); return args.method === 'eth_accounts' ? [A] : '0x14a34' }, on: (name, fn) => listeners.set(name,fn), removeListener: name => listeners.delete(name) }
const load = async () => {
  loads++
  return { createEVMClient: async config => {
    options = config
    return { getProvider: () => provider, disconnect: async () => {}, connect: async args => {
      connects++; sdkArgs = args
      options.mobile.preferredOpenLink('metamask://connect/mwp?p=example&c=1')
      if (reject) throw Object.assign(Error('Rejected'), { code: 4001 })
      return { accounts: [A], chainId: '0x14a34' }
    } }
  } }
}
const discovery = { resolve: () => null, destroy() {} }
const connector = createWalletConnector(target, { chainId: '0x14a34', discovery, load, onChange: state => states.push(state) })
assert.equal(await connector.resolve({silent:true}), null)
assert.equal(loads, 0, 'first page load must not initialize a relay or prompt')
const [remote, concurrent] = await Promise.all([connector.resolve(), connector.resolve()])
assert.equal(remote, concurrent); assert.equal(loads, 1); assert.equal(connects, 0)
assert.deepEqual(await remote.request({method:'eth_requestAccounts'}), [A])
assert.deepEqual(sdkArgs, {chainIds:['0x14a34']})
assert.equal(options.analytics.enabled, false)
assert.equal(options.ui.showInstallModal, false, 'mobile must use relay deeplinks, not force an install modal')
assert.equal(target.location.href, 'metamask://connect/mwp?p=example&c=1')
assert.deepEqual(states.at(-1), {busy:false, link:''})
const fn=()=>{}; remote.on('accountsChanged',fn); assert.equal(listeners.get('accountsChanged'),fn)
remote.removeListener('accountsChanged',fn); assert.equal(listeners.size,0)
const tx = {method:'eth_sendTransaction',params:[{from:A,to:A,value:'0x0'}]}
await remote.request(tx); assert.equal(requests.at(-1),tx,'transaction data must pass unchanged to the selected provider')
reject = true
await assert.rejects(remote.request({method:'eth_requestAccounts'}), {code:4001})
assert.deepEqual(states.at(-1), {busy:false,link:''}, 'rejection releases busy state')
connector.destroy()
assert.equal(await connector.resolve(),null)
await assert.rejects(remote.request(tx),/disconnected/i)

const restored = createWalletConnector(target,{discovery,load})
const before = connects
const restoredProvider = await restored.resolve({silent:true})
assert.deepEqual(await restoredProvider.request({method:'eth_accounts'}),[A])
assert.equal(connects,before,'a reload only restores permission already granted')
restored.destroy()
const direct = createWalletConnector(target,{discovery:{resolve:()=>provider,destroy(){}},load:()=>{throw Error('Must not load relay')}})
const directProvider = await direct.resolve()
await directProvider.request(tx); assert.equal(requests.at(-1),tx,'injected requests keep their original provider and exact payload'); direct.destroy()

// Clearing a session during async SDK initialization must not reconnect it.
let finish
const delayed = createWalletSession(() => new Promise(resolve => { finish = resolve }))
const pending = delayed.connect(); delayed.disconnect(); finish(provider); await pending
assert.equal(delayed.state.address,''); assert.equal(delayed.getProvider(),null)
assert.equal(listeners.size,0)
for (const bad of ['javascript:alert(1)','https://evil.example/connect','https://metamask.app.link.evil.example/connect','metamask://dapp/souli.net','https://link.metamask.io/dapp/souli.net','metamask://evil/mwp']) assert.equal(isWalletRelayLink(bad),false,bad)
assert.equal(isWalletRelayLink('metamask://connect/mwp?id=test'),true)
assert.equal(isWalletRelayLink('https://metamask.app.link/connect/mwp?p=test'),true)
const csp = JSON.parse(await readFile(new URL('../deploy/azure/staticwebapp.config.json',import.meta.url),'utf8')).globalHeaders['Content-Security-Policy']
assert.ok(csp.includes('wss://mm-sdk-relay.api.cx.metamask.io'))
assert.ok(!csp.includes('unsafe-eval'))
console.log('PASS: lazy MetaMask relay, same provider, Base Sepolia scope, silent restoration, rejection, async disconnect, deeplink allowlist and relay CSP.')

const deferred = () => { let resolve, reject; const promise = new Promise((yes,no)=>{resolve=yes;reject=no});return {promise,resolve,reject} }
function rig({ injected = false, brokenStorage = false, disconnectTimeoutMs = 8000 } = {}) {
  const values = new Map(), events = new Map(), calls = [], updates = []
  const browser = {location:{origin:'https://souli.net',href:'https://souli.net/testnet/'},
    localStorage:{getItem:k=>{if(brokenStorage)throw Error('storage blocked');return values.get(k)},setItem:(k,v)=>{if(brokenStorage)throw Error('storage blocked');values.set(k,v)}},
    addEventListener:(name,fn)=>events.set(name,fn),removeEventListener:name=>events.delete(name)}
  const r={browser,values,events,calls,updates,connectResult:{accounts:[A]},sendResult:'0xhash',revokeResult:true}
  const wallet={request:async args=>{calls.push(args);if(args.method==='eth_sendTransaction')return r.sendResult;if(args.method==='eth_accounts'||args.method==='eth_requestAccounts')return [A];if(args.method==='wallet_revokePermissions')return r.revokeResult;return '0x14a34'}}
  const sdk={getProvider:()=>wallet,connect:async args=>{calls.push({method:'sdk.connect',params:args});r.options.mobile.preferredOpenLink('metamask://connect/mwp?id=unit-test');return r.connectResult},disconnect:async()=>{calls.push({method:'sdk.disconnect'});return r.revokeResult}}
  r.connector=createWalletConnector(browser,{chainId:'0x14a34',disconnectTimeoutMs,discovery:{resolve:()=>injected?wallet:null,destroy(){}},load:async()=>({createEVMClient:async options=>{r.options=options;return sdk}}),onChange:s=>updates.push(s),onDisconnect:()=>{r.externalDisconnects=(r.externalDisconnects||0)+1}})
  return r
}

// Wrapped cancellations from client.connect must remain ordinary user choices.
const cancel=rig(), cancelProvider=await cancel.connector.resolve()
const cancelled=deferred(); cancel.connectResult=cancelled.promise
const cancelRequest=cancelProvider.request({method:'eth_requestAccounts'})
cancelled.reject({code:53,rpcCode:4001,message:'JSON RPC request failed'})
await assert.rejects(cancelRequest,{code:4001})
assert.equal(cancel.updates.at(-1).busy,false)
assert.equal(cancel.values.has('souli:metamask-relay:v1'),false)
assert.equal(normalizeWalletError(Error('User closed modal'),{connecting:true}).code,4001)
assert.notEqual(normalizeWalletError(Error('User closed modal')).code,4001,'payment recovery cannot depend on cancellation-like text')
assert.notEqual(normalizeWalletError({code:53,message:'Transport request timeout'}).code,4001)
cancel.connector.destroy()

// Connect and transactions share an interactive guard; background reads cannot clear it.
const serial=rig(), serialProvider=await serial.connector.resolve(), waitConnect=deferred()
serial.connectResult=waitConnect.promise
const firstConnect=serialProvider.request({method:'eth_requestAccounts'})
await assert.rejects(serialProvider.request({method:'eth_requestAccounts'}),{code:-32002})
await assert.rejects(serialProvider.request(tx),{code:-32002})
await serialProvider.request({method:'eth_accounts'})
assert.equal(serial.updates.at(-1).busy,true)
waitConnect.resolve({accounts:[A]}); await firstConnect
assert.equal(serial.calls.filter(x=>x.method==='sdk.connect').length,1)
const sent=deferred();serial.sendResult=sent.promise
const waitingHash=serialProvider.request(tx)
await serial.connector.disconnect()
sent.resolve('0xalready-sent');assert.equal(await waitingHash,'0xalready-sent','logout must not discard a late transaction hash')
await assert.rejects(serialProvider.request(tx),{code:4900})
assert.equal(await serial.connector.resolve({silent:true}),null)
serial.connectResult={accounts:[A]}
await serialProvider.request({method:'eth_requestAccounts'})
assert.equal(serial.calls.filter(x=>x.method==='sdk.connect').at(-1).params.forceRequest,true)
assert.equal(serial.calls.some(x=>x.method==='wallet_requestPermissions'),false,'relay reconnect must not show two account prompts')
serial.connector.destroy()

// In-memory logout still blocks silent restore and sends when storage is unavailable.
for(const injected of [false,true]) {
  const r=rig({injected,brokenStorage:true}),p=await r.connector.resolve()
  await p.request({method:'eth_requestAccounts'})
  await r.connector.disconnect()
  assert.equal(await r.connector.resolve({silent:true}),null)
  await assert.rejects(p.request(tx),{code:4900})
  await p.request({method:'eth_requestAccounts'})
  if(injected)assert.ok(r.calls.some(x=>x.method==='wallet_requestPermissions'))
  r.connector.destroy();assert.equal(r.events.size,0)
}

const late=rig(),lateProvider=await late.connector.resolve(),approval=deferred()
late.connectResult=approval.promise
const staleApproval=lateProvider.request({method:'eth_requestAccounts'})
await late.connector.disconnect();approval.resolve({accounts:[A]})
assert.deepEqual(await staleApproval,[])
assert.equal(await late.connector.resolve({silent:true}),null,'a late approval cannot restore a logged-out session')
late.connector.destroy()

const crossTab=rig(),crossProvider=await crossTab.connector.resolve()
crossTab.events.get('storage')({key:'souli:wallet-disconnected:v1',newValue:'1'})
assert.equal(crossTab.externalDisconnects,1)
await assert.rejects(crossProvider.request(tx),{code:4900})
crossTab.connector.destroy()

// If remote revocation stalls, local logout finishes; require reload to avoid a late
// revoke accidentally tearing down a new connection. Never auto-retry it.
const slow=rig({disconnectTimeoutMs:5});await slow.connector.resolve()
const revocation=deferred();slow.revokeResult=revocation.promise
assert.equal(await slow.connector.disconnect(),false)
await assert.rejects(slow.connector.resolve(),/Refresh this page/)
revocation.resolve();slow.connector.destroy()
console.log('PASS: SDK wrapped rejection, single interactive request, preserved late transaction hash, reconnect account chooser, unavailable storage, cross-tab logout and bounded revoke.')
