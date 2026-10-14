// Read-only verification of the first V2 mainnet purchase and original artwork.
import assert from 'node:assert/strict'
import {readFile,writeFile} from 'node:fs/promises'
import {Interface,keccak256,toQuantity} from 'ethers'
import {createAdminReader,ADMIN_READ_ENDPOINTS} from '../../src/sale-admin/read-rpc.mjs'
import {readAdminState} from '../../src/sale-admin/client.mjs'
import {readOwnedSouls} from '../../src/soul/inscription.mjs'
import {SALE_ABI,TOKEN_ABI} from '../../src/lighthouse/sale-config.mjs'
const root=new URL('../../',import.meta.url)
const config=JSON.parse(await readFile(new URL('tmp/commercial-v2/verified-admin.json',root),'utf8'))
const opened=JSON.parse(await readFile(new URL('logs/sale-checks/commercial-v2-start-receipt.json',root),'utf8'))
const reader=createAdminReader(8453),si=new Interface(SALE_ABI),ti=new Interface([...TOKEN_ABI,'event Transfer(address indexed from,address indexed to,uint256 value)'])
const rpc=(method,params=[])=>reader.request({method,params})
const same=(a,b)=>String(a).toLowerCase()===String(b).toLowerCase()
const json=x=>JSON.stringify(x,(_,v)=>typeof v==='bigint'?v.toString():v,2)
async function logs(from,to){
 let failure
 for(const endpoint of ADMIN_READ_ENDPOINTS[8453]){
  try{
   const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'eth_getLogs',params:[{address:config.sale.address,topics:[si.getEvent('Purchased').topicHash],fromBlock:toQuantity(from),toBlock:toQuantity(to)}]}),signal:AbortSignal.timeout(10000)})
   if(!r.ok)throw Error(`Log endpoint HTTP ${r.status}`)
   const data=await r.json();if(data.error||!Array.isArray(data.result))throw Error('Log lookup unavailable')
   return data.result
  }catch(e){failure=e}
 }
 throw failure
}
try{
 const state=await readAdminState(reader,config)
 assert.ok(state.block-opened.block<10000,'Use an explicit transaction for a later sale phase')
 const found=[]
 for(let first=opened.block;first<=state.block;first+=1000)found.push(...await logs(first,Math.min(first+999,state.block)))
 assert.equal(found.length,1,'Expected exactly one initial purchase; inspect other activity before proceeding')
 const event=si.parseLog(found[0]),buyer=event.args.buyer,hash=found[0].transactionHash
 assert.equal(event.args.wholeSouli,1n);assert.equal(event.args.paidWei,BigInt(config.sale.terms.unitPriceWei))
 assert.ok(!config.operators.some(a=>same(a,buyer)),'This check should use a non-admin buyer')
 const [receipt,tx]=await Promise.all([rpc('eth_getTransactionReceipt',[hash]),rpc('eth_getTransactionByHash',[hash])])
 assert.ok(receipt&&tx);assert.equal(BigInt(receipt.status),1n)
 const block=Number(BigInt(receipt.blockNumber)),header=await rpc('eth_getBlockByNumber',[receipt.blockNumber,false])
 assert.equal(header.hash,receipt.blockHash);assert.ok(state.block-block+1>=2)
 const codes=await Promise.all([config.sale.address,config.sale.terms.token].map(a=>rpc('eth_getCode',[a,receipt.blockNumber])))
 assert.equal(keccak256(codes[0]),config.sale.runtimeCodeHash);assert.equal(keccak256(codes[1]),config.tokenRuntimeCodeHash)
 const delivered=receipt.logs.filter(l=>same(l.address,config.sale.terms.token)).map(l=>{try{return ti.parseLog(l)}catch{return null}}).find(e=>e?.name==='Transfer'&&same(e.args.from,config.sale.address)&&same(e.args.to,buyer)&&e.args.value===1000000000n)
 assert.ok(delivered,'Exact original-token delivery must appear in the successful receipt')
 const balanceAt=async b=>ti.decodeFunctionResult('balanceOf',await rpc('eth_call',[{to:config.sale.terms.token,data:ti.encodeFunctionData('balanceOf',[buyer])},b]))[0]
 const [before,after,owned]=await Promise.all([balanceAt(toQuantity(block-1)),balanceAt(receipt.blockNumber),readOwnedSouls(reader,buyer)])
 assert.equal(after-before,1000000000n)
 assert.ok(owned.total>0&&owned.souls.length>0,'Original inscriptions must be readable')
 const direct=same(tx.from,buyer)&&same(tx.to,config.sale.address)&&BigInt(tx.value)===event.args.paidWei
 if(direct){const input=si.parseTransaction({data:tx.input,value:tx.value});assert.equal(input.name,'buy');assert.equal(input.args.wholeSouli,1n)}
 assert.equal(state.sold,1n);assert.equal(state.available,41n);assert.equal(state.proceedsWei,event.args.paidWei)
 const result={status:'success',checkedAt:new Date().toISOString(),hash,buyer,sale:config.sale.address,block,blockHash:receipt.blockHash,confirmations:state.block-block+1,quantity:'1',paidWei:event.args.paidWei.toString(),directSaleCall:direct,outerFrom:tx.from,outerTo:tx.to,tokenBalanceBefore:before.toString(),tokenBalanceAfter:after.toString(),deliveredUnits:'1000000000',inscriptions:{block:owned.block,total:owned.total,souls:owned.souls.map(({svg,...s})=>({...s,svgBytes:Buffer.byteLength(svg),svgHash:keccak256(Buffer.from(svg))}))},state,receipt,transaction:tx,publicTransactionsSent:0}
 await writeFile(new URL('logs/sale-checks/commercial-v2-purchase1-receipt.json',root),json(result)+'\n')
 console.log(json({status:result.status,hash,buyer,block,confirmations:result.confirmations,quantity:result.quantity,paidWei:result.paidWei,directSaleCall:direct,tokenBalanceBefore:before,tokenBalanceAfter:after,inscriptions:result.inscriptions,available:state.available,sold:state.sold,proceedsWei:state.proceedsWei}))
}finally{reader.destroy()}
