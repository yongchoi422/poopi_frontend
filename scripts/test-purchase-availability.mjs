import assert from 'node:assert/strict'
import { purchaseAvailability } from '../src/buy/purchase-availability.mjs'
import { amountProblem } from '../src/lighthouse/purchase-guide.mjs'
const now = 100000, walletCap = '4200000'
const snapshot = { checkedAt: now, available: 1399999n, status: 'Open', paused: false }
const read = overrides => purchaseAvailability({ snapshot, required: true, walletCap, now, ...overrides })
assert.equal(read().limit, 1399999n, 'Disconnected buyers use actual stock, not the 4.2M cap')
assert.equal(read().blocked, false)
assert.match(amountProblem('2500000', read().info), /Only 1,399,999/)
assert.equal(amountProblem('500000', read().info), '')
for (const stale of [null, { ...snapshot, checkedAt: now - 60001 }, { ...snapshot, checkedAt: now + 1 }, { ...snapshot, checkedAt: NaN }]) {
  const result = read({ snapshot: stale })
  assert.equal(result.limit, 0n); assert.equal(result.blocked, true)
  assert.equal(result.info, null, 'A failed or stale read is not a confirmed zero-stock reading')
}
assert.equal(read({ now: now + 60000 }).blocked, false)
assert.equal(read({ snapshot: { ...snapshot, paused: true, status: 'Paused' } }).message, 'Sale paused')
assert.equal(read({ snapshot: { ...snapshot, available: 0n } }).blocked, true)
const wallet = { open: true, available: 1200000n, walletRemaining: 700000n }
assert.equal(read({ wallet }).limit, 700000n)
assert.equal(read({ wallet: { ...wallet, walletRemaining: 4200000n } }).limit, 1200000n)
assert.equal(read({ wallet: { ...wallet, available: 3000000n } }).limit, 700000n)
assert.equal(read({ wallet: { ...wallet, paused: true, open: false } }).blocked, true)
assert.equal(read({ snapshot: { ...snapshot, available: 3000000n } }).limit, 3000000n, 'A newly verified restock re-enables the larger level')
assert.equal(read({ snapshot: null, required: false, wallet }).limit, 700000n, 'Existing pilot/modal wallet limits remain enforced')
console.log('PASS: disconnected stock, limits, paused/empty/error/stale reads and verified restocking.')
