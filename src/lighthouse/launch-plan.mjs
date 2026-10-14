// Inventory planning only. These targets do not change the deployed 4.2M cap.
export const LAUNCH_PLAN = Object.freeze({
  firstCumulativeStock: '1400000', laterStock: '2800000',
  firstMatchingLpStock: '700000', fullMatchingLpStock: '2100000',
  referenceGrossUsd: 100000, lpBps: 5000, operationsBps: 5000,
  lpTiming: 'Not announced', lpLockDays: 365,
})
const UNIT = 1000000000n
export function stockPlan(view, cap, firstTarget = LAUNCH_PLAN.firstCumulativeStock) {
  const sold = BigInt(view.sold), inventory = BigInt(view.inventory) / UNIT
  const limit = BigInt(cap), target = BigInt(firstTarget) < limit ? BigInt(firstTarget) : limit
  const committed = sold + inventory
  const room = committed < limit ? limit - committed : 0n
  return Object.freeze({
    committed, room, firstNeeded: committed < target ? target - committed : 0n,
    walletMaximum: BigInt(view.walletTokens) / UNIT < room ? BigInt(view.walletTokens) / UNIT : room,
  })
}
