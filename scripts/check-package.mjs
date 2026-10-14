// Import the exact runtime file set declared by the production Dockerfile.
// This catches missing runtime modules without pretending to run Docker.
import { readFile, mkdtemp, mkdir, cp, symlink, readdir, access } from 'node:fs/promises'
import { resolve, join, dirname } from 'node:path'
import { pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'
import assert from 'node:assert/strict'
const docker=await readFile('Dockerfile','utf8')
assert.equal((await readFile('Dockerfile.beta','utf8')).replaceAll('\r\n','\n'),docker.replaceAll('\r\n','\n'),'The explicit beta filename must match the default production image.')
await mkdir(resolve('logs'),{recursive:true})
const stage=await mkdtemp(resolve('logs','package-check-'))
const runtime=docker.split('FROM node:24-bookworm-slim')[2]
assert.ok(runtime,'Runtime stage missing')
for(const [,source,target] of runtime.matchAll(/^COPY ([^\s]+\.mjs) ([^\s]+)$/gm)){
  if(source.includes('*')){
    await mkdir(resolve(stage,target),{recursive:true})
    for(const file of await readdir(dirname(source)))if(file.endsWith('.mjs'))await cp(join(dirname(source),file),resolve(stage,target,file))
  }else{
    await mkdir(dirname(resolve(stage,target)),{recursive:true});await cp(source,resolve(stage,target))
  }
}
await symlink(resolve('server/node_modules'),resolve(stage,'server/node_modules'),process.platform==='win32'?'junction':'dir')
const imports=['app.mjs','firestore-store.mjs','store-config.mjs'].map(file=>`await import(${JSON.stringify(pathToFileURL(resolve(stage,'server',file)).href)})`).join(';')
const result=spawnSync(process.execPath,['--input-type=module','-e',imports],{stdio:'inherit',windowsHide:true})
assert.equal(result.status,0,'Runtime import failed. Check Docker COPY declarations.')
const html=await readFile('dist/lighthouse.html','utf8')
for(const [,asset] of html.matchAll(/(?:src|href)="\.\/([^"?#]+)"/g))await readFile(resolve('dist',asset))
assert.ok(!html.includes('/src/'),'Production must not use the Vite dev entry.')
await assert.rejects(access('dist/purchase-lab.html'),'Local test wallet must not ship as a production entry.')
for(const file of (await readdir('dist/assets')).filter(f=>f.endsWith('.js'))){
  const js=await readFile(resolve('dist/assets',file),'utf8')
  assert.ok(!js.includes('/__sale-demo')&&!js.includes('eth_accounts_test'),'Local RPC bridge leaked into production.')
}
assert.match(docker,/COPY scripts\/sale-lab-plugin\.mjs \.\/scripts\/sale-lab-plugin\.mjs/,'Vite build configuration requires its development plugin source in the builder stage.')
console.log('PASS: isolated Docker runtime file imports and built game assets. Docker image execution not tested here.')
