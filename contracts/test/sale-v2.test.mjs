import {before,after,beforeEach,test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {network} from 'hardhat'
import {BrowserProvider,ContractFactory,Contract,keccak256,toUtf8Bytes} from 'ethers'
import {prepareControllerDeployment,preflightController,inspectControllerDeployment} from '../scripts/three-wallet-release-tools.mjs'
import {prepareDeployment,selectSaleArtifact} from '../scripts/release-tools.mjs'
import {createNativeSaleClient,validateSaleConfig} from '../../src/lighthouse/native-sale.mjs'
import {createAdminClient,readAdminState} from '../../src/sale-admin/client.mjs'
import {hasSaleEnded,saleEndLabel,saleQuoteDeadline} from '../../src/lighthouse/sale-window.mjs'

const PRICE=100000000n,UNIT=1000000000n,options={allowTest:true}
const store=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)}}
const sent=async p=>(await p).wait()
let connection,reader,p,accounts,arts,token,input,review,config,controller,sale,snap,now
async function deploy(name,args=[]){const a=arts[name],c=await new ContractFactory(a.abi,a.bytecode,accounts[0]).deploy(...args);await c.waitForDeployment();return c}
async function setup(asset=token,overrides={}){
 const data={...input,token:await asset.getAddress(),nonce:String(await p.getTransactionCount(accounts[0].address)),...overrides}
 const r=await prepareControllerDeployment(data,arts,options)
 await preflightController(p,r,arts,options)
 await sent(accounts[0].sendTransaction({...r.transaction,nonce:Number(r.input.nonce)}))
 const checked=await inspectControllerDeployment(p,r,arts,options)
 return {r,conf:checked.candidateAdminManifest,ctl:new Contract(r.controller,arts.SouliThreeWalletControllerV2.abi,accounts[0]),shop:new Contract(r.sale,arts.SouliEthSaleV2.abi,p)}
}
async function fund(ctl=controller,asset=token,quantity=1000n){await sent(asset.approve(await ctl.getAddress(),quantity*UNIT));await sent(ctl.depositStock(quantity));await sent(ctl.startSale())}
const bridge=index=>({request:args=>args.method==='eth_accounts'?[accounts[index].address]:reader.request(args)})
const client=()=>createNativeSaleClient(config.sale,()=>buyerBridge,{...options,storage:store()})
let buyerBridge
const admin=index=>createAdminClient(config,()=>adminBridges[index],reader,store(),accounts[index].address,options)
let adminBridges
async function execute(c,action,quantity){await c.send(await c.review(action,quantity));await p.send('evm_mine',[]);assert.equal((await c.recover()).status,'confirmed')}
before(async()=>{
 arts=JSON.parse(readFileSync(new URL('../artifacts/contracts.json',import.meta.url))).contracts
 connection=await network.create('default');reader=connection.provider;p=new BrowserProvider(reader,undefined,{cacheTimeout:-1})
 assert.equal((await p.getNetwork()).chainId,31337n)
 accounts=await p.listAccounts();token=await deploy('TestToken');now=(await p.getBlock('latest')).timestamp
 input={version:2,chainId:31337,token:await token.getAddress(),deployer:accounts[0].address,operators:accounts.slice(0,3).map(a=>a.address),unitPriceWei:String(PRICE),saleCap:'1000',walletCap:'1000',startsAt:String(now-1),endsAt:'0'}
 const x=await setup();review=x.r;config=x.conf;controller=x.ctl;sale=x.shop
 buyerBridge=bridge(3);adminBridges=[0,1,2].map(bridge)
 snap=await p.send('evm_snapshot',[])
})
beforeEach(async()=>{await p.send('evm_revert',[snap]);snap=await p.send('evm_snapshot',[])})
after(async()=>{p?.destroy();await connection?.close()})

test('V2 has explicit zero-end and 50:50 disclosed policy, while exact V1 artifacts stay unchanged',async()=>{
 assert.equal(await sale.VERSION(),2n);assert.equal(await sale.endsAt(),0n);assert.equal(await sale.paused(),true)
 assert.equal(config.sale.terms.endPolicy,'sellout');assert.equal(config.sale.terms.useOfProceeds.lpBps,5000)
 assert.equal(config.sale.terms.useOfProceeds.enforcedOnChain,false)
 assert.equal(saleEndLabel('0'),'Until sold out · no calendar deadline')
 assert.equal(hasSaleEnded('0',now),false);assert.equal(hasSaleEnded(String(now),now),true)
 assert.equal(saleQuoteDeadline(now,0,120),now+120);assert.equal(saleQuoteDeadline(now,now+20,120),now+19)
 const pilot=JSON.parse(readFileSync(new URL('../release/base-pilot.review.json',import.meta.url)))
 assert.equal(keccak256(arts.SouliEthSale.bytecode),pilot.saleCreationCodeHash)
 assert.equal(keccak256(arts.SouliThreeWalletController.bytecode),pilot.controllerCreationCodeHash)
 const exported=JSON.parse(readFileSync(new URL('../../src/testnet/contracts.generated.json',import.meta.url)))
 for(const [name,art] of Object.entries(exported.contracts))assert.equal(arts[name].bytecode,art.bytecode,`Public V1/testnet artifact changed: ${name}`)
})
test('changed policy/version cannot masquerade as a reviewed sale, even with a recalculated local hash',async()=>{
 for(const edit of [{version:1},{version:3},{endPolicy:'dated'},{useOfProceeds:{lpBps:1500,operationsBps:8500,enforcedOnChain:false}},{useOfProceeds:{lpBps:5000,operationsBps:5000,enforcedOnChain:true}},{startsAt:'8640000000001'}]){
  const terms={...config.sale.terms,...edit},altered={...config.sale,terms,termsHash:keccak256(toUtf8Bytes(JSON.stringify(terms)))}
  assert.throws(()=>validateSaleConfig(altered,options))
 }
 await assert.rejects(prepareControllerDeployment({...input,version:1,nonce:String(await p.getTransactionCount(accounts[0].address))},arts,options),/limits/)
 assert.equal(selectSaleArtifact(arts,2),arts.SouliEthSaleV2)
 assert.equal(selectSaleArtifact(arts),arts.SouliEthSale)
 await assert.rejects(prepareDeployment({...input,owner:accounts[0].address,treasury:accounts[1].address},arts.SouliEthSale,options),/artifact version/)
 const terms={...config.sale.terms,unitPriceWei:'1'},altered={...config.sale,terms,termsHash:keccak256(toUtf8Bytes(JSON.stringify(terms)))}
 await assert.rejects(createNativeSaleClient(altered,()=>buyerBridge,options).read(),/terms/)
})
test('no-deadline client still uses expiring quotes and works years later',async()=>{
 await fund();const c=client(),q=await c.quote('1')
 assert.ok(q.deadline>now&&q.deadline<now+1000)
 await p.send('evm_setNextBlockTimestamp',[q.deadline+1]);await p.send('evm_mine',[])
 await assert.rejects(c.buy(q),/changed/);assert.equal(await sale.sold(),0n)
 await p.send('evm_setNextBlockTimestamp',[now+10*365*86400]);await p.send('evm_mine',[])
 const next=client(),fresh=await next.quote('7');await next.buy(fresh);await p.send('evm_mine',[])
 assert.equal((await next.checkReceipt()).status,'success');assert.equal(await token.balanceOf(accounts[3].address),7n*UNIT)
 assert.equal((await readAdminState(reader,config,options)).status,'Open')
})
test('actual admin clients pause/recover/restock and collect without treating zero as expired',async()=>{
 const a=admin(0),b=admin(1),c=admin(2)
 await execute(a,'approve','1000');await execute(a,'deposit','1000');await execute(a,'start')
 const buy=client();await buy.buy(await buy.quote('210'));await p.send('evm_mine',[]);assert.equal((await buy.checkReceipt()).status,'success')
 await assert.rejects(c.review('recover','1'),/Pause/)
 await execute(c,'pause');await execute(c,'recover','790');await execute(c,'approve','790');await execute(c,'deposit','790');await execute(c,'start')
 await execute(b,'collect')
 assert.equal(await p.getBalance(review.sale),0n);assert.equal(await p.getBalance(review.controller),0n)
 assert.equal(await sale.proceedsWei(),210n*PRICE);assert.equal(await sale.available(),790n)
 assert.equal(await token.allowance(accounts[2].address,review.controller),0n)
})
test('V2 stays open across staged restocks, includes sold stock in capacity and rejects an outdated overfunding review',async()=>{
 const a=admin(0)
 await execute(a,'approve','300');await execute(a,'deposit','300');await execute(a,'start')
 await sent(sale.connect(accounts[3]).buy(100,now+3600,{value:100n*PRICE}))
 let state=await a.read()
 assert.equal(state.available,200n);assert.equal(state.remainingToFund,700n)
 // Another operator may fill some capacity after the first review.
 const old=await a.review('approve','700')
 await sent(token.transfer(accounts[1].address,100n*UNIT))
 await execute(admin(1),'approve','100');await execute(admin(1),'deposit','100')
 await assert.rejects(a.send(old),/remaining inventory/)
 await execute(a,'approve','600');await execute(a,'deposit','600')
 assert.equal(await sale.paused(),false)
 state=await a.read();assert.equal(state.available,900n);assert.equal(state.remainingToFund,0n)
 await assert.rejects(a.review('approve','1'),/remaining inventory/)
 await assert.rejects(a.review('recover','1'),/Pause/)
 await sent(sale.connect(accounts[3]).buy(900,now+3600,{value:900n*PRICE}))
 assert.equal(await sale.sold(),1000n);assert.equal(await sale.proceedsWei(),1000n*PRICE)
 assert.equal(await token.balanceOf(accounts[3].address),1000n*UNIT)
 assert.equal((await a.read()).status,'Sold out')
})

test('V2 can run out of first stock and resume by restocking without reopening or resetting sold',async()=>{
 const a=admin(0)
 await execute(a,'approve','100');await execute(a,'deposit','100');await execute(a,'start')
 await sent(sale.connect(accounts[3]).buy(100,now+3600,{value:100n*PRICE}))
 assert.equal((await a.read()).status,'Out of stock');assert.equal(await sale.paused(),false)
 await assert.rejects(client().quote('1'),/stock/)
 await execute(a,'approve','900');await execute(a,'deposit','900')
 assert.equal((await a.read()).status,'Open');assert.equal(await sale.sold(),100n)
 const buyer=client();await buyer.buy(await buyer.quote('1'));await p.send('evm_mine',[])
 assert.equal((await buyer.checkReceipt()).status,'success');assert.equal(await sale.sold(),101n)
})

test('sellout cannot be reset by restocking, pausing or the passage of time',async()=>{
 await fund();await sent(sale.connect(accounts[3]).buy(1000,now+3600,{value:1000n*PRICE}))
 assert.equal((await readAdminState(reader,config,options)).status,'Sold out')
 await sent(controller.pauseSale());await sent(token.approve(review.controller,UNIT));await sent(controller.depositStock(1))
 assert.equal(await sale.available(),0n);await assert.rejects(controller.startSale());await assert.rejects(admin(0).review('start'))
 await p.send('evm_setNextBlockTimestamp',[now+100*365*86400]);await p.send('evm_mine',[])
 await assert.rejects(controller.startSale());await sent(controller.connect(accounts[2]).recoverInventory(1))
 assert.equal(await sale.sold(),1000n);assert.equal(await sale.purchased(accounts[3].address),1000n)
})
test('scheduled start and finite V2 end retain exact boundary behavior',async()=>{
 const x=await setup(token,{startsAt:String(now+100),endsAt:String(now+200)})
 await fund(x.ctl,token,10n)
 await assert.rejects(x.shop.connect(accounts[3]).buy(1,now+400,{value:PRICE}))
 await p.send('evm_setNextBlockTimestamp',[now+100]);await sent(x.shop.connect(accounts[3]).buy(1,now+400,{value:PRICE,gasLimit:500000}))
 await p.send('evm_setNextBlockTimestamp',[now+200]);await p.send('evm_mine',[])
 await assert.rejects(x.shop.connect(accounts[3]).buy(1,now+400,{value:PRICE}))
 assert.equal((await readAdminState(reader,x.conf,options)).status,'Ended')
 await sent(x.ctl.pauseSale());await sent(x.ctl.recoverInventory(9));await sent(x.ctl.collectProceeds())
})
test('bad payments, token failures, unauthorized operators and reentrancy retain atomic protection',async()=>{
 await fund()
 for(const [q,value] of [[0n,0n],[1n,PRICE+1n],[2n,PRICE],[1001n,1001n*PRICE]])await assert.rejects(sale.connect(accounts[3]).buy(q,now+3600,{value}))
 for(const method of ['setFailure','setFee']){await sent(token[method](true));await assert.rejects(sale.connect(accounts[3]).buy(1,now+3600,{value:PRICE}));await sent(token[method](false))}
 assert.equal(await sale.sold(),0n);assert.equal(await p.getBalance(review.sale),0n)
 for(const method of ['pauseSale','startSale','collectProceeds','recoverHeldTokens'])await assert.rejects(controller.connect(accounts[3])[method]())
 await assert.rejects(controller.connect(accounts[3]).recoverInventory(1));await assert.rejects(controller.recoverInventory(1))
 await assert.rejects(accounts[3].sendTransaction({to:review.sale,value:PRICE}))
 await sent(token.setCallback(review.sale,sale.interface.encodeFunctionData('buy',[1,now+3600])))
 await sent(sale.connect(accounts[3]).buy(2,now+3600,{value:2n*PRICE}));assert.equal(await token.callbackSucceeded(),false)
})
test('callback recipient cannot collect V2 proceeds twice; rejected receivers roll back collection',async()=>{
 for(const receiverType of ['ReentrantOperator','RejectingOperator']){
  const receiver=await deploy(receiverType),x=await setup(token,{operators:[accounts[0].address,await receiver.getAddress(),accounts[2].address]})
  await fund(x.ctl,token,10n);await sent(x.shop.connect(accounts[3]).buy(3,now+3600,{value:3n*PRICE}))
  if(receiverType==='RejectingOperator'){
   await assert.rejects(receiver.collect(await x.ctl.getAddress()));assert.equal(await p.getBalance(await x.shop.getAddress()),3n*PRICE)
  }else{
   await sent(receiver.collect(await x.ctl.getAddress()));assert.equal(await receiver.callbackSucceeded(),false);assert.equal(await receiver.received(),3n*PRICE)
  }
 }
})
test('original ERC20i accepts full 4.2M V2 stock, keeps 2.1M LP stock separate, and preserves delivery/recovery',async()=>{
 const original=await deploy('Souli');await sent(original.launch(accounts[0].address))
 await p.send('evm_setNextBlockTimestamp',[now+86400]);await p.send('evm_mine',[])
 const mature=(await p.getBlock('latest')).timestamp,x=await setup(original,{saleCap:'4200000',walletCap:'700000',startsAt:String(mature-1)})
 const reserveBefore=await original.balanceOf(accounts[0].address)
 await fund(x.ctl,original,4200000n)
 assert.equal(await original.balanceOf(accounts[0].address),reserveBefore-4200000n*UNIT)
 assert.ok(await original.balanceOf(accounts[0].address)>=2100000n*UNIT)
 await sent(x.shop.connect(accounts[3]).buy(500000,mature+3600,{value:500000n*PRICE}))
 assert.equal((await original.dynamicInscription(accounts[3].address)).seed,500000n)
 await sent(x.shop.connect(accounts[3]).buy(1,mature+3600,{value:PRICE}))
 await assert.rejects(x.shop.connect(accounts[3]).buy(200000,mature+3600,{value:200000n*PRICE}))
 await sent(x.ctl.connect(accounts[2]).pauseSale());await sent(x.ctl.connect(accounts[2]).recoverInventory(3699999))
 await sent(x.ctl.connect(accounts[1]).collectProceeds())
 assert.equal(await original.balanceOf(accounts[3].address),500001n*UNIT)
 assert.equal(await original.balanceOf(await x.shop.getAddress()),0n);assert.equal(await original.balanceOf(await x.ctl.getAddress()),0n)
 assert.equal(await original.allowance(accounts[0].address,await x.ctl.getAddress()),0n)
 assert.equal(await original.allowance(await x.ctl.getAddress(),await x.shop.getAddress()),0n)
 assert.equal(await x.shop.proceedsWei(),500001n*PRICE)
})
