// Read-only verification of the exact deployed HTML/JS/CSS, not just HTTP 200.
import {readFile,writeFile} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import assert from 'node:assert/strict'
const manifest=JSON.parse(await readFile('logs/azure-releases/static-manifest.json','utf8'))
const origin='https://souli.net',records=manifest.records.filter(r=>/\.(html|js|css)$/.test(r.path)),checked=[]
for(let i=0;i<records.length;i+=4){
 const results=await Promise.allSettled(records.slice(i,i+4).map(async r=>{
   const response=await fetch(`${origin}/${r.path}`,{cache:'no-store',signal:AbortSignal.timeout(30000)})
   assert.equal(response.status,200,r.path)
   const bytes=Buffer.from(await response.arrayBuffer())
   assert.equal(createHash('sha256').update(bytes).digest('hex'),r.sha256,r.path+' must match the reviewed release')
   return {path:r.path,sha256:r.sha256}
 }))
 for(const result of results){if(result.status==='rejected')throw result.reason;checked.push(result.value)}
}
const report={checkedAt:new Date().toISOString(),origin,release:manifest.release,passed:true,checked}
await writeFile('logs/sale-checks/launch-hosted-hashes.json',JSON.stringify(report,null,2)+'\n')
console.log(`PASS: ${checked.length} public HTML/JS/CSS files match the reviewed release SHA-256.`)
