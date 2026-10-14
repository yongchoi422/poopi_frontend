import { readFile } from 'node:fs/promises'
const allowed=new Set(['eth_chainId','eth_accounts','eth_blockNumber','eth_getCode','eth_getBlockByNumber','eth_getBalance','eth_call','eth_estimateGas','eth_gasPrice','eth_sendTransaction','eth_getTransactionReceipt','eth_getTransactionByHash'])
export function saleLabPlugin(){return {name:'souli-local-sale-lab',apply:'serve',configureServer(server){
  server.middlewares.use('/__sale-demo',async(req,res)=>{
    res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json')
    const end=(status,body)=>{res.statusCode=status;res.end(JSON.stringify(body))}
    if(process.env.SOULI_SALE_LAB!=='1')return end(404,{error:'Test lab disabled'})
    if(!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress))return end(403,{error:'Local test access only'})
    if(req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`)return end(403,{error:'Origin rejected'})
    try{
      if(req.url==='/config'&&req.method==='GET')return end(200,JSON.parse(await readFile(new URL('../logs/sale-demo/manifest.json',import.meta.url),'utf8')))
      if(req.url!=='/rpc'||req.method!=='POST'||!String(req.headers['content-type']).startsWith('application/json'))return end(404,{error:'Unknown test route'})
      let body='';for await(const chunk of req){body+=chunk;if(body.length>16000)return end(413,{error:'Too large'})}
      const input=JSON.parse(body);if(input.method==='eth_accounts_test')input.method='eth_accounts'
      if(!allowed.has(input.method))return end(403,{error:'Method not enabled in test lab'})
      const rpc=await fetch('http://127.0.0.1:18545',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input),signal:AbortSignal.timeout(10000)})
      return end(200,await rpc.json())
    }catch{return end(503,{error:'Start the disposable local sale demo first.'})}
  })
}}}
