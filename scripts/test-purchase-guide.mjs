import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { wholeAmount, guideForAmount, amountProblem, ethAmount, estimatedEth } from '../src/lighthouse/purchase-guide.mjs'
const snapshot=JSON.parse(readFileSync(new URL('../src/lighthouse/purchase-levels.json',import.meta.url)))
const {levels}=snapshot
assert.equal(snapshot.chainId,8453)
assert.equal(snapshot.contract,'0xb43eA104c7ec75038Ac8EcA57107Eefc8B039aFF')
assert.deepEqual(levels.map(l=>l.minimum),['1','21000','150000','500000','2500000'],'Pinned deployed thresholds must not be replaced with source-fixture thresholds.')
for(const level of levels){
  assert.equal(level.displayLevel,level.contractLevel+1)
  assert.ok(BigInt(level.seed)>=BigInt(level.minimum));assert.equal(level.extra,'0')
  assert.equal(guideForAmount(levels,level.seed),level,'Curated inscription must belong to the advertised level without changing the minimum.')
  assert.equal(guideForAmount(levels,level.minimum),level)
  if(level.displayLevel>1){assert.equal(level.belowLevel,level.contractLevel-1);assert.equal(guideForAmount(levels,String(BigInt(level.minimum)-1n)).displayLevel,level.displayLevel-1)}
  assert.match(level.svg,/<svg/);assert.doesNotMatch(level.svg,/<script|foreignObject|onload=|javascript:/i)
}
for(const value of ['0','-1','1.5','1e5','21,000','','Infinity','9999999999999999']){assert.equal(wholeAmount(value),null);assert.equal(guideForAmount(levels,value),null);assert.match(amountProblem(value,null),/whole number/)}
assert.equal(wholeAmount(' 21000 '),21000n)
assert.equal(guideForAmount(levels,'210000000').displayLevel,5)
const info={available:2500000n,walletRemaining:1000000n}
assert.equal(amountProblem('150000',info),'');assert.match(amountProblem('2500000',info),/remaining limit is 1,000,000/)
assert.match(amountProblem('150000',{available:21000n,walletRemaining:1000000n}),/Only 21,000/)
assert.equal(ethAmount(1n),'0.000000000000000001')
assert.equal(ethAmount(21000n*1000000000000n),'0.021')
assert.equal(ethAmount(2500000n*1000000000000n),'2.5')
assert.equal(estimatedEth(1n),'0.00000001')
assert.equal(estimatedEth(87050182805000n),'0.00008706')
assert.equal(ethAmount(0n),'0')
console.log('PASS: deployed level boundaries, one-based labels, original samples, amount limits and exact ETH prices.')
