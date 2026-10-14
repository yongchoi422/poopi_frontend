// Local, allowlisted review bundle. No publishing, credentials or outbound messages.
import {mkdir,mkdtemp,readFile,writeFile,readdir,lstat,copyFile} from 'node:fs/promises'
import {resolve,join,dirname,extname} from 'node:path'
import {createHash} from 'node:crypto'
import assert from 'node:assert/strict'
const base=resolve('output/review');await mkdir(base,{recursive:true})
const destination=await mkdtemp(join(base,'souli-v2-')),records=[]
const allowed=new Set(['.sol','.mjs','.js','.vue','.json','.css','.scss','.md','.log','.ts','.ttf','.woff','.woff2'])
async function add(path){
 const info=await lstat(path);assert.ok(!info.isSymbolicLink())
 if(info.isDirectory()){
   for(const entry of (await readdir(path)).sort()){
     assert.ok(!['node_modules','.git','.env','cache'].includes(entry),'Unexpected private or dependency directory')
     await add(path+'/'+entry)
   }
   return
 }
 // Media are unnecessary for a contract review; static website builds use the full repo.
 if(!allowed.has(extname(path)))return
 assert.ok(!/(?:^|\/)\.[^/]+|private|credentials|secrets/i.test(path),'Nonpublic path must not enter the bundle')
 const bytes=await readFile(path),target=join(destination,path)
 assert.ok(!/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|SWA_CLI_DEPLOYMENT_TOKEN\s*=/.test(bytes.toString()),'Credential-shaped data rejected')
 await mkdir(dirname(target),{recursive:true});await copyFile(path,target)
 records.push({path,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')})
}
for(const path of ['package.json','package-lock.json','contracts/package.json','contracts/package-lock.json','contracts/hardhat.config.js',
 'contracts/src','contracts/test','contracts/scripts','contracts/vendor/souli/contracts','src',
 'contracts/artifacts/contracts.json','contracts/artifacts/standard-input.json','contracts/release/base-pilot.review.json',
 'contracts/release/base-sale.draft.json','tmp/commercial-v2/deployment-review.json','tmp/commercial-v2/verified-admin.json','tmp/commercial-v2/verified-sale.json',
 'docs/INDEPENDENT-REVIEW-HANDOFF.ko.md','docs/LP-ONE-YEAR-PLAN.ko.md','docs/COMMERCIAL-SALE-PLAN.ko.md','docs/LAUNCH-DECISIONS.ko.md'])await add(path)
for(const name of ['commercial-v2-cycle-complete.json','commercial-v2-latest-state.json','commercial-v2-sourcify-results.json',
 'commercial-v2-purchase1-receipt.json','commercial-v2-pause-receipt.json','commercial-v2-recover-receipt.json','commercial-v2-collect-receipt.json',
 'commercial-v2-base-fork.json','lp-timelock-base-fork.json','lp-timelock-unit.log','launch-final-contracts.log','launch-final-root-test.log'])await add('logs/sale-checks/'+name)
const summary={createdAt:new Date().toISOString(),kind:'independent-review-input-not-an-audit',externalReviewComplete:false,
 scope:['deployed SouliEthSaleV2','deployed SouliThreeWalletControllerV2','original SOULI compatibility','wallet clients','proposed standard LP time lock'],
 excluded:['private wallet labels','cloud credentials','media assets','node_modules','external messages'],files:records}
await writeFile(join(destination,'MANIFEST.json'),JSON.stringify(summary,null,2)+'\n')
await writeFile(join(destination,'README.md'),'# SOULI V2 review input\n\nRead docs/INDEPENDENT-REVIEW-HANDOFF.ko.md first. This is NOT an independent audit report. No public LP lock exists.\n\nNode >=24: run npm ci at root, then npm ci and npm test in contracts/. Current expected count: 151 tests. Optional npm run test:lp-timelock-fork uses read-only Base RPC and LOCAL 31337 transactions.\n\nMANIFEST.json records SHA-256 for all copied files. Media and credentials are excluded; this is not a full website deployment package. Legacy Safe/automatic-LP experiments are not the current product.\n')
for(const record of records)assert.equal(createHash('sha256').update(await readFile(join(destination,record.path))).digest('hex'),record.sha256)
await writeFile('logs/sale-checks/independent-review-bundle.json',JSON.stringify({directory:destination,files:records.length,bytes:records.reduce((sum,r)=>sum+r.bytes,0),verified:true,sent:false,externalReviewComplete:false},null,2)+'\n')
console.log(JSON.stringify({directory:destination,files:records.length,sent:false,externalReviewComplete:false}))
