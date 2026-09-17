import assert from 'node:assert/strict'
import { PURCHASE, parseUsdc, quotePurchase, formatUnits, readPurchaseWallet, findInjectedWallet, walletError } from '../src/lighthouse/purchase.mjs'
import { createLaunchPreview, fundLaunchPreview, confirmLaunchPreview, expireLaunchPreview, refundLaunchPreview, launchProgress, EXAMPLE_LAUNCH, EXAMPLE_INVENTORY, EXAMPLE_TARGETS, poolPriceMove } from '../src/lighthouse/launch.mjs'

assert.equal(PURCHASE.saleContract, null)
assert.equal(parseUsdc(' 100.000001 '), 100_000_001n)
assert.equal(quotePurchase('100').soulUnits, 1_400_000_000_000n)
assert.equal(quotePurchase('0.000001').soulUnits, 14_000n)
assert.equal(quotePurchase('123456.123456').soulUnits, 1_728_385_728_384_000n)
assert.equal(formatUnits(quotePurchase('123456.123456').soulUnits, 9), '1,728,385.728384')
assert.equal(quotePurchase('7500000').requiredSoulUnits, 210_000_000_000_000_000n)
assert.throws(() => quotePurchase('7500000.000001'), /total supply/)
for (const input of ['0', '-1', 'NaN', 'Infinity', '1e6', '1,000', '1.1234567', '', '.5', '100.', '0x10']) assert.throws(() => parseUsdc(input), undefined, input)
assert.equal(EXAMPLE_INVENTORY.soulUnits, 700_000_000_000_000n)
assert.equal(EXAMPLE_INVENTORY.requiredSoulUnits, 1_400_000_000_000_000n)
assert.ok(Math.abs(poolPriceMove(50_000, 1000) - 4.04) < 1e-10)
assert.ok(Math.abs(poolPriceMove(50_000, 5000) - 21) < 1e-10)
assert.ok(Math.abs(poolPriceMove(50_000, 5000, 'sell') + 17.35537190082645) < 1e-10)
assert.throws(() => poolPriceMove(0, 1000))
assert.throws(() => createLaunchPreview('invalid'))
for (const target of EXAMPLE_TARGETS) {
  const start = createLaunchPreview(target)
  const complete = fundLaunchPreview(start, start.targetUnits)
  assert.equal(complete.phase, 'ready'); assert.equal(launchProgress(complete), 100)
  assert.equal(confirmLaunchPreview(complete).liquidity, BigInt(target) * 1_000_000n)
}

const calls = [], address = '0x1234567890123456789012345678901234567890'
const provider = { request: async call => {
  calls.push(call)
  if (call.method === 'eth_chainId') return '0x2105'
  if (call.method === 'eth_blockNumber') return '0x1234'
  if (call.method === 'eth_call') return call.params[0].to === PURCHASE.usdc ? '0x5f5e100' : '0x1462e6f4000'
  throw Error('Unexpected wallet method')
} }
const read = await readPurchaseWallet(provider, address)
assert.equal(read.usdcUnits, 100_000_000n)
assert.equal(read.soulUnits, 1_400_938_381_312n)
assert.deepEqual(calls.map(c => c.method), ['eth_chainId', 'eth_blockNumber', 'eth_call', 'eth_call'])
for (const call of calls.filter(c => c.method === 'eth_call')) {
  assert.equal(call.params[1], '0x1234', 'balances must use the same block')
  assert.equal(call.params[0].data, `0x70a08231${address.slice(2).padStart(64, '0')}`)
}
const wrongNetworkCalls = []
assert.deepEqual(await readPurchaseWallet({ request: async c => { wrongNetworkCalls.push(c.method); return '0x1' } }, address), { chainId: '0x1', usdcUnits: null, soulUnits: null })
assert.deepEqual(wrongNetworkCalls, ['eth_chainId'])
await assert.rejects(() => readPurchaseWallet(provider, 'invalid'), /Invalid wallet/)
const metamask = { isMetaMask: true, request() {} }, other = { request() {} }
assert.equal(findInjectedWallet({ providers: [other, metamask] }), metamask)
assert.equal(findInjectedWallet(null), null)
assert.match(walletError({ code: 4001 }), /cancelled/)

let state = createLaunchPreview()
const conserved = s => assert.equal(s.raised, s.escrow + s.liquidity + s.refunded)
assert.throws(() => confirmLaunchPreview(state), /not been reached/)
assert.throws(() => fundLaunchPreview(state, 0n), /positive/)
assert.throws(() => fundLaunchPreview(state, EXAMPLE_LAUNCH.targetUnits + 1n), /hard cap/)
for (let n = 1; n <= 4; n++) {
  state = fundLaunchPreview(state, EXAMPLE_LAUNCH.targetUnits / 4n)
  assert.equal(launchProgress(state), n * 25); conserved(state)
}
assert.equal(state.phase, 'ready')
assert.equal(state.liquidity, 0n, 'hitting target must not pretend the pool is live')
assert.throws(() => fundLaunchPreview(state, 1n), /closed/)
state = confirmLaunchPreview(state)
assert.equal(state.phase, 'live'); assert.equal(state.escrow, 0n); conserved(state)
assert.throws(() => confirmLaunchPreview(state), /not been reached/)
assert.throws(() => expireLaunchPreview(state), /unfunded/)
assert.throws(() => refundLaunchPreview(state), /not open/)
state = fundLaunchPreview(createLaunchPreview(), 15_000_000_000n)
state = expireLaunchPreview(state)
assert.throws(() => fundLaunchPreview(state, 1n), /closed/)
assert.equal(state.phase, 'refundable'); conserved(state)
state = refundLaunchPreview(state)
assert.equal(state.refunded, 15_000_000_000n); assert.equal(state.liquidity, 0n); conserved(state)
assert.throws(() => refundLaunchPreview(state), /not open/, 'no double refund')
console.log('PASS: exact 9/6-decimal quotes, matching inventory, read-only wallet adapter, launch cap/confirmation/refund conservation.')
