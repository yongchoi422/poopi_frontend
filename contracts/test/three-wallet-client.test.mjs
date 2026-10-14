import {test,before,after} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {network} from 'hardhat'
import {BrowserProvider,ContractFactory,Interface} from 'ethers'
import {createControllerLab,readController,controllerActionEffect} from '../../src/testnet/three-wallet.mjs'
import {createLab,UNIT} from '../../src/testnet/lab.mjs'
let net,provider,artifacts,accounts,token,ops
const memory=()=>{const values=new Map();return {getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)}}
const wallet=address=>({request:({method,params=[]})=>method==='eth_accounts'?Promise.resolve([address]):net.provider.request({method,params})})
const reader={request:args=>net.provider.request(args)}
before(async()=>{
 artifacts=JSON.parse(readFileSync(new URL('../artifacts/contracts.json',import.meta.url))).contracts
 net=await network.create('sepoliaLab');provider=new BrowserProvider(net.provider,undefined,{cacheTimeout:-1})
 accounts=await net.provider.request({method:'eth_accounts'});ops=accounts.slice(0,3)
 const t=await new ContractFactory(artifacts.SepoliaTestSouli.abi,artifacts.SepoliaTestSouli.bytecode,await provider.getSigner()).deploy();await t.waitForDeployment();token=await t.getAddress()
 await net.provider.request({method:'hardhat_setCode',params:['0x420000000000000000000000000000000000000F','0x600060005260206000f3']})
})
after(async()=>{provider?.destroy();await net?.close()})
async function mined(lab,action,quantity){await lab.send(action,quantity);await net.provider.request({method:'evm_mine'});assert.equal((await lab.recover()).status,'confirmed')}
test('UI client deploys nested shop, survives reload, verifies mobile link and buys through existing client',async()=>{
 const store=memory(),opts={operators:ops,token},w=wallet(accounts[0])
 let lab=createControllerLab(w,reader,artifacts,store,accounts[0],opts)
 await lab.send('deploy');await assert.rejects(lab.send('deploy'),/earlier/)
 lab=createControllerLab(w,reader,artifacts,store,accounts[0],opts)
 await net.provider.request({method:'evm_mine'});assert.equal((await lab.recover()).status,'confirmed')
 await mined(lab,'approve','500');await mined(lab,'deposit','500');await mined(lab,'start')
 const view=await readController(reader,artifacts,lab.state().controller,opts)
 await assert.rejects(readController(reader,artifacts,view.address,{operators:[...ops].reverse(),token}),/wallets differ/)
 const buyer=createLab(wallet(accounts[3]),artifacts,memory(),accounts[3]);await buyer.loadSale(view.sale.manifest.address)
 const client=await buyer.purchaseClient();await client.buy(await client.quote('210'));await net.provider.request({method:'evm_mine'});assert.equal((await client.checkReceipt()).status,'success')
 const mobile=createControllerLab(wallet(accounts[1]),reader,artifacts,memory(),accounts[1],opts);await mobile.load(view.address)
 await mined(mobile,'proceeds');await mined(mobile,'pause');await mined(mobile,'withdraw','290')
 await mined(mobile,'approve','290');await mined(mobile,'deposit','290');await mined(mobile,'start')
 const result=await readController(reader,artifacts,view.address,opts)
 assert.equal(result.sale.inventory,290n*UNIT);assert.equal(result.sale.sold,210n);assert.equal(result.sale.saleEth,0n)
})
test('wrong chain, unregistered account and wallet changes never request a transaction',async()=>{
 let sends=0
 const fake={request:async({method})=>{if(method==='eth_chainId')return '0x2105';if(method==='eth_accounts')return [accounts[0]];sends++;throw Error('No send')}}
 await assert.rejects(createControllerLab(fake,reader,artifacts,memory(),accounts[0],{operators:ops,token}).send('deploy'),/Sepolia only/)
 await assert.rejects(createControllerLab(wallet(accounts[4]),reader,artifacts,memory(),accounts[4],{operators:ops,token}).send('deploy'),/registered operator/)
 await assert.rejects(createControllerLab(wallet(accounts[1]),reader,artifacts,memory(),accounts[0],{operators:ops,token}).send('deploy'),/Wallet changed/)
 assert.equal(sends,0)
})
test('wallet refusal clears only unsent intent; ambiguous errors preserve a blocking recovery record',async()=>{
 for(const code of [4001,-32000]){
  const base=wallet(accounts[0]),w={request:args=>args.method==='eth_sendTransaction'?Promise.reject(Object.assign(Error('wallet failure'),{code})):base.request(args)}
  const lab=createControllerLab(w,reader,artifacts,memory(),accounts[0],{operators:ops,token})
  await assert.rejects(lab.send('deploy'));assert.equal(!!lab.state().pending,code!==4001)
  if(code!==4001)await assert.rejects(lab.send('deploy'),/earlier/)
 }
})

test('wallet-returned smart-transaction hashes require exact events for the requested operation',async()=>{
 const opts={operators:ops,token},store=memory(),base=wallet(accounts[0])
 let lab=createControllerLab(base,reader,artifacts,store,accounts[0],opts)
 await mined(lab,'deploy')
 const relayReader={request:async args=>{
   const value=await reader.request(args)
   return args.method==='eth_getTransactionByHash'&&value?{...value,from:accounts[7],to:accounts[8],input:'0x12345678',nonce:'0xa'}:value
 }}
 lab=createControllerLab(base,relayReader,artifacts,store,accounts[0],opts)
 await lab.send('approve','1000');await net.provider.request({method:'evm_mine'})
 // A manual paste of another relayer receipt must not be accepted.
 const pending=lab.state().pending,original=await reader.request({method:'eth_getTransactionReceipt',params:[pending.hash]})
 const otherHash='0x'+'ab'.repeat(32)
 const unrelated={request:args=>args.params?.[0]===otherHash?relayReader.request({...args,params:[pending.hash]}):relayReader.request(args)}
 await assert.rejects(createControllerLab(base,unrelated,artifacts,store,accounts[0],opts).recover(otherHash),/exact request/)
 assert.ok(lab.state().pending)
 const result=await lab.recover();assert.equal(result.status,'confirmed');assert.equal(result.execution,'smart-account')
 await mined(lab,'deposit','1000');await mined(lab,'start')
 const view=await readController(reader,artifacts,lab.state().controller,opts)
 const buyer=createLab(wallet(accounts[3]),artifacts,memory(),accounts[3]);await buyer.loadSale(view.sale.manifest.address)
 const client=await buyer.purchaseClient();await client.buy(await client.quote('210'));await net.provider.request({method:'evm_mine'});assert.equal((await client.checkReceipt()).status,'success')
 await mined(lab,'proceeds');await mined(lab,'pause');await mined(lab,'withdraw','790')
 const ti=new Interface(artifacts.SepoliaTestSouli.abi)
 assert.equal(controllerActionEffect(original,pending,artifacts,token,view.address,view.sale.manifest.address,accounts[0]),true)
 for(const [owner,spender,units] of [[accounts[1],view.address,1000n*UNIT],[accounts[0],accounts[2],1000n*UNIT],[accounts[0],view.address,999n*UNIT]]){
   const encoded=ti.encodeEventLog(ti.getEvent('Approval'),[owner,spender,units])
   assert.equal(controllerActionEffect({logs:[{address:token,...encoded}]},pending,artifacts,token,view.address,view.sale.manifest.address,accounts[0]),false)
 }
 assert.equal(controllerActionEffect({logs:[]},pending,artifacts,token,view.address,view.sale.manifest.address,accounts[0]),false)
})

test('a successful outer receipt without the intended inner action stays blocked',async()=>{
 const opts={operators:ops,token},store=memory(),base=wallet(accounts[0])
 const initial=createControllerLab(base,reader,artifacts,store,accounts[0],opts);await mined(initial,'deploy')
 const missing={request:async args=>{
   const value=await reader.request(args)
   if(args.method==='eth_getTransactionByHash'&&value)return {...value,from:accounts[7],to:accounts[8],input:'0x12345678'}
   if(args.method==='eth_getTransactionReceipt'&&value)return {...value,logs:[]}
   return value
 }}
 const lab=createControllerLab(base,missing,artifacts,store,accounts[0],opts)
 await lab.send('approve','1000');await net.provider.request({method:'evm_mine'})
 await assert.rejects(lab.recover(),/expected action is missing/)
 assert.ok(lab.state().pending);await assert.rejects(lab.send('approve','1000'),/earlier/)
})
