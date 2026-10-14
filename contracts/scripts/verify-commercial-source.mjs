// Publish the verified commercial V2 Solidity sources to Sourcify. No signing or funds.
import {readFileSync,writeFileSync,existsSync} from 'node:fs'
import {posix} from 'node:path'
import solc from 'solc'
const root=new URL('../',import.meta.url),logs=new URL('../../logs/sale-checks/',import.meta.url)
const original=JSON.parse(readFileSync(new URL('artifacts/standard-input.json',root)))
const artifacts=JSON.parse(readFileSync(new URL('artifacts/contracts.json',root))).contracts
const review=JSON.parse(readFileSync(new URL('../tmp/commercial-v2/deployment-review.json',root)))
const receipt=JSON.parse(readFileSync(new URL('commercial-v2-deployment-receipt.json',logs)))
if(receipt.status!=='success'||receipt.controller!==review.controller||receipt.confirmations<2)throw Error('Verified deployment required')
if(existsSync(new URL('commercial-v2-sourcify-submission.json',logs)))throw Error('Existing source verification submission found; inspect its jobs before retrying')
const sources={}
function include(file){
 if(sources[file])return
 if(!original.sources[file])throw Error('Missing compiler source '+file)
 sources[file]=original.sources[file]
 for(const match of sources[file].content.matchAll(/import\s+(?:[^;]*?from\s*)?["']([^"']+)["']\s*;/g))include(match[1].startsWith('.')?posix.normalize(posix.join(posix.dirname(file),match[1])):match[1])
}
include('src/SouliThreeWalletControllerV2.sol')
const input={...original,sources},output=JSON.parse(solc.compile(JSON.stringify(input)))
const errors=(output.errors||[]).filter(x=>x.severity==='error');if(errors.length)throw Error(errors.map(x=>x.formattedMessage).join('\n'))
for(const name of ['SouliThreeWalletControllerV2','SouliEthSaleV2'])if('0x'+output.contracts[artifacts[name].source][name].evm.bytecode.object!==artifacts[name].bytecode)throw Error('Reduced verification sources changed bytecode: '+name)
writeFileSync(new URL('commercial-v2-verification-input.json',logs),JSON.stringify(input,null,2)+'\n')
const jobs=[]
for(const [name,address] of [['SouliThreeWalletControllerV2',review.controller],['SouliEthSaleV2',review.sale]]){
 const request={stdJsonInput:input,compilerVersion:solc.version().split('.Emscripten')[0],contractIdentifier:`${artifacts[name].source}:${name}`,creationTransactionHash:receipt.hash}
 const response=await fetch(`https://sourcify.dev/server/v2/verify/8453/${address}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(request),signal:AbortSignal.timeout(25000)})
 const result=await response.json();jobs.push({name,address,httpStatus:response.status,result})
 console.log(JSON.stringify(jobs.at(-1)))
 writeFileSync(new URL('commercial-v2-sourcify-submission.json',logs),JSON.stringify({submittedAt:new Date().toISOString(),sourceFiles:Object.keys(sources).length,publicChainTransactionsSent:0,jobs},null,2)+'\n')
 if(!response.ok)throw Error('Source verification submission failed; inspect saved result before retrying')
}
