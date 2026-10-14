// Read-only: verify the user's signed first-stock transactions. No wallet access.
import assert from 'node:assert/strict'
import {writeFile,mkdir} from 'node:fs/promises'
import {OPENING_RECEIPTS} from './launch-release-gate.mjs'
import {keccak256,Interface} from 'ethers'
import {MAINNET_ADMIN as config} from '../src/sale-admin/config.mjs'
import {adminActionEffect} from '../src/sale-admin/client.mjs'
import {createAdminReader} from '../src/sale-admin/read-rpc.mjs'
const reader=createAdminReader(8453),rpc=(method,params=[])=>reader.request({method,params})
const same=(a,b)=>a.toLowerCase()===b.toLowerCase()
const entries=[
 ['approve','1399999',OPENING_RECEIPTS[0]],
 ['deposit','1399999',OPENING_RECEIPTS[1]],
 ['start','0',OPENING_RECEIPTS[2]],
]
try {
 const tip=BigInt(await rpc('eth_blockNumber')),receipts=[]
 for(const [action,quantity,hash] of entries){
  const [receipt,tx]=await Promise.all([rpc('eth_getTransactionReceipt',[hash]),rpc('eth_getTransactionByHash',[hash])])
  assert.ok(receipt&&tx);assert.equal(BigInt(receipt.status),1n)
  assert.ok(same(tx.from,config.operators[0]));assert.equal(BigInt(tx.chainId),8453n);assert.equal(BigInt(tx.value),0n)
  const header=await rpc('eth_getBlockByNumber',[receipt.blockNumber,false])
  assert.equal(header.hash,receipt.blockHash);assert.ok(tip-BigInt(receipt.blockNumber)>=1n)
  for(const [address,pin] of [[config.sale.terms.token,config.tokenRuntimeCodeHash],[config.controller,config.controllerRuntimeCodeHash],[config.sale.address,config.sale.runtimeCodeHash]])
   assert.equal(keccak256(await rpc('eth_getCode',[address,receipt.blockNumber])),pin)
  assert.ok(adminActionEffect(receipt,{action,quantity},config,config.operators[0]))
  if(action==='deposit'){
   const ti=new Interface(['event Transfer(address indexed from,address indexed to,uint256 value)'])
   const transfers=receipt.logs.filter(l=>same(l.address,config.sale.terms.token)).map(l=>{try{return ti.parseLog(l)}catch{return null}}).filter(Boolean)
   for(const [from,to] of [[config.operators[0],config.controller],[config.controller,config.sale.address]])
    assert.ok(transfers.some(e=>same(e.args.from,from)&&same(e.args.to,to)&&e.args.value===1399999000000000n))
  }
  receipts.push({action,hash,block:Number(BigInt(receipt.blockNumber)),at:new Date(Number(BigInt(header.timestamp))*1000).toISOString()})
 }
 const opening={schema:1,confirmed:true,chainId:8453,sale:config.sale.address,controller:config.controller,termsHash:config.sale.termsHash,
  initialStock:'1399999',previouslySold:'1',roundCap:config.sale.terms.saleCap,openedAt:receipts[2].at,block:receipts[2].block,receipts}
 // Explicit public fields only; never export transaction internals or wallet nicknames.
 await writeFile('src/site/sale-opening.json',JSON.stringify(opening,null,2)+'\n')
 await mkdir('logs/sale-checks',{recursive:true})
 await writeFile('logs/sale-checks/first-stock-opening-verification.json',JSON.stringify({checkedAt:new Date().toISOString(),verifiedThroughBlock:Number(tip),opening,publicTransactionsSent:0},null,2)+'\n')
 console.log('PASS: signed approval, exact stock transfer and sale opening verified on Base; no transactions sent.')
} finally {reader.destroy()}
