// Creates one unsigned, local review. No keys, signer or broadcast.
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs'
import {JsonRpcProvider,FetchRequest,formatEther} from 'ethers'
import {prepareControllerDeployment,preflightController} from './three-wallet-release-tools.mjs'
import {planLaunchPrice} from '../../src/lighthouse/launch-pricing.mjs'
const root=new URL('../',import.meta.url),path=new URL('release/base-pilot.review.json',root)
if(existsSync(path))throw Error('A pilot review already exists. Reconcile any wallet requests before replacing it.')
const draft=JSON.parse(readFileSync(new URL('release/base-pilot.draft.json',root)))
const compiled=JSON.parse(readFileSync(new URL('artifacts/contracts.json',root)))
const artifacts=Object.fromEntries(['SouliEthSale','SouliThreeWalletController'].map(k=>[k,compiled.contracts[k]]))
const request=new FetchRequest('https://mainnet.base.org');request.timeout=15000
const reader=new JsonRpcProvider(request,undefined,{batchMaxCount:1,cacheTimeout:-1})
try{
 const source='https://api.coinbase.com/v2/prices/ETH-USD/spot'
 const response=await fetch(source,{signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('Price source HTTP '+response.status)
 const data=(await response.json()).data
 if(data.base!=='ETH'||data.currency!=='USD')throw Error('Unexpected price pair')
 const price=planLaunchPrice(data.amount),block=await reader.getBlock('latest'),nonce=await reader.getTransactionCount(draft.deployer,'pending')
 const review=await prepareControllerDeployment({...draft,nonce:String(nonce),unitPriceWei:price.unitPriceWei,startsAt:String(block.timestamp),endsAt:String(block.timestamp+7*86400)},artifacts)
 const preflight=await preflightController(reader,review,artifacts)
 const context={preparedAt:new Date().toISOString(),status:'UNSIGNED_PILOT_ONLY_AWAITING_USER_WALLET_APPROVAL',priceReference:{source,serverDate:response.headers.get('date'),ethUsd:data.amount},totalSupply:price.totalSupply,referenceFdvUsd:price.targetFdvUsd,
   unitPriceEth:formatEther(BigInt(price.unitPriceWei)),maximumPilotRevenueEth:formatEther(BigInt(price.unitPriceWei)*42n),startsAtUtc:new Date(Number(review.terms.startsAt)*1000).toISOString(),endsAtUtc:new Date(Number(review.terms.endsAt)*1000).toISOString(),
   compiler:compiled.compiler,preflight,publicTransactionsSent:0,note:'Pilot is separate from the commercial launch. Initially paused; no inventory transfer or token approval in deployment. Fixed ETH price; USD changes with ETH. Three independent operators, one signature is enough. Manual LP, no automatic LP or refund.'}
 const folder=new URL('../../tmp/mainnet-pilot/',import.meta.url);mkdirSync(folder,{recursive:true})
 writeFileSync(path,JSON.stringify(review,null,2)+'\n')
 writeFileSync(new URL('release/base-pilot.context.json',root),JSON.stringify(context,null,2)+'\n')
 for(const [name,value]of Object.entries({review,context,artifacts}))writeFileSync(new URL(name+'.json',folder),JSON.stringify(value,null,2)+'\n')
 console.log(JSON.stringify({controller:review.controller,sale:review.sale,...context},null,2))
}finally{reader.destroy()}
