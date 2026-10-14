import assert from 'node:assert/strict'
import { validateSaleConfig } from '../src/lighthouse/native-sale.mjs'
import { validateAdminConfig } from '../src/sale-admin/client.mjs'

function checkIdentity({ live, admin, reviewedAdmin, proof, latest, now = Date.now() }) {
  assert.equal(live.enabled, true)
  validateSaleConfig(live); validateAdminConfig(admin)
  assert.deepEqual(admin, reviewedAdmin, 'Production admin must match the verified deployment')
  assert.deepEqual(live, admin.sale, 'Purchase and management must use the same sale')
  assert.equal(live.address, '0x9B3b5BFbc22821416e390E10e0a30C1AC1960B68')
  assert.equal(proof.sale, live.address); assert.equal(proof.termsHash, live.termsHash)
  assert.deepEqual(proof.terms, live.terms)
  const age = now - Date.parse(latest.checkedAt)
  assert.ok(Number.isFinite(age) && age >= 0 && age < 900000, 'Refresh verified chain state within 15 minutes')
  assert.equal(latest.sale, live.address); assert.equal(latest.controller, admin.controller)
  assert.equal(latest.publicTransactionsSent, 0)
  assert.equal(proof.paused, true); assert.equal(proof.commercialCheckoutOpen, false)
  assert.equal(proof.lpCreated, false); assert.equal(proof.lpLocked, false)
  assert.equal(proof.independentAuditPublished, false)
}

// Preserve the original preparation gate for its historic, closed release.
export function checkPreparedLaunch(input) {
  checkIdentity(input)
  const {latest,proof}=input
  assert.equal(latest.state.paused, true, 'This preparation release requires a paused sale')
  for (const key of ['inventory', 'available', 'saleEth', 'controllerEth']) assert.equal(latest.state[key], '0')
  assert.equal(latest.state.sold, '1')
  assert.equal(proof.block, latest.state.block)
  return true
}

export const OPENING_RECEIPTS = Object.freeze([
  '0x4851d7a3115b063690cd7fe83585e199d9c51075a38d224fc5a897538d793b4b',
  '0xf2ab4fc10766d0adb36fb4877736f0bb3854711042dfdeb26be18dd61418822d',
  '0xaeb5ea4fdbab5f5f39778e32c6b4cbe02aa274105e466a3244c7ab2d3fc2ba8b',
])

// A signed opening is historical evidence, never a promise of current availability.
// The builder re-verifies these receipts on chain, then reads fresh current state.
// Subsequent purchases, pauses and authorized restocking must not reuse old balances.
export function checkOpenedLaunch(input) {
  checkIdentity(input)
  const {opening,latest,live,admin,proof}=input
  assert.equal(opening.schema,1);assert.equal(opening.confirmed,true)
  assert.equal(opening.chainId,8453);assert.equal(opening.sale,live.address)
  assert.equal(opening.controller,admin.controller);assert.equal(opening.termsHash,live.termsHash)
  assert.equal(opening.initialStock,'1399999');assert.equal(opening.previouslySold,'1')
  assert.equal(opening.roundCap,live.terms.saleCap)
  assert.equal(opening.openedAt,'2026-10-04T05:29:41.000Z');assert.equal(opening.block,52151217)
  assert.deepEqual(opening.receipts.map(r=>r.hash),OPENING_RECEIPTS)
  assert.deepEqual(opening.receipts.map(r=>r.action),['approve','deposit','start'])
  assert.deepEqual(opening.receipts.map(r=>r.block),[52150965,52151070,52151217])
  assert.ok(proof.block<opening.receipts[0].block && latest.state.block>=opening.block)
  const s=latest.state,cap=BigInt(live.terms.saleCap),sold=BigInt(s.sold),inventory=BigInt(s.inventory)
  assert.ok(sold>=1n && sold<=cap && inventory>=0n)
  const available=inventory/1000000000n<cap-sold ? inventory/1000000000n : cap-sold
  assert.equal(BigInt(s.available),available)
  assert.equal(BigInt(s.remainingToFund),cap-sold-inventory/1000000000n)
  assert.ok(BigInt(s.remainingToFund)>=0n)
  assert.equal(BigInt(s.proceedsWei),sold*BigInt(live.terms.unitPriceWei))
  for(const key of ['saleEth','controllerEth','heldTokens','allowance','walletTokens']) assert.ok(BigInt(s[key])>=0n)
  assert.equal(typeof s.paused,'boolean')
  assert.equal(s.status,sold===cap?'Sold out':s.paused?'Paused':available===0n?'Out of stock':'Open')
  return true
}
