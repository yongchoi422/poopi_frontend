import assert from 'node:assert/strict'
import { discoverWallet } from '../src/lighthouse/wallet-provider.mjs'
const target=new EventTarget(),legacy={isMetaMask:true,request:async()=>[]},metamask={request:async()=>[]}
const announce=()=>target.dispatchEvent(new CustomEvent('eip6963:announceProvider',{detail:{info:{uuid:'test-wallet',rdns:'io.metamask'},provider:metamask}}))
target.addEventListener('eip6963:requestProvider',announce)
const discovery=discoverWallet(target,()=>legacy)
assert.equal(discovery.resolve(),metamask)
discovery.destroy();announce();assert.equal(discovery.resolve(),legacy)
const foreign={isMetaMask:true,request:async()=>[]}
const foreignTarget=new EventTarget()
foreignTarget.addEventListener('eip6963:requestProvider',()=>foreignTarget.dispatchEvent(new CustomEvent('eip6963:announceProvider',{detail:{info:{uuid:'other',rdns:'org.rabby'},provider:foreign}})))
const foreignDiscovery=discoverWallet(foreignTarget,()=>foreign)
assert.equal(foreignDiscovery.resolve(),null,'An announced other wallet must not be presented as MetaMask, even with a compatibility flag.')
foreignDiscovery.destroy()
for(const other of [{request:async()=>[]},{isMetaMask:true,isRabby:true,request:async()=>[]},{isMetaMask:true,isCoinbaseWallet:true,request:async()=>[]}]) {
  const d=discoverWallet(new EventTarget(),()=>other);assert.equal(d.resolve(),null);d.destroy()
}
const bundled=discoverWallet(new EventTarget(),()=>({providers:[{request:async()=>[]},legacy]}))
assert.equal(bundled.resolve(),legacy);bundled.destroy()
console.log('PASS: MetaMask-only discovery, supported legacy injection, foreign-provider exclusion, multi-injection selection and listener cleanup.')
