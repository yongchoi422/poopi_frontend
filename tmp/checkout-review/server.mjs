// Disposable, loopback-only UI review. Uses simulated chain 31337, never Base.
import { createRequire } from 'node:module'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { readFile } from 'node:fs/promises'
import { BrowserProvider, ContractFactory, Contract } from 'ethers'
import { createServer } from 'vite'
import vue from '@vitejs/plugin-vue'
import { prepareControllerDeployment, inspectControllerDeployment } from '../../contracts/scripts/three-wallet-release-tools.mjs'
const require = createRequire(new URL('../../contracts/package.json', import.meta.url))
const { network } = await import(pathToFileURL(require.resolve('hardhat')).href)
const connection = await network.create('default'), rpc = connection.provider
const provider = new BrowserProvider(rpc, undefined, { cacheTimeout: -1 })
if ((await provider.getNetwork()).chainId !== 31337n) throw Error('Disposable local chain only')
const accounts = await provider.listAccounts()
const artifacts = JSON.parse(await readFile(new URL('../../contracts/artifacts/contracts.json', import.meta.url))).contracts
const token = await new ContractFactory(artifacts.TestToken.abi, artifacts.TestToken.bytecode, accounts[0]).deploy()
await token.waitForDeployment()
const timestamp = (await provider.getBlock('latest')).timestamp
const review = await prepareControllerDeployment({version:2,chainId:31337,token:await token.getAddress(),deployer:accounts[0].address,operators:accounts.slice(0,3).map(x=>x.address),nonce:String(await provider.getTransactionCount(accounts[0].address)),unitPriceWei:'26666033792798',saleCap:'4200000',walletCap:'4200000',startsAt:String(timestamp-1),endsAt:'0'},artifacts,{allowTest:true})
await (await accounts[0].sendTransaction(review.transaction)).wait()
const { candidateAdminManifest: manifest } = await inspectControllerDeployment(provider,review,artifacts,{allowTest:true})
const controller = new Contract(review.controller, artifacts.SouliThreeWalletControllerV2.abi, accounts[0])
await (await token.approve(review.controller,1399999n*1000000000n)).wait()
await (await controller.depositStock(1399999)).wait()
await (await controller.startSale()).wait()
const allowed = new Set(['eth_chainId','eth_blockNumber','eth_getCode','eth_getBlockByNumber','eth_getBalance','eth_call','eth_estimateGas','eth_gasPrice','eth_sendTransaction','eth_getTransactionReceipt','eth_getTransactionByHash'])
const local = {name:'disposable-checkout-review',configureServer(server){server.middlewares.use('/__checkout',async(req,res)=>{
 res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store')
 const reply=(status,data)=>{res.statusCode=status;res.end(JSON.stringify(data))}
 if(req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`)return reply(403,{error:'Same origin only'})
 try {
  if(req.method==='GET'&&req.url==='/config')return reply(200,{sale:manifest.sale,account:accounts[3].address})
  if(req.method!=='POST'||req.url!=='/rpc')return reply(404,{error:'Unknown local route'})
  let body='';for await(const chunk of req){body+=chunk;if(body.length>16000)return reply(413,{error:'Too large'})}
  const input=JSON.parse(body);if(!allowed.has(input.method))return reply(403,{error:'Not allowed'})
  const result=await rpc.request(input);reply(200,{result})
 }catch(error){reply(200,{error:{message:error.message,code:error.code}})}
})}}
const server = await createServer({configFile:false,root:fileURLToPath(new URL('../../',import.meta.url)),cacheDir:'node_modules/.vite-checkout-review',plugins:[vue(),local],optimizeDeps:{entries:['tmp/checkout-review/index.html']},server:{host:'127.0.0.1',port:4323,strictPort:true,watch:{ignored:['**/logs/**','**/server/data/**','**/*.zip']},fs:{deny:['.env','.env.*','**/.git/**','**/logs/**','**/server/data/**']}}})
await server.listen()
const timer=setInterval(()=>rpc.request({method:'evm_mine'}).catch(()=>{}),3000)
console.log('DISPOSABLE CHAIN 31337: http://127.0.0.1:4323/tmp/checkout-review/ — no real funds or wallet')
async function close(){clearInterval(timer);await server.close();provider.destroy();await connection.close();process.exit(0)}
process.on('SIGINT',close);process.on('SIGTERM',close)
