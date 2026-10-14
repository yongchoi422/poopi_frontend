// Read-only chain/price snapshot. No wallet, signing key or broadcast methods.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs'
import {JsonRpcProvider,FetchRequest,Contract,keccak256,formatEther,formatUnits,getAddress} from 'ethers'
import {planLaunchPrice} from '../src/lighthouse/launch-pricing.mjs'
const input=JSON.parse(readFileSync('contracts/release/base-sale.draft.json','utf8'))
const rpc='https://base-rpc.publicnode.com',request=new FetchRequest(rpc);request.timeout=15000
const p=new JsonRpcProvider(request,8453,{batchMaxCount:1,cacheTimeout:-1})
try{
 if((await p.getNetwork()).chainId!==8453n)throw Error('Wrong chain')
 const b=await p.getBlock('latest'),o={blockTag:b.number}
 const token=new Contract(input.token,['function balanceOf(address) view returns(uint256)','function totalSupply() view returns(uint256)','function owner() view returns(address)','function maxBuy() view returns(uint256)'],p)
 const operators=await Promise.all(input.operators.map(async address=>{
  const [code,balance,stock,nonce,pendingNonce]=await Promise.all([p.getCode(address,b.number),p.getBalance(address,b.number),token.balanceOf(address,o),p.getTransactionCount(address,b.number),p.getTransactionCount(address,'pending')])
  const implementation=/^0xef0100[0-9a-f]{40}$/i.test(code)?getAddress('0x'+code.slice(8)):null
  const implementationCode=implementation?await p.getCode(implementation,b.number):null
  return {address,accountCode:code,eth:formatEther(balance),souli:formatUnits(stock,9),nonce,pendingNonce,implementation,implementationCodeHash:implementationCode?keccak256(implementationCode):null}
 }))
 const [supply,owner,maxBuy]=await Promise.all([token.totalSupply(o),token.owner(o),token.maxBuy(o)])
 const source='https://api.coinbase.com/v2/prices/ETH-USD/spot'
 const response=await fetch(source,{signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('Price HTTP '+response.status)
 const data=(await response.json()).data;if(data.base!=='ETH'||data.currency!=='USD')throw Error('Wrong price pair')
 const price=planLaunchPrice(data.amount)
 const report={readOnly:true,checkedAt:new Date().toISOString(),chainId:8453,rpc,block:b.number,blockHash:b.hash,blockTime:b.timestamp,operators,token:{address:input.token,codeHash:keccak256(await p.getCode(input.token,b.number)),supply:formatUnits(supply,9),owner,maxBuy:formatUnits(maxBuy,9)},priceReference:{source,date:response.headers.get('date'),ethUsd:data.amount,unitPriceWei:price.unitPriceWei,unitPriceEth:formatEther(BigInt(price.unitPriceWei)),saleEthAtCap:formatEther(BigInt(price.unitPriceWei)*4200000n),status:'REFERENCE_ONLY_NOT_FINAL_APPROVED_PRICE'},publicTransactionsSent:0}
 mkdirSync('logs/sale-checks',{recursive:true});writeFileSync('logs/sale-checks/commercial-readiness.json',JSON.stringify(report,null,2)+'\n')
 console.log(JSON.stringify(report,null,2))
}finally{p.destroy()}
