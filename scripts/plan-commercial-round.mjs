// Internal proposal only. Does not modify deployed terms or send transactions.
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { formatEther } from 'ethers'
import { planLaunchPrice } from '../src/lighthouse/launch-pricing.mjs'

export function commercialScenario(grossUsd, referenceEthUsd, lpShareBps = 5000) {
  if (!Number.isSafeInteger(grossUsd) || grossUsd <= 0 || grossUsd > 300000) throw Error('Proposal range: positive whole USD, at most 300000')
  if (!Number.isSafeInteger(lpShareBps) || lpShareBps <= 0 || lpShareBps > 10000) throw Error('LP share must be an integer from 1 to 10000 basis points')
  const price = planLaunchPrice(referenceEthUsd), tokens = BigInt(grossUsd) * 14n
  const proceeds = tokens * BigInt(price.unitPriceWei)
  const share = BigInt(lpShareBps), lpEth = proceeds * share / 10000n, operatingEth = proceeds - lpEth
  const lpReferenceUsd = grossUsd * lpShareBps / 10000
  return {
    grossReferenceUsd:grossUsd, buyerTokens:tokens.toString(),
    buyerSupplyPercent:Number(tokens) / 210000000 * 100,
    lpShareOfGrossEthBps:lpShareBps,
    lpEthReferenceUsd:lpReferenceUsd, separateMatchingLpTokens:(tokens * share / 10000n).toString(),
    nominalInitialLpBothSidesReferenceUsd:lpReferenceUsd * 2,
    operationsReferenceUsdBeforeCosts:grossUsd - lpReferenceUsd,
    referenceEthUsd, unitPriceWei:price.unitPriceWei,
    maximumPaymentEth:formatEther(proceeds), lpEth:formatEther(lpEth),
    operationsEthBeforeCosts:formatEther(operatingEth),
    priceImpactIllustration:{tokenInputAtInitialPriceUsd:10000,spotPriceDropPctIgnoringFees:100*(1-(lpReferenceUsd/(lpReferenceUsd+10000))**2)}
  }
}

export function commercialProposal() {
  return {
    status:'POLICY_APPROVED_FINAL_TERMS_PENDING_NOT_DEPLOYABLE', preparedDate:'2026-10-03', chainId:8453,
    userConfirmed:{targetFdvUsd:15000000,totalSupplyTokens:210000000,firstRoundGrossRangeUsd:[200000,300000],saleCapTokens:'4200000',walletCapTokens:'4200000',lpPrincipalLock:'ONE_YEAR_AFTER_INITIAL_LP_CREATION',lpShareOfGrossEthBps:5000,operationsShareOfGrossEthBps:5000,saleEndPreference:'SELL_OUT_WITHOUT_CALENDAR_DEADLINE',gameStatus:'COOKING',manualLiquidity:true,independentOperators:3},
    earlierLpTarget:{bothSidesUsd:[50000,100000],status:'SUPERSEDED_BY_APPROVED_50_PERCENT_SPLIT'},
    recommendation:{saleCapTokens:'4200000',walletCapTokens:'4200000',minimumPurchaseTokens:'1',
      payment:'BASE_NATIVE_ETH',lpShareOfGrossEthBps:5000,operationsShareOfGrossEthBps:5000,proceedsSplitApproved:true,
      finiteRoundDays:null,saleEnd:'SELL_OUT_WITHOUT_CALENDAR_DEADLINE',endPolicyImplemented:true,endPolicyContractVersion:2,endPolicyPubliclyDeployed:false,liquidityExecution:'LP timing is a separate decision; pause/close fixed-price sale before initial DEX liquidity and review existing pair and reserves first',
      lpExecutionDeadlineApproved:false,lpLockDurationApproved:true,lpPrincipalLockYears:1,lpLockImplementationVerified:false,lpOwnerAndLockApproved:false,spendingPlanApproved:false},
    liveEthUsdReference:null,referenceTimestamp:null,unitPriceWei:null,startsAt:null,endsAt:'0',
    notes:['15M is reference FDV, not circulating market cap or a price guarantee.',
      'LP total includes token-side nominal value; only the ETH side is cash raised.',
      'LP allocation is a disclosed operating policy, not enforced by the current contracts.',
      'USD equivalents drift with ETH. Fixed ETH cannot simultaneously guarantee fixed USD price.',
      'V2 implements no calendar deadline with endsAt=0. Local tests passed; deployment and independent review remain pending. Existing V1 contracts are unchanged.',
      'At 50% of purchase ETH plus matching separate SOULI, nominal LP total equals reference gross proceeds, not half of gross.',
      'Do not make sellout an unapproved prerequisite for LP; an unfinished sale could otherwise delay LP indefinitely.',
      'No extra per-wallet limit: one wallet may buy all remaining stock within the 4.2M round cap.',
      'One year of LP principal locking after initial pool creation is approved as a plan. No lock is deployed; provider, owner, fee rights, cost and exact unlock timestamp must be verified before funds move.',
      'The 50:50 policy, 4.2M sale/wallet caps and one-year LP principal lock direction are approved. Final ETH pricing, opening time and LP custody/execution implementation remain pending. Do not open checkout from this draft.'],
    scenarios:['2500','3000','4000'].flatMap(rate=>[200000,250000,300000].map(gross=>commercialScenario(gross,rate))),
    splitComparison:[1500,5000].flatMap(bps=>[200000,250000,300000].map(gross=>commercialScenario(gross,'3000',bps)))
  }
}
if (process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const report=commercialProposal()
  writeFileSync(new URL('../docs/commercial-round-proposal.json',import.meta.url),JSON.stringify(report,null,2)+'\n')
  console.log(JSON.stringify({status:report.status,scenarios:report.scenarios.length,deployable:false}))
}
