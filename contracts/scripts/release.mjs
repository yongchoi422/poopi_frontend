// Generates unsigned review files or performs read-only checks. Never imports
// keys, creates a signer, submits transactions, or edits the live app manifest.
import { readFileSync, writeFileSync } from 'node:fs'
import { JsonRpcProvider } from 'ethers'
import { prepareDeployment, inspectDeployment, inventoryTransactions, selectSaleArtifact } from './release-tools.mjs'
const [mode,inputPath,arg1,arg2,arg3]=process.argv.slice(2)
const artifacts=JSON.parse(readFileSync(new URL('../artifacts/contracts.json',import.meta.url))).contracts
if(mode==='prepare'){
  if(!inputPath||!arg1)throw Error('Usage: node scripts/release.mjs prepare terms.json review.json')
  const input=JSON.parse(readFileSync(inputPath,'utf8')),a=selectSaleArtifact(artifacts,input.version)
  const review=await prepareDeployment(input,a)
  writeFileSync(arg1,JSON.stringify(review,null,2));console.log('Unsigned deployment review saved:',arg1)
}else if(mode==='verify'){
  if(!inputPath||!arg1||!arg2||!arg3)throw Error('Usage: node scripts/release.mjs verify review.json SALE_ADDRESS WHOLE_STOCK output.json')
  const p=new JsonRpcProvider(process.env.BASE_READ_RPC||'https://base-rpc.publicnode.com')
  try{
    const review=JSON.parse(readFileSync(inputPath,'utf8')),a=selectSaleArtifact(artifacts,review.terms.version),check=await inspectDeployment(p,arg1,review,a)
    writeFileSync(arg3,JSON.stringify({...check,unsignedInventoryPlan:inventoryTransactions(arg1,review,arg2,a)},null,2));console.log('Read-only check and unsigned stock plan saved:',arg3)
  }finally{p.destroy()}
}else throw Error('Choose prepare or verify. Neither command sends a transaction.')
