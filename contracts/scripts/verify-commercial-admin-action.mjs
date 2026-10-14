// Read-only evidence for a wallet-returned, UI-verified admin transaction hash.
import assert from 'node:assert/strict'
import {readFile,writeFile} from 'node:fs/promises'
import {Interface,keccak256,toQuantity} from 'ethers'
import {createAdminReader} from '../../src/sale-admin/read-rpc.mjs'
import {readAdminState,adminActionEffect,validateAdminConfig} from '../../src/sale-admin/client.mjs'
import {CONTROLLER_ABI} from '../../src/sale-admin/config.mjs'
const [action,hash,quantity='0']=process.argv.slice(2)
assert.ok(['pause','recover','collect'].includes(action));assert.match(hash||'',/^0x[\da-f]{64}$/i)
const root=new URL('../../',import.meta.url),reader=createAdminReader(8453),ci=new Interface(CONTROLLER_ABI)
const config=validateAdminConfig(JSON.parse(await readFile(new URL('tmp/commercial-v2/verified-admin.json',root),'utf8')))
const rpc=(method,params=[])=>reader.request({method,params}),same=(a,b)=>String(a).toLowerCase()===String(b).toLowerCase()
try{
 const account=config.operators[0]
 const [state,receipt,tx]=await Promise.all([readAdminState(reader,config,{account}),rpc('eth_getTransactionReceipt',[hash]),rpc('eth_getTransactionByHash',[hash])])
 assert.ok(receipt&&tx);assert.equal(BigInt(receipt.status),1n);assert.ok(same(tx.from,account));assert.equal(BigInt(tx.value),0n);assert.equal(BigInt(tx.chainId),8453n)
 const block=Number(BigInt(receipt.blockNumber)),canonical=await rpc('eth_getBlockByNumber',[receipt.blockNumber,false])
 assert.equal(canonical.hash,receipt.blockHash);assert.ok(state.block-block+1>=2)
 for(const [address,pin] of [[config.controller,config.controllerRuntimeCodeHash],[config.sale.address,config.sale.runtimeCodeHash],[config.sale.terms.token,config.tokenRuntimeCodeHash]])assert.equal(keccak256(await rpc('eth_getCode',[address,receipt.blockNumber])),pin)
 assert.ok(adminActionEffect(receipt,{action,quantity},config,account),'Expected action effect is missing')
 const direct=same(tx.to,config.controller)
 if(direct){const input=ci.parseTransaction({data:tx.input,value:tx.value});assert.equal(input.name,{pause:'pauseSale',recover:'recoverInventory',collect:'collectProceeds'}[action]);if(action==='recover')assert.equal(input.args[0],BigInt(quantity))}
 assert.equal(state.paused,true)
 let exactCollected=null
 if(action==='recover'){
  assert.equal(quantity,'41');assert.equal(state.available,0n);assert.equal(state.inventory,0n);assert.equal(state.walletTokens,998000000000n)
 }
 if(action==='collect'){
  const events=receipt.logs.filter(l=>same(l.address,config.controller)).map(l=>{try{return ci.parseLog(l)}catch{return null}})
  exactCollected=events.find(e=>e?.name==='EtherCollected'&&same(e.args.operator,account))?.args.amountWei
  assert.equal(exactCollected,26666033792798n);assert.equal(state.saleEth,0n);assert.equal(state.controllerEth,0n)
  const [before,after]=await Promise.all([rpc('eth_getBalance',[account,toQuantity(block-1)]),rpc('eth_getBalance',[account,receipt.blockNumber])])
  // Base receipts separate the L1 data fee from L2 gas used.
  const gas=BigInt(receipt.gasUsed)*BigInt(receipt.effectiveGasPrice)+BigInt(receipt.l1Fee||0)
  assert.equal(BigInt(after)-BigInt(before),exactCollected-gas,'Operator ETH delta must reconcile with collected proceeds and network fees')
 }
 const result={status:'success',checkedAt:new Date().toISOString(),action,hash,account,quantity,block,blockHash:receipt.blockHash,confirmations:state.block-block+1,directControllerCall:direct,exactCollected,state,receipt,transaction:tx,verification:'Canonical successful receipt, reviewed runtime/terms/admins, known wallet-returned hash and exact expected effect; wallet envelope may differ from a direct controller call.',publicTransactionsSent:0}
 await writeFile(new URL(`logs/sale-checks/commercial-v2-${action}-receipt.json`,root),JSON.stringify(result,(_,v)=>typeof v==='bigint'?v.toString():v,2)+'\n')
 console.log(JSON.stringify({status:result.status,action,hash,block,confirmations:result.confirmations,paused:state.paused,available:state.available,walletTokens:state.walletTokens,saleEth:state.saleEth,exactCollected},(_,v)=>typeof v==='bigint'?v.toString():v,2))
}finally{reader.destroy()}
