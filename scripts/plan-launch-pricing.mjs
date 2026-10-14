// Explicit scenario inputs only: no live market fetch, wallet or configuration writes.
import { writeFileSync } from 'node:fs'
import { formatEther } from 'ethers'
import { planLaunchPrice } from '../src/lighthouse/launch-pricing.mjs'
const rates = process.argv.slice(2)
if (!rates.length) throw Error('Usage: node scripts/plan-launch-pricing.mjs 2500 3000 4000 (illustrative ETH/USD scenarios)')
const scenarios = rates.map(rate => {
  const plan = planLaunchPrice(rate)
  return { ...plan, unitPriceEth: formatEther(plan.unitPriceWei), saleCapEth: formatEther(plan.maximumPurchaseWei),
    levels: [['1','1'],['2','21000'],['3','150000'],['4','500000'],['5','2500000']].map(([level, amount]) => ({
      level, newSeedMinimumTokens: amount, referenceUsd: Number(amount) / 14,
      eth: formatEther(BigInt(amount) * BigInt(plan.unitPriceWei)), fitsProposedSaleCap: BigInt(amount) <= BigInt(plan.saleTokens) })) }
})
const report = { generatedAt: new Date().toISOString(), status: 'ILLUSTRATIONS_NOT_CURRENT_MARKET_QUOTES',
  chainId: 8453, settlement: 'Native ETH on Base', finalRateTimestamp: null, finalRateSource: null,
  requiresBeforeDeployment: ['Fresh agreed ETH/USD reference and timestamp', 'Final wallet limit and sale dates', 'Review immutable terms', 'Original-token pilot and contract review'], scenarios }
writeFileSync(new URL('../docs/launch-price-scenarios.json', import.meta.url), JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify(report, null, 2))
