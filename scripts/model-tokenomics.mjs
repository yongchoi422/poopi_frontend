// Planning arithmetic only. Never produces transaction amounts or live prices.
import { readFileSync, writeFileSync } from 'node:fs'
const supply = 210_000_000, fdvUsd = 15_000_000, lpQuoteUsd = 50_000
const price = fdvUsd / supply, fee = 0.003
const levels = JSON.parse(readFileSync(new URL('../src/lighthouse/purchase-levels.json', import.meta.url)))
const tokens = usd => usd / price
const impact = referenceUsd => {
  const tokenIn = tokens(referenceUsd), effective = tokenIn * (1 - fee)
  const quoteOut = lpQuoteUsd * effective / (tokens(lpQuoteUsd) + effective)
  const afterPrice = (lpQuoteUsd - quoteOut) / (tokens(lpQuoteUsd) + tokenIn)
  return { startingPriceValueUsd: referenceUsd, tokensSold: tokenIn, receivedUsd: quoteOut,
    endingSpotPriceChangePercent: (afterPrice / price - 1) * 100 }
}
const report = {
  version: 4, scenarioDate: '2026-10-03', status: 'PROPOSAL_NOT_LIVE_TERMS',
  executionPlan: { liquidity: 'MANUAL_TEAM_TRANSACTION', treasury: 'THREE_INDEPENDENT_OPERATORS_CONTROLLER_NOT_MAINNET_DEPLOYED',
    lpSpendingEnforcedByContract: false, firstSaleLpBudgetIsOperatingPlan: true, publicSaleEnabled: false },
  assumptions: ['USD reference values, not live prices', 'Each impact case starts from the same fresh v2-style pool',
    '0.3% swap fee; constant ETH/USD; no gas, arbitrage, MEV, other trades or other pools',
    'FDV is a reference calculation, not cash or guaranteed valuation',
    'Existing investor balances and commitments are unknown; no circulating market cap is asserted'],
  supply, fdvUsd, tokenReferenceUsd: price, tokensPerReferenceUsd: 1 / price,
  lpQuoteUsd, lpTokens: tokens(lpQuoteUsd), buyerTokensIfFullyPurchased: tokens(lpQuoteUsd),
  combinedInventoryIfFullyPurchased: 2 * tokens(lpQuoteUsd), initialPoolNominalUsd: 2 * lpQuoteUsd,
  lpCandidateReserve: { status: 'SUPERSEDED_LP_ONLY_RESEARCH_NOT_CURRENT_LAUNCH_PLAN', priceToleranceBps: 50,
    extraLpTokens: tokens(lpQuoteUsd) * 0.005, prefundingWithBuffer: 2 * tokens(lpQuoteUsd) + tokens(lpQuoteUsd) * 0.005,
    note: 'Separate protected SOULI reserve to supply all target ETH; unused LP reserve has no withdrawal route' },
  newBuyerSupplyPercent: tokens(lpQuoteUsd) / supply * 100,
  matchingLpSupplyPercent: tokens(lpQuoteUsd) / supply * 100,
  levels: levels.levels.map(x => ({ displayLevel: x.displayLevel, minimumSeed: Number(x.minimum), referenceCostUsd: Number(x.minimum) * price })),
  impact: [1000, 5000, 10000, 150000].map(impact),
  supportExamples: [0, 20000, 50000].map(supportUsd => ({ supportUsd, purchasesUsd: lpQuoteUsd - supportUsd,
    buyerTokens: tokens(lpQuoteUsd - supportUsd), lpTokens: tokens(lpQuoteUsd),
    note: 'Illustrative founder top-up to treasury, separate from sales; manual custody is withdrawable; public support intake not enabled' })),
  operatingBudgetExamples: [500, 1500, 3000].map(monthlyUsd => ({ monthlyUsd,
    runwayMonths: 12, contingencyPercent: 20, reserveUsd: monthlyUsd * 12 * 1.2,
    note: 'Illustrative recurring cash budget, not an Azure quote; audit/legal/setup excluded' })),
  allocation: { base: 'Total supply, not the remaining reserve R',
    teamTargetPercent: 15, teamTargetTokens: supply * 15 / 100, otherSupplyTokens: supply * 85 / 100,
    otherAllocationBreakdown: null, teamDistributedVerifiedTokens: null, teamLockedVerifiedTokens: null,
    reason: '15% is the user-selected team budget target. Outside-main-wallet balances are unclassified, not verified team distributions. No balances moved or locked.' },
}
if (report.combinedInventoryIfFullyPurchased !== 1_400_000 || report.lpTokens !== 700_000) throw Error('Invalid launch arithmetic')
if (report.allocation.teamTargetTokens + report.allocation.otherSupplyTokens !== supply) throw Error('Invalid allocation sum')
writeFileSync(new URL('../docs/tokenomics-model.json', import.meta.url), JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify(report, null, 2))
