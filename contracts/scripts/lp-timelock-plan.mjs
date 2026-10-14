// Pure planning only: no provider, wallet, signing, deployment or transfer.
import {getAddress, ZeroAddress, ContractFactory, keccak256} from 'ethers'
export const YEAR_SECONDS = 365 * 86400
export const BASE_V2 = Object.freeze({chainId:8453,
  token:'0xb43eA104c7ec75038Ac8EcA57107Eefc8B039aFF',
  weth:'0x4200000000000000000000000000000000000006',
  factory:'0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6',
  router:'0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24'})
const forbidden = [BASE_V2.token, BASE_V2.weth, BASE_V2.factory, BASE_V2.router,
  '0xc177F10Da4c62FBbef8182e82EE09F7Db79769dA', '0x9B3b5BFbc22821416e390E10e0a30C1AC1960B68',
  '0xD643520BfEb76e59250d56Df8B196F9c751Bc252', '0x83bcB8Ba9b7518CDEc32f2eE0e684f1d7b4ffB01'].map(x=>x.toLowerCase())
export async function planLpTimelock(input, artifact) {
  if(input.chainId!==8453)throw Error('Only Base mainnet planning is supported')
  const beneficiary=getAddress(input.beneficiary),pair=getAddress(input.pair)
  if([beneficiary,pair].includes(ZeroAddress)||beneficiary===pair||forbidden.includes(beneficiary.toLowerCase())||forbidden.includes(pair.toLowerCase()))throw Error('Unsafe beneficiary or LP pair')
  for(const key of ['fundingWindowEndsAt','unlockTimestamp'])if(!Number.isSafeInteger(input[key])||input[key]<=0)throw Error('Exact positive timestamps required')
  if(input.unlockTimestamp-input.fundingWindowEndsAt<YEAR_SECONDS)throw Error('At least 365 days after the funding window is required')
  if(artifact?.source!=='@openzeppelin/contracts/finance/VestingWallet.sol')throw Error('Use the unmodified pinned VestingWallet artifact')
  const constructorArgs=[beneficiary,input.unlockTimestamp,0]
  const tx=await new ContractFactory(artifact.abi,artifact.bytecode).getDeployTransaction(...constructorArgs)
  return {kind:'manual-v2-lp-timelock-plan',chainId:8453,pair,beneficiary,constructorArgs,
    fundingWindowEndsAt:input.fundingWindowEndsAt,unlockTimestamp:input.unlockTimestamp,
    unlockUTC:new Date(input.unlockTimestamp*1000).toISOString(),creationCodeHash:keccak256(artifact.bytecode),
    unsignedDeployment:{data:tx.data,value:'0'},
    verifiedOnChain:false,readyToFund:false,
    requiredChecks:['canonical factory pair and SOULI/WETH identity','actual LP mint and deposit receipts',
      'exact deployed runtime and constructor settings','beneficiary control and recovery review',
      'deposit before fundingWindowEndsAt; otherwise prepare a new lock',
      'all received LP, outstanding unlocked LP and current owner reconciliation']}
}
export function purchaseAllocation(proceedsWei, unitPriceWei) {
  for(const value of [proceedsWei,unitPriceWei])if(typeof value!=='string'||!/^\d+$/.test(value))throw Error('Exact wei strings required')
  const proceeds=BigInt(proceedsWei),price=BigInt(unitPriceWei)
  if(price===0n)throw Error('Positive price required')
  const lp=proceeds/2n
  return {purchaseWei:proceeds.toString(),lpBudgetWei:lp.toString(),operationsBudgetWei:(proceeds-lp).toString(),
    // A reference at the sale ratio only; actual pool reserves need fresh review.
    matchingSouliUnitsAtSalePrice:(lp*1_000_000_000n/price).toString(),enforcedOnChain:false}
}
