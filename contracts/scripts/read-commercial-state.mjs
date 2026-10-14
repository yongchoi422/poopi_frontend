// Read-only: code, immutable terms, admins, stock and proceeds reconciliation.
import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {readAdminState} from '../../src/sale-admin/client.mjs'
import {createAdminReader} from '../../src/sale-admin/read-rpc.mjs'
const root=new URL('../../',import.meta.url)
const config=JSON.parse(await readFile(new URL('tmp/commercial-v2/verified-admin.json',root),'utf8'))
const reader=createAdminReader(8453)
try{
 const state=await readAdminState(reader,config,{account:config.operators[0]})
 const record={checkedAt:new Date().toISOString(),sale:config.sale.address,controller:config.controller,state,publicTransactionsSent:0}
 const json=JSON.stringify(record,(_,v)=>typeof v==='bigint'?v.toString():v,2)
 await mkdir(new URL('logs/sale-checks/',root),{recursive:true})
 await writeFile(new URL('logs/sale-checks/commercial-v2-latest-state.json',root),json+'\n')
 console.log(json)
}finally{reader.destroy()}
