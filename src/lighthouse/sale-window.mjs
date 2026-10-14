// V2 alone permits endsAt=0. Callers must validate the manifest/version first.
export const hasSaleEnded = (endsAt, chainTime) => BigInt(endsAt) !== 0n && BigInt(chainTime) >= BigInt(endsAt)
export function saleQuoteDeadline(chainTime, endsAt, ttlSeconds) {
  const deadline = chainTime + ttlSeconds
  return BigInt(endsAt) === 0n ? deadline : Math.min(deadline, Number(endsAt) - 1)
}
export function saleEndLabel(endsAt) {
  return BigInt(endsAt) === 0n ? 'Until sold out · no calendar deadline' : new Date(Number(endsAt) * 1000).toUTCString()
}
