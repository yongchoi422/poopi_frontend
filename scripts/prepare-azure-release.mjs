// Freeze an allowlisted build context. Does not upload, deploy, sign or mutate cloud resources.
import { mkdir, mkdtemp, readdir, readFile, copyFile, lstat, writeFile } from 'node:fs/promises'
import { resolve, join, relative, dirname, extname } from 'node:path'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'

const root=process.cwd(), records=[]
await mkdir(resolve('logs/azure-releases'),{recursive:true})
const release=await mkdtemp(resolve('logs/azure-releases/release-')),context=join(release,'context')
await mkdir(context)
async function copy(source){
  const full=resolve(root,source),info=await lstat(full)
  if(info.isSymbolicLink())throw Error(`Refusing symlink: ${source}`)
  if(info.isDirectory()){
    for(const entry of (await readdir(full)).sort())await copy(join(source,entry))
    return
  }
  const path=relative(root,full).replaceAll('\\','/')
  if(path.split('/').some(part=>part.startsWith('.')||part==='node_modules'||part==='data')&&!['.dockerignore'].includes(path))throw Error(`Unexpected build-context path: ${path}`)
  if(/\.(pem|key|pfx|p12|sqlite|db)$/i.test(extname(path)))throw Error(`Private/runtime material cannot enter the build: ${path}`)
  const bytes=await readFile(full),target=join(context,source)
  await mkdir(dirname(target),{recursive:true});await copyFile(full,target)
  records.push({path,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')})
}
for(const path of ['Dockerfile','.dockerignore','package.json','package-lock.json','index.html','lighthouse.html','testnet','vite.config.js','scripts/sale-lab-plugin.mjs','src','public','server/package.json','server/package-lock.json'])await copy(path)
for(const path of (await readdir('server')).filter(name=>name.endsWith('.mjs')).sort())await copy('server/'+path)
records.sort((a,b)=>a.path.localeCompare(b.path))
const fingerprint=createHash('sha256').update(JSON.stringify(records)).digest('hex')
const manifest={createdAt:new Date().toISOString(),fingerprint,imageTag:'souli/world:source-'+fingerprint.slice(0,16),gitHead:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8',windowsHide:true}).trim(),includesWorkingTreeChanges:true,liveSaleEnabled:false,files:records}
const sale=await readFile('src/lighthouse/sale-config.mjs','utf8')
if(!/enabled:\s*false/.test(sale))throw Error('Live sale configuration must be reviewed separately before packaging.')
await writeFile(join(release,'manifest.json'),JSON.stringify(manifest,null,2)+'\n')
console.log(JSON.stringify({release,context,fingerprint,imageTag:manifest.imageTag,files:records.length,bytes:records.reduce((n,r)=>n+r.bytes,0),uploaded:false},null,2))

