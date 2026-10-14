// Explicit allowlist of public evidence. Never copy private logs or wallet labels.
import assert from 'node:assert/strict'
import {readFile,writeFile} from 'node:fs/promises'
import {formatEther} from 'ethers'
const read=async path=>JSON.parse(await readFile(path,'utf8'))
const sale=await read('src/pilot-v2/sale.json'),config=await read('tmp/commercial-v2/verified-admin.json')
const latest=await read('logs/sale-checks/commercial-v2-latest-state.json'),cycle=await read('logs/sale-checks/commercial-v2-cycle-complete.json')
const source=await read('logs/sale-checks/commercial-v2-sourcify-results.json')
assert.equal(latest.sale,sale.address);assert.equal(latest.controller,config.controller)
assert.ok(Date.now()-Date.parse(latest.checkedAt)<86400000,'Refresh the read-only chain snapshot before publishing')
assert.equal(latest.state.paused,true);assert.equal(latest.state.sold,'1');assert.equal(latest.state.inventory,'0')
assert.equal(latest.state.saleEth,'0');assert.equal(latest.state.controllerEth,'0')
const receipts=[]
for(const [file,label]of [['purchase1','1 SOULI purchased'],['pause','Sale paused'],['recover','41 unsold SOULI returned'],['collect','Purchase ETH collected']]){
 const r=await read(`logs/sale-checks/commercial-v2-${file}-receipt.json`)
 assert.equal(r.status,'success');assert.equal(r.hash,cycle[file==='purchase1'?'purchaseHash':file+'Hash'])
 receipts.push({label,hash:r.hash,block:r.block})
}
for(const address of [sale.address,config.controller]){
 const match=source.checks.find(c=>c.address===address)?.result.contract
 assert.equal(match?.creationMatch,'exact_match');assert.equal(match?.runtimeMatch,'exact_match')
}
const proof={schema:1,chainId:8453,checkedAt:latest.checkedAt,block:latest.state.block,
 sale:sale.address,controller:config.controller,token:sale.terms.token,operators:config.operators,
 runtimeCodeHash:sale.runtimeCodeHash,termsHash:sale.termsHash,terms:sale.terms,
 unitPriceEth:formatEther(sale.terms.unitPriceWei),paused:true,sold:latest.state.sold,
 purchaseEth:formatEther(latest.state.proceedsWei),saleEth:formatEther(latest.state.saleEth),
 controllerEth:formatEther(latest.state.controllerEth),collectedEth:formatEther(latest.state.proceedsWei),
 available:latest.state.available,remainingToFund:latest.state.remainingToFund,
 sourceVerification:'Sourcify exact creation and runtime match',commercialCheckoutOpen:false,
 independentAuditPublished:false,lpCreated:false,lpLocked:false,receipts}
await writeFile('src/site/commercial-proof.json',JSON.stringify(proof,null,2)+'\n')
console.log(`Prepared public V2 snapshot at Base block ${proof.block}; sale remains closed.`)
