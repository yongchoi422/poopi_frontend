// Build only the phone purchase check, preserving the previously deployed site.
// This script does not read cloud credentials or upload a release.
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, cp, readdir, readFile, writeFile, lstat } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { createHash } from 'node:crypto'
import { build, loadConfigFromFile } from 'vite'
import { LIVE_SALE } from '../src/lighthouse/sale-config.mjs'
import { MAINNET_ADMIN } from '../src/sale-admin/config.mjs'
import { PILOT_V2_SALE } from '../src/lighthouse/sale-profile.mjs'
import { validateSaleConfig } from '../src/lighthouse/native-sale.mjs'

const base = resolve(process.argv[2] || 'logs/azure-releases/static-7NLqd2')
const baseManifest = JSON.parse(await readFile(join(base,'manifest.json'),'utf8'))
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
assert.equal(LIVE_SALE.enabled,false)
assert.equal(MAINNET_ADMIN.enabled,false)
const sale = validateSaleConfig(PILOT_V2_SALE)
assert.deepEqual(PILOT_V2_SALE,JSON.parse(await readFile('tmp/commercial-v2/verified-sale.json','utf8')))
assert.equal(sale.address,'0x9B3b5BFbc22821416e390E10e0a30C1AC1960B68')
const safePath = path => assert.ok(!path.startsWith('/') && !path.includes('\\') && !path.split('/').some(s=>!s||s.startsWith('.')||['logs','server','legacy','tmp','node_modules'].includes(s)),`Unsafe release path: ${path}`)
for(const file of baseManifest.files){safePath(file.path);assert.equal(sha(await readFile(join(base,'content',file.path))),file.sha256,`Base file changed: ${file.path}`)}
// Refuse to overlay a stale release onto a different live homepage or checkout.
for(const path of ['index.html','buy/index.html','manage/index.html','whitepaper/index.html']){
  const response=await fetch(new URL(path,'https://souli.net/'),{signal:AbortSignal.timeout(30000),cache:'no-store'})
  assert.equal(response.status,200)
  assert.equal(sha(Buffer.from(await response.arrayBuffer())),baseManifest.files.find(f=>f.path===path).sha256,`Live ${path} differs from chosen base`)
}
await mkdir('logs/azure-releases',{recursive:true})
const release=await mkdtemp(resolve('logs/azure-releases/static-v2-'))
const content=join(release,'content'),output=join(release,'build-only')
const loaded=await loadConfigFromFile({command:'build',mode:'production'})
assert.ok(loaded?.config)
process.env.VITE_API_ORIGIN='https://api.souli.net'
await build({...loaded.config,configFile:false,build:{...loaded.config.build,outDir:output,emptyOutDir:true,copyPublicDir:false,rollupOptions:{...loaded.config.build?.rollupOptions,input:{pilotV2:resolve('pilot-v2/index.html')}}}})
await cp(join(base,'content'),content,{recursive:true,errorOnExist:true,force:false})
async function filesIn(dir,prefix=''){
  const files=[]
  for(const entry of (await readdir(dir)).sort()){
    const path=join(dir,entry),name=prefix+entry,stat=await lstat(path)
    assert.ok(!stat.isSymbolicLink())
    if(stat.isDirectory()){files.push(...await filesIn(path,name+'/'));continue}
    safePath(name);assert.ok(!/\.(map|pem|key|pfx|sqlite|db)$/.test(name))
    const bytes=await readFile(path);files.push({path:name,bytes:bytes.length,sha256:sha(bytes)})
  }
  return files
}
const built=await filesIn(output)
assert.ok(built.some(f=>f.path==='pilot-v2/index.html'))
for(const file of built){
  assert.ok(file.path==='pilot-v2/index.html'||file.path.startsWith('assets/'))
  const old=baseManifest.files.find(f=>f.path===file.path)
  if(old){assert.equal(old.sha256,file.sha256,`An existing asset must not change: ${file.path}`);continue}
  await mkdir(join(content,file.path,'..'),{recursive:true})
  await cp(join(output,file.path),join(content,file.path),{errorOnExist:true,force:false})
}
const oldConfig=JSON.parse(await readFile(join(content,'staticwebapp.config.json'),'utf8'))
const routes=[
  {route:'/pilot-v2',rewrite:'/pilot-v2/index.html',headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}},
  {route:'/pilot-v2/*',headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}},
]
assert.ok(!oldConfig.routes.some(r=>r.route.startsWith('/pilot-v2')))
const config={...oldConfig,routes:[...routes,...oldConfig.routes]}
await writeFile(join(content,'staticwebapp.config.json'),JSON.stringify(config,null,2)+'\n')
const files=await filesIn(content)
const preserved=baseManifest.files.filter(f=>f.path!=='staticwebapp.config.json')
for(const old of preserved)assert.equal(files.find(f=>f.path===old.path)?.sha256,old.sha256,`Preserve ${old.path}`)
assert.deepEqual(config.globalHeaders,oldConfig.globalHeaders)
assert.deepEqual(config.routes.slice(2),oldConfig.routes)
const manifest={createdAt:new Date().toISOString(),baseRelease:base,apiOrigin:'https://api.souli.net',liveSaleEnabled:false,mainnetAdminEnabled:false,mainnetPilot:baseManifest.mainnetPilot,mainnetCheck:{path:'/pilot-v2/',address:sale.address,chainId:sale.chainId,termsHash:sale.termsHash,initialStock:'42',saleCap:sale.terms.saleCap,unitPriceWei:sale.terms.unitPriceWei},preservedFiles:preserved.length,uploaded:false,files}
await writeFile(join(release,'manifest.json'),JSON.stringify(manifest,null,2)+'\n')
await writeFile('logs/sale-checks/commercial-v2-web-release.json',JSON.stringify({release,content,files:files.length,addedFiles:files.length-baseManifest.files.length,preservedFiles:preserved.length,uploaded:false},null,2)+'\n')
console.log(JSON.stringify({release,content,files:files.length,preservedFiles:preserved.length,uploaded:false},null,2))
