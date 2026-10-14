// Planning only. This module cannot modify a sale manifest or send a transaction.
const SUPPLY = 210000000n, FDV = 15000000n, WEI = 10n ** 18n
const SALE = 700000n, LP = 700000n
export function planLaunchPrice(ethUsd) {
  if (typeof ethUsd !== 'string' || !/^(?:0|[1-9]\d{0,8})(?:\.\d{1,8})?$/.test(ethUsd)) throw Error('Use a positive ETH/USD decimal, up to eight decimal places.')
  const [whole, fractional = ''] = ethUsd.split('.'), scale = 10n ** BigInt(fractional.length)
  const rate = BigInt(whole + fractional)
  if (rate === 0n) throw Error('ETH/USD must be above zero.')
  const numerator = FDV * WEI * scale, denominator = SUPPLY * rate
  const unitPriceWei = (numerator + denominator - 1n) / denominator
  return Object.freeze({ status: 'PLANNING_ONLY_NOT_LIVE_TERMS', totalSupply: SUPPLY.toString(), targetFdvUsd: FDV.toString(),
    tokenUsdNumerator: '1', tokenUsdDenominator: '14', referenceEthUsd: ethUsd,
    unitPriceWei: unitPriceWei.toString(), saleTokens: SALE.toString(), separateLpTokens: LP.toString(),
    maximumPurchaseWei: (SALE * unitPriceWei).toString(), rounding: 'UP_TO_NEXT_WEI_PER_WHOLE_SOULI',
    referenceTargetUsd: '50000', guaranteesFixedUsdPrice: false })
}
