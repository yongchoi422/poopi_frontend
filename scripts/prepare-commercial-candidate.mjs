// Read-only preparation. No signer, wallet requests, broadcasting or live manifests.
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs'
import {JsonRpcProvider,FetchRequest,Contract,formatEther} from 'ethers'
import {prepareControllerDeployment,preflightController} from '../contracts/scripts/three-wallet-release-tools.mjs'
import {METAMASK_DELEGATE,BASE_METAMASK_DELEGATE_HASH} from '../contracts/scripts/deployer-account.mjs'
import {planLaunchPrice} from '../src/lighthouse/launch-pricing.mjs'
const root=new URL('../',import.meta.url),read=path=>JSON.parse(readFileSync(new URL(path,root)))
if(existsSync(new URL('tmp/commercial-v2/deployment-review.json',root)))throw Error('A frozen deployment review exists. Reconcile its wallet request/receipt before preparing another round; do not overwrite it.')
const input=read('contracts/release/base-sale.draft.json'),compiled=read('contracts/artifacts/contracts.json')
if(input.version!==2||input.saleCap!=='4200000'||input.walletCap!=='4200000'||input.endsAt!=='0')throw Error('Draft differs from approved cap/end policy')
const request=new FetchRequest('https://mainnet.base.org');request.timeout=20000
const reader=new JsonRpcProvider(request,undefined,{batchMaxCount:1,cacheTimeout:-1})
try{
 const response=await fetch('https://api.coinbase.com/v2/prices/ETH-USD/spot',{signal:AbortSignal.timeout(15000)})
 if(!response.ok)throw Error('Price reference unavailable')
 const body=await response.json(),serverDate=response.headers.get('date')
 if(body.data?.base!=='ETH'||body.data?.currency!=='USD'||!serverDate||Math.abs(Date.now()-Date.parse(serverDate))>300000)throw Error('Unexpected or stale reference')
 const price=planLaunchPrice(body.data.amount),block=await reader.getBlock('latest')
 const [nonce,pending]=await Promise.all([reader.getTransactionCount(input.deployer),reader.getTransactionCount(input.deployer,'pending')])
 if(nonce!==pending)throw Error('Existing wallet transaction pending')
 const review=await prepareControllerDeployment({...input,nonce:String(nonce),unitPriceWei:price.unitPriceWei,startsAt:String(block.timestamp),deployerAccount:{kind:'existing-metamask-7702-direct',implementation:METAMASK_DELEGATE,implementationCodeHash:BASE_METAMASK_DELEGATE_HASH}},compiled.contracts)
 const preflight=await preflightController(reader,review,compiled.contracts)
 const token=new Contract(input.token,['function balanceOf(address) view returns(uint256)'],reader)
 const walletStock=await token.balanceOf(input.deployer),eth=await reader.getBalance(input.deployer)
 const context={preparedAt:new Date().toISOString(),status:'REVIEW_CANDIDATE_ONLY_NOT_DEPLOYED',publicTransactionsSent:0,referenceFdvUsd:15000000,priceReference:{source:'https://api.coinbase.com/v2/prices/ETH-USD/spot',ethUsd:body.data.amount,serverDate},unitPriceEth:formatEther(price.unitPriceWei),maximumPurchaseEth:formatEther(BigInt(price.unitPriceWei)*4200000n),lpShareBps:5000,operationsShareBps:5000,lpPrincipalLockPlan:'One year after initial LP creation; no lock deployed',stock:{buyerTokens:'4200000',separateMatchingLpTokens:'2100000',walletWholeSouli:String(walletStock/1000000000n),walletEth:formatEther(eth)},preflight,compiler:compiled.compiler,launchEnabled:false,remaining:['Fresh final price/nonce review and wallet deployment signature','Verify new paused contract and source; limited-stock original-token purchase/recovery cycle','Confirm supply wallet and prepare buyer stock; keep LP stock separate','External independent review remains pending','Finalize LP execution timing, beneficiary/lock implementation and operating budget; publish receipts'],note:'Reference price only. Rebuild immediately before signing. No public sale, LP creation, lock, allowance or stock transfer occurred.'}
 const dir=new URL('tmp/commercial-v2/',root);mkdirSync(dir,{recursive:true})
 writeFileSync(new URL('review.json',dir),JSON.stringify(review,null,2)+'\n')
 writeFileSync(new URL('context.json',dir),JSON.stringify(context,null,2)+'\n')
 console.log(JSON.stringify({status:context.status,controller:review.controller,sale:review.sale,unitPriceEth:context.unitPriceEth,estimatedGas:preflight.estimatedGas,walletStock:context.stock.walletWholeSouli,publicTransactionsSent:0}))
}finally{reader.destroy()}
