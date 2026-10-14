// Read existing Sourcify jobs once. No resubmission or chain transaction.
import {readFileSync,writeFileSync} from 'node:fs'
const logs=new URL('../../logs/sale-checks/',import.meta.url)
const submitted=JSON.parse(readFileSync(new URL('commercial-v2-sourcify-submission.json',logs)))
const checks=await Promise.all(submitted.jobs.map(async job=>{
 const id=job.result?.verificationId
 if(!/^[0-9a-f-]{36}$/i.test(id||''))throw Error('No valid saved verification job')
 const response=await fetch(`https://sourcify.dev/server/v2/verify/${id}`,{signal:AbortSignal.timeout(20000)})
 return {name:job.name,address:job.address,status:response.status,result:await response.json()}
}))
writeFileSync(new URL('commercial-v2-sourcify-results.json',logs),JSON.stringify({checkedAt:new Date().toISOString(),checks},null,2)+'\n')
for(const entry of checks){
 console.log(JSON.stringify({name:entry.name,address:entry.address,httpStatus:entry.status,completed:entry.result.isJobCompleted,contract:entry.result.contract,externalVerifications:entry.result.externalVerifications}))
 if(entry.status!==200||!entry.result.isJobCompleted||entry.result.contract?.runtimeMatch!=='exact_match'||entry.result.contract?.creationMatch!=='exact_match'||entry.result.contract.chainId!=='8453'||entry.result.contract.address.toLowerCase()!==entry.address.toLowerCase())process.exitCode=1
}
