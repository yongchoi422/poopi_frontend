import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {checkPreparedLaunch,checkOpenedLaunch} from './launch-release-gate.mjs'
import {LIVE_SALE} from '../src/lighthouse/sale-config.mjs'
import {MAINNET_ADMIN} from '../src/sale-admin/config.mjs'
const read=p=>JSON.parse(readFileSync(p,'utf8'))
const proof=read('src/site/commercial-proof.json')
const latest={checkedAt:proof.checkedAt,sale:proof.sale,controller:proof.controller,publicTransactionsSent:0,state:{block:proof.block,paused:true,inventory:'0',available:'0',sold:'1',saleEth:'0',controllerEth:'0'}}
const input={live:LIVE_SALE,admin:MAINNET_ADMIN,reviewedAdmin:read('tmp/commercial-v2/verified-admin.json'),proof,latest,now:Date.parse(proof.checkedAt)+1000}
assert.equal(checkPreparedLaunch(input),true)
for(const mutate of [
 x=>x.latest.state.paused=false,
 x=>x.latest.state.inventory='1000000000',
 x=>x.latest.state.saleEth='1',
 x=>x.now+=900000,
 x=>x.now=Date.parse(x.latest.checkedAt)-1,
 x=>x.proof.block++,
 x=>x.proof.lpLocked=true,
 x=>x.admin.operators.reverse(),
 x=>x.live.address='0x83bcB8Ba9b7518CDEc32f2eE0e684f1d7b4ffB01',
]){const x=structuredClone(input);mutate(x);assert.throws(()=>checkPreparedLaunch(x))}
console.log('PASS: launch release rejects stale, mismatched, funded/open or falsely claimed evidence.')
const opening=read('src/site/sale-opening.json')
const opened=structuredClone(input)
opened.opening=opening
opened.latest.checkedAt='2026-10-04T05:30:00.000Z'
opened.now=Date.parse(opened.latest.checkedAt)+1000
opened.latest.state={block:52151222,paused:false,status:'Open',inventory:'1399999000000000',available:'1399999',sold:'1',proceedsWei:'26666033792798',saleEth:'0',controllerEth:'0',heldTokens:'0',walletTokens:'0',allowance:'0',remainingToFund:'2800000'}
assert.equal(checkOpenedLaunch(opened),true)
for(const mutate of [
 x=>x.opening.confirmed=false,
 x=>x.opening.receipts[1].hash='0x'+'0'.repeat(64),
 x=>x.opening.receipts[1].block++,
 x=>x.opening.initialStock='1400000',
 x=>x.opening.sale='0x83bcB8Ba9b7518CDEc32f2eE0e684f1d7b4ffB01',
 x=>x.latest.state.block=52150900,
 x=>x.latest.state.available='1400000',
 x=>x.latest.state.remainingToFund='4200000',
 x=>x.latest.state.proceedsWei='0',
 x=>x.latest.state.status='Paused',
 x=>x.now+=900000,
 x=>x.proof.lpLocked=true,
 x=>x.admin.operators.reverse(),
]){const x=structuredClone(opened);mutate(x);assert.throws(()=>checkOpenedLaunch(x))}
// Later purchases and a maintenance pause must still report fresh balances.
const later=structuredClone(opened)
Object.assign(later.latest.state,{inventory:'1399998000000000',available:'1399998',sold:'2',proceedsWei:'53332067585596',saleEth:'26666033792798'})
assert.equal(checkOpenedLaunch(later),true)
later.latest.state.paused=true;later.latest.state.status='Paused'
assert.equal(checkOpenedLaunch(later),true)
console.log('PASS: published opening requires exact signed receipts, fresh coherent state and honest historical claims.')
