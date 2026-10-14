import assert from 'node:assert/strict'
import { LIVE_SALE } from '../src/lighthouse/sale-config.mjs'
import { MAINNET_ADMIN } from '../src/sale-admin/config.mjs'
import { PILOT_SALE, PILOT_V2_SALE, saleProfile } from '../src/lighthouse/sale-profile.mjs'
import { validateSaleConfig } from '../src/lighthouse/native-sale.mjs'
assert.equal(LIVE_SALE.enabled,true);assert.equal(MAINNET_ADMIN.enabled,true)
assert.equal(saleProfile(),LIVE_SALE)
assert.equal(saleProfile('commercial',{override:PILOT_SALE}),LIVE_SALE)
assert.equal(saleProfile('pilot',{override:{enabled:false}}),PILOT_SALE)
assert.throws(()=>saleProfile('?sale=0x123'),/Unknown/)
const pilot=validateSaleConfig(saleProfile('pilot'))
assert.equal(pilot.chainId,8453);assert.equal(pilot.mode,'live')
assert.equal(pilot.address,'0x83bcB8Ba9b7518CDEc32f2eE0e684f1d7b4ffB01')
assert.equal(pilot.terms.saleCap,'42');assert.equal(pilot.terms.walletCap,'10')
assert.equal(pilot.termsHash,'0x399da7420e0268fa14fdb881f1a794ff2bb8cfb7a79663f61890fc6f085abd06')
assert.throws(()=>{PILOT_SALE.terms.walletCap='100'})
const v2=validateSaleConfig(saleProfile('pilot-v2',{development:true,override:PILOT_SALE}))
assert.equal(saleProfile('pilot-v2',{override:PILOT_SALE}),PILOT_V2_SALE)
assert.equal(v2.address,'0x9B3b5BFbc22821416e390E10e0a30C1AC1960B68')
assert.equal(v2.chainId,8453);assert.equal(v2.terms.version,2)
assert.equal(v2.runtimeCodeHash,'0x47b723194326895edd71978a04ea7666a9ece28bd0562aa5fd85553170359b1e')
assert.equal(v2.termsHash,'0xe44473908cc3fce7d26ca0f93c22e9dd7731704d790b08e3003b7096d7cd7c1a')
assert.equal(v2.terms.unitPriceWei,'26666033792798')
assert.equal(v2.terms.saleCap,'4200000');assert.equal(v2.terms.walletCap,'4200000')
assert.equal(v2.terms.endsAt,'0');assert.equal(v2.terms.useOfProceeds.enforcedOnChain,false)
assert.throws(()=>{PILOT_V2_SALE.terms.unitPriceWei='1'})
assert.throws(()=>{PILOT_V2_SALE.terms.useOfProceeds.lpBps=10000})
console.log('PASS: fixed V1/V2 mainnet purchase profiles; overrides rejected; commercial V2 configured; on-chain opening remains a separate action.')

assert.deepEqual(LIVE_SALE,PILOT_V2_SALE);assert.deepEqual(MAINNET_ADMIN.sale,LIVE_SALE)
assert.throws(()=>{MAINNET_ADMIN.operators[0]=PILOT_SALE.address})
assert.throws(()=>{MAINNET_ADMIN.sale.terms.unitPriceWei='1'})
