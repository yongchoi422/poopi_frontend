import assert from 'node:assert/strict'
import { LAUNCH_PLAN, stockPlan } from '../src/lighthouse/launch-plan.mjs'
import { LIVE_SALE } from '../src/lighthouse/sale-config.mjs'
const UNIT=1000000000n,cap=LIVE_SALE.terms.saleCap
const view=(sold,inventory,walletTokens=998n)=>({sold,inventory:inventory*UNIT,walletTokens:walletTokens*UNIT})
assert.equal(BigInt(LAUNCH_PLAN.firstCumulativeStock)+BigInt(LAUNCH_PLAN.laterStock),BigInt(cap))
assert.deepEqual(stockPlan(view(1n,0n),cap),{committed:1n,room:4199999n,firstNeeded:1399999n,walletMaximum:998n})
assert.deepEqual(stockPlan(view(500000n,900000n),cap),{committed:1400000n,room:2800000n,firstNeeded:0n,walletMaximum:998n})
assert.equal(stockPlan(view(1400000n,0n),cap).room,2800000n,'Selling the first stock does not close the round')
assert.equal(stockPlan(view(1n,4199999n),cap).room,0n)
assert.equal(stockPlan(view(4200000n,0n),cap).room,0n,'Sellout does not reset after tokens leave')
assert.equal(stockPlan(view(1n,4200000n),cap).room,0n,'Unsolicited excess tokens do not create capacity')
assert.equal(stockPlan({...view(1n,0n),walletTokens:UNIT-1n},cap).walletMaximum,0n)
const price=BigInt(LIVE_SALE.terms.unitPriceWei)
assert.equal(BigInt(LAUNCH_PLAN.firstCumulativeStock)*price/2n,BigInt(LAUNCH_PLAN.firstMatchingLpStock)*price)
assert.equal(BigInt(cap)*price/2n,BigInt(LAUNCH_PLAN.fullMatchingLpStock)*price)
console.log('PASS: staged inventory, sold-plus-stock capacity, wallet balances, and continuing 50:50 arithmetic.')
