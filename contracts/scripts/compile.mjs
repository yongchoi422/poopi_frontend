import solc from 'solc'
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
export const root = fileURLToPath(new URL('../', import.meta.url))
const sources = {}
function walk(dir) {
  for (const file of readdirSync(resolve(root, dir), { withFileTypes: true })) {
    const path = `${dir}/${file.name}`
    if(file.isDirectory())walk(path)
    else if(file.name.endsWith('.sol'))sources[path]={content:readFileSync(resolve(root,path),'utf8')}
  }
}
export function compile() {
  walk('src'); walk('test/fixtures'); walk('vendor/souli/contracts')
  const input={language:'Solidity',sources,settings:{viaIR:true,optimizer:{enabled:true,runs:200},evmVersion:'cancun',outputSelection:{'*':{'*':['abi','evm.bytecode.object','evm.deployedBytecode.object','evm.deployedBytecode.immutableReferences','storageLayout']}}}}
  const output=JSON.parse(solc.compile(JSON.stringify(input),{import:path=>{
    if(!path.startsWith('@openzeppelin/contracts/'))return {error:'Import not allowed: '+path}
    const file=resolve(root,'node_modules',path)
    if(relative(resolve(root,'node_modules/@openzeppelin/contracts'),file).startsWith('..'))return {error:'Invalid import'}
    try{const content=readFileSync(file,'utf8');sources[path]={content};return {contents:content}}catch{return {error:'Missing import: '+path}}
  }}))
  const errors=(output.errors||[]).filter(e=>e.severity==='error')
  if(errors.length)throw Error(errors.map(e=>e.formattedMessage).join('\n'))
  const contracts={}
  for(const [file,items]of Object.entries(output.contracts))for(const [name,item]of Object.entries(items))if(item.evm.bytecode.object)contracts[name]={source:file,abi:item.abi,bytecode:'0x'+item.evm.bytecode.object,runtime:'0x'+item.evm.deployedBytecode.object,immutableReferences:item.evm.deployedBytecode.immutableReferences}
  mkdirSync(resolve(root,'artifacts'),{recursive:true})
  writeFileSync(resolve(root,'artifacts/contracts.json'),JSON.stringify({compiler:solc.version(),settings:input.settings,contracts},null,2))
  writeFileSync(resolve(root,'artifacts/standard-input.json'),JSON.stringify(input,null,2))
  return contracts
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log('Compiled:',Object.keys(compile()).join(', '))
