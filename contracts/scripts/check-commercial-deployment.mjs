// Verify an explicitly supplied deployment receipt. Read-only chain access.
import {readFileSync,writeFileSync} from 'node:fs'
import {BrowserProvider} from 'ethers'
import {inspectControllerDeployment} from './three-wallet-release-tools.mjs'
import {createAdminReader} from '../../src/sale-admin/read-rpc.mjs'
const hash=process.argv[2]
if(!/^0x[0-9a-f]{64}$/i.test(hash||''))throw Error('Provide the deployment transaction hash')
const repo=new URL('../../',import.meta.url),local=new URL('tmp/commercial-v2/',repo)
const read=path=>JSON.parse(readFileSync(new URL(path,repo)))
const review=read('tmp/commercial-v2/deployment-review.json'),artifacts=read('contracts/artifacts/contracts.json').contracts
const transport=createAdminReader(8453)
const reader=new BrowserProvider(transport,undefined,{cacheTimeout:-1})
const same=(a,b)=>String(a).toLowerCase()===String(b).toLowerCase()
try{
 const [tx,receipt,head]=await Promise.all([reader.getTransaction(hash),reader.getTransactionReceipt(hash),reader.getBlockNumber()])
 if(!tx||!receipt)throw Error('Transaction has not been mined; do not resend')
 if(!same(tx.from,review.input.deployer)||tx.to!==null||!same(tx.data,review.transaction.data)||tx.value!==0n||String(tx.nonce)!==review.input.nonce||Number(tx.chainId)!==8453)throw Error('Transaction differs from the frozen review')
 if(review.input.deployerAccount&&(tx.type!==2||tx.authorizationList?.length))throw Error('Not the reviewed direct type-2 transaction')
 if(receipt.status!==1||!same(receipt.contractAddress,review.controller))throw Error('Deployment receipt failed or address differs')
 const confirmations=head-receipt.blockNumber+1
 if(confirmations<2||!same((await reader.getBlock(receipt.blockNumber)).hash,receipt.blockHash))throw Error('Wait for canonical confirmations')
 const verification=await inspectControllerDeployment(reader,review,artifacts)
 const result={status:'success',checkedAt:new Date().toISOString(),hash,block:receipt.blockNumber,blockHash:receipt.blockHash,confirmations,controller:review.controller,sale:review.sale,gasUsed:receipt.gasUsed.toString(),verification,publicTransactionsSentByThisCheck:0}
 writeFileSync(new URL('logs/sale-checks/commercial-v2-deployment-receipt.json',repo),JSON.stringify(result,null,2)+'\n')
 writeFileSync(new URL('verified-admin.json',local),JSON.stringify(verification.candidateAdminManifest,null,2)+'\n')
 writeFileSync(new URL('verified-sale.json',local),JSON.stringify(verification.candidateManifest,null,2)+'\n')
 console.log(JSON.stringify({status:result.status,hash,confirmations,controller:review.controller,sale:review.sale,paused:verification.paused,available:verification.available,publicWebsiteEnabled:false}))
}finally{reader.destroy();transport.destroy()}
