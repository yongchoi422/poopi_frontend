import { quotePurchase, parseUsdc } from './purchase.mjs'

// A session-only illustration, never a source for real sale or market data.
export const EXAMPLE_TARGETS = Object.freeze(['50000', '100000', '150000'])
export const EXAMPLE_LAUNCH = Object.freeze({ targetUsdc: '50000', targetUnits: 50_000_000_000n })
export const EXAMPLE_INVENTORY = Object.freeze(quotePurchase(EXAMPLE_LAUNCH.targetUsdc))
export function createLaunchPreview(targetUsdc = EXAMPLE_LAUNCH.targetUsdc) {
  if (!EXAMPLE_TARGETS.includes(targetUsdc)) throw new Error('Choose an available example target.')
  return { targetUsdc, targetUnits: parseUsdc(targetUsdc), phase: 'gathering', raised: 0n, escrow: 0n, liquidity: 0n, refunded: 0n }
}
export function fundLaunchPreview(state, units) {
  if (state.phase !== 'gathering') throw new Error('This example round is closed.')
  if (typeof units !== 'bigint' || units <= 0n) throw new Error('Use a positive amount in USDC base units.')
  const remaining = state.targetUnits - state.raised
  if (units > remaining) throw new Error('The example hard cap cannot be exceeded.')
  const raised = state.raised + units
  return { ...state, raised, escrow: state.escrow + units, phase: raised === state.targetUnits ? 'ready' : 'gathering' }
}
export function confirmLaunchPreview(state) {
  if (state.phase !== 'ready') throw new Error('The example target has not been reached.')
  return { ...state, phase: 'live', escrow: 0n, liquidity: state.escrow }
}
export function expireLaunchPreview(state) {
  if (state.phase !== 'gathering') throw new Error('Only an unfunded example round can expire here.')
  return { ...state, phase: 'refundable' }
}
export function refundLaunchPreview(state) {
  if (state.phase !== 'refundable') throw new Error('Example refunds are not open.')
  return { ...state, phase: 'refunded', escrow: 0n, refunded: state.escrow }
}
export function launchProgress(state) {
  return Number(state.raised * 10_000n / state.targetUnits) / 100
}
// Illustrative constant-product pool, no fees or other trades. Not a swap quote.
// For sells, tradeUsd is the token amount valued at the price BEFORE the sale.
export function poolPriceMove(reserveUsdc, tradeUsd, direction = 'buy') {
  if (![reserveUsdc, tradeUsd].every(Number.isFinite) || reserveUsdc <= 0 || tradeUsd <= 0 || !['buy', 'sell'].includes(direction)) throw new Error('Invalid pool example.')
  const ratio = 1 + tradeUsd / reserveUsdc
  return ((direction === 'buy' ? ratio ** 2 : 1 / ratio ** 2) - 1) * 100
}
export const LAUNCH_COPY = Object.freeze({
  gathering: { title: 'Little souls. One big beacon.', label: 'Gathering', line: 'Same price for every fren. Build the village together.' },
  ready: { title: 'Full squad. Ready to glow.', label: 'Target reached', line: 'The target is full. The pool still needs a confirmed launch.' },
  live: { title: 'GM, world. The beacon is awake.', label: 'Pool open', line: 'The village lights up. Trading prices can now move both ways.' },
  refundable: { title: 'Not this round, fren.', label: 'Refunds open', line: 'The example deadline passed below target. Contributions can be returned.' },
  refunded: { title: 'Funds back. Vibes intact.', label: 'Refunded', line: 'The example funds have been returned. The practice village stays open.' },
})
