// Read-only post-deployment verification of the isolated mobile purchase route.
import assert from 'node:assert/strict'
import {readFile,writeFile} from 'node:fs/promises'
import {join} from 'node:path'
import {createHash} from 'node:crypto'
const release=JSON.parse(await readFile('logs/sale-checks/commercial-v2-web-release.json','utf8'))
const manifest=JSON.parse(await readFile(join(release.release,'manifest.json'),'utf8'))
const base=JSON.parse(await readFile(join(manifest.baseRelease,'manifest.json'),'utf8'))
const hash=bytes=>createHash('sha256').update(bytes).digest('hex')
const origin='https://souli.net'
const results=[]
async function check(path,expected){
 const r=await fetch(origin+path,{signal:AbortSignal.timeout(30000),cache:'no-store'})
 assert.equal(r.status,200,`${path} status`)
 const bytes=Buffer.from(await r.arrayBuffer())
 assert.equal(hash(bytes),expected,`${path} content hash`)
 assert.match(r.headers.get('content-security-policy')||'',/frame-ancestors 'none'/)
 if(path.startsWith('/pilot-v2')){
  assert.match(r.headers.get('cache-control')||'',/no-store/)
  assert.match(r.headers.get('x-robots-tag')||'',/noindex/)
  assert.match(bytes.toString(),/noindex, nofollow/)
 }
 results.push({path,sha256:expected,status:r.status})
}
const paths=['index.html','buy/index.html','manage/index.html','whitepaper/index.html','pilot/index.html','soul/index.html']
for(const path of paths)await check('/'+path,base.files.find(f=>f.path===path).sha256)
const page=manifest.files.find(f=>f.path==='pilot-v2/index.html')
for(const path of ['/pilot-v2','/pilot-v2/','/pilot-v2/index.html'])await check(path,page.sha256)
const added=manifest.files.filter(f=>f.path.startsWith('assets/')&&!base.files.some(b=>b.path===f.path))
// Include dynamic SDK chunks: mobile connection needs them after clicking Connect.
for(let i=0;i<added.length;i+=4)await Promise.all(added.slice(i,i+4).map(f=>check('/'+f.path,f.sha256)))
const result={checkedAt:new Date().toISOString(),origin,release:release.release,checks:results.length,publicHomePreserved:true,publicCommercialCheckoutPreserved:true,records:results}
await writeFile(join(release.release,'hosted-verification.json'),JSON.stringify(result,null,2)+'\n')
console.log(JSON.stringify({status:'passed',checks:result.checks,url:origin+'/pilot-v2/',homeAndCommercialCheckout:'unchanged'},null,2))
