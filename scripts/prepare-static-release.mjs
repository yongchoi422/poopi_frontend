// Prepare a fresh, immutable directory for a manual Static Web Apps deployment.
// Does not upload files, read cloud credentials, or change any cloud resource.
import assert from 'node:assert/strict'
import {mkdir,mkdtemp,cp,readdir,readFile,writeFile,lstat} from 'node:fs/promises'
import {resolve,join} from 'node:path'
import {createHash} from 'node:crypto'
import {execFileSync} from 'node:child_process'
import { MAINNET_ADMIN } from '../src/sale-admin/config.mjs'
import { LIVE_SALE } from '../src/lighthouse/sale-config.mjs'
import { PILOT_SALE, PILOT_V2_SALE } from '../src/lighthouse/sale-profile.mjs'
import {checkOpenedLaunch} from './launch-release-gate.mjs'
import { validateSaleConfig } from '../src/lighthouse/native-sale.mjs'

const input=process.argv[2]
if(!input)throw Error('Usage: node scripts/prepare-static-release.mjs https://api.souli.net')
const api=new URL(input)
assert.equal(api.protocol,'https:');assert.equal(api.origin,input)
assert.ok(!api.username&&!api.password)
const config=JSON.parse(await readFile('deploy/azure/staticwebapp.config.json','utf8'))
assert.ok(config.globalHeaders['Content-Security-Policy'].split(/[ ;]+/).includes(api.origin),'CSP must permit the chosen API origin.')
// Read-only verification immediately before building this release.
execFileSync(process.execPath,['scripts/prepare-sale-opening.mjs'],{stdio:'inherit',windowsHide:true})
execFileSync(process.execPath,['contracts/scripts/read-commercial-state.mjs'],{stdio:'pipe',windowsHide:true})
const latest=JSON.parse(await readFile('logs/sale-checks/commercial-v2-latest-state.json','utf8'))
const reviewedAdmin=JSON.parse(await readFile('tmp/commercial-v2/verified-admin.json','utf8'))
const pilot=validateSaleConfig(PILOT_SALE)
assert.equal(pilot.address,'0x83bcB8Ba9b7518CDEc32f2eE0e684f1d7b4ffB01')
assert.equal(pilot.terms.saleCap,'42');assert.equal(pilot.terms.walletCap,'10')
const v2=validateSaleConfig(PILOT_V2_SALE)
const proof=JSON.parse(await readFile('src/site/commercial-proof.json','utf8'))
const opening=JSON.parse(await readFile('src/site/sale-opening.json','utf8'))
checkOpenedLaunch({live:LIVE_SALE,admin:MAINNET_ADMIN,reviewedAdmin,proof,latest,opening})
assert.equal(v2.address,proof.sale);assert.equal(v2.termsHash,proof.termsHash)
assert.equal(proof.commercialCheckoutOpen,false);assert.equal(proof.paused,true)
assert.equal(proof.lpLocked,false);assert.equal(proof.independentAuditPublished,false)
execFileSync(process.execPath,['node_modules/vite/bin/vite.js','build'],{stdio:'inherit',windowsHide:true,env:{...process.env,VITE_API_ORIGIN:api.origin}})
await mkdir('logs/azure-releases',{recursive:true})
const release=await mkdtemp(resolve('logs/azure-releases/static-')),content=join(release,'content')
await cp('dist',content,{recursive:true,errorOnExist:true,force:false})
await writeFile(join(content,'staticwebapp.config.json'),JSON.stringify(config,null,2)+'\n')
const files=[]
async function scan(dir,prefix=''){
 for(const entry of (await readdir(dir)).sort()){
  const path=join(dir,entry),name=prefix+entry,info=await lstat(path)
  assert.ok(!info.isSymbolicLink(),'No symlinks in the deployment.')
  if(info.isDirectory()){await scan(path,name+'/');continue}
  assert.ok(!name.split('/').some(p=>p.startsWith('.')||['logs','server','legacy','tmp','node_modules'].includes(p)))
  assert.ok(!/\.(map|pem|key|pfx|sqlite|db)$/.test(name))
  const bytes=await readFile(path)
  files.push({path:name,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')})
 }
}
await scan(content)
assert.ok(files.some(f=>f.path==='index.html')&&files.some(f=>f.path==='lighthouse.html'))
assert.ok(files.some(f=>f.path==='buy/index.html')&&files.some(f=>f.path==='manage/index.html'))
assert.ok(files.some(f=>f.path==='pilot/index.html'))
assert.ok(files.some(f=>f.path==='pilot-v2/index.html'))
assert.ok(files.some(f=>f.path==='soul/index.html'))
assert.ok(!files.some(f=>f.path==='purchase-lab.html'))
const manifest={createdAt:new Date().toISOString(),apiOrigin:api.origin,liveSaleEnabled:LIVE_SALE.enabled,mainnetAdminEnabled:MAINNET_ADMIN.enabled,mainnetPilot:{path:'/pilot/',address:pilot.address,chainId:pilot.chainId,termsHash:pilot.termsHash,saleCap:pilot.terms.saleCap,walletCap:pilot.terms.walletCap},commercialV2:{path:'/buy/',historicalPath:'/pilot-v2/',address:v2.address,termsHash:v2.termsHash,proofBlock:proof.block,openingBlock:opening.block,openingTransaction:opening.receipts[2].hash,stateCheckedAt:latest.checkedAt,stateBlock:latest.state.block,checkoutOpen:latest.state.status==='Open'},uploaded:false,files}
await writeFile(join(release,'manifest.json'),JSON.stringify(manifest,null,2)+'\n')
console.log(JSON.stringify({release,content,files:files.length,bytes:files.reduce((n,f)=>n+f.bytes,0),uploaded:false},null,2))
