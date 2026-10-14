import { spawnSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
const run=(args)=>{
  const result=spawnSync(process.execPath,args,{stdio:'inherit',windowsHide:true})
  if(result.error)throw result.error
  if(result.status!==0)process.exit(result.status||1)
}
for(const file of readdirSync('scripts').filter(f=>/^test-.*\.mjs$/.test(f)))run([`scripts/${file}`])
run(['--test',...readdirSync('server/test').filter(f=>f.endsWith('.test.mjs')).map(f=>`server/test/${f}`)])
run(['node_modules/vite/bin/vite.js','build'])
run(['scripts/check-package.mjs'])
console.log('PASS: release checks. Deployment, real MetaMask, transactions and Docker execution are separate gates.')
