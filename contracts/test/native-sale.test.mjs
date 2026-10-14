import { before, after, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { network } from 'hardhat'
import { BrowserProvider, ContractFactory, keccak256, toUtf8Bytes, toQuantity } from 'ethers'
import { createNativeSaleClient, validateSaleConfig, parseWholeSouli } from '../../src/lighthouse/native-sale.mjs'
import { prepareDeployment, inspectDeployment, inventoryTransactions, matchesCompiledRuntime } from '../scripts/release-tools.mjs'
let connection,provider,owner,buyer,other,treasury,token,sale,manifest,snapshot,storage,selected,chain,intercept,sends,client,clock
const PRICE=1000000000000n,UNIT=1000000000n
const raw=async(method,params=[])=>connection.provider.request({method,params})
const bridge={async request({method,params=[]}){
  if(method==='eth_chainId')return chain
  if(method==='eth_accounts')return [selected]
  if(method==='eth_sendTransaction')sends++
  const custom=await intercept?.(method,params);if(custom!==undefined)return custom
  return raw(method,params)
}}
const makeClient=()=>createNativeSaleClient(manifest,()=>bridge,{allowTest:true,storage,now:()=>clock})
const sent=async p=>(await p).wait()
before(async()=>{
  const a=JSON.parse(readFileSync(new URL('../artifacts/contracts.json',import.meta.url))).contracts
  connection=await network.create('default');provider=new BrowserProvider(connection.provider,undefined,{cacheTimeout:-1})
  ;[owner,buyer,other,treasury]=await provider.listAccounts()
  token=await new ContractFactory(a.TestToken.abi,a.TestToken.bytecode,owner).deploy();await token.waitForDeployment()
  const stamp=(await provider.getBlock('latest')).timestamp
  const terms={version:1,chainId:31337,token:await token.getAddress(),treasury:await treasury.getAddress(),unitPriceWei:PRICE.toString(),saleCap:'10000',walletCap:'1000',startsAt:String(stamp-1),endsAt:String(stamp+3600),immediateDelivery:true,automaticLiquidity:false,refundable:false}
  const termsHash=keccak256(toUtf8Bytes(JSON.stringify(terms)))
  sale=await new ContractFactory(a.SouliEthSale.abi,a.SouliEthSale.bytecode,owner).deploy(terms.token,await owner.getAddress(),terms.treasury,PRICE,10000,1000,terms.startsAt,terms.endsAt,termsHash);await sale.waitForDeployment()
  await sent(token.approve(await sale.getAddress(),10000n*UNIT));await sent(sale.deposit(10000));await sent(sale.unpause())
  manifest={enabled:true,mode:'test',chainId:31337,address:await sale.getAddress(),terms,termsHash,runtimeCodeHash:keccak256(await provider.getCode(await sale.getAddress()))}
  snapshot=await raw('evm_snapshot')
})
beforeEach(async()=>{
  await raw('evm_revert',[snapshot]);snapshot=await raw('evm_snapshot')
  const map=new Map();storage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)}
  selected=await buyer.getAddress();chain='0x7a69';intercept=null;sends=0;clock=Date.now();client=makeClient()
})
after(async()=>{provider?.destroy();await connection?.close()})
test('unconfigured, test-only and tampered manifests fail closed',()=>{
  assert.equal(validateSaleConfig({enabled:false}),null)
  assert.throws(()=>validateSaleConfig(manifest))
  assert.throws(()=>validateSaleConfig({...manifest,terms:{...manifest.terms,unitPriceWei:'1'}},{allowTest:true}))
  for(const q of ['0','-1','1.5','1e3','210 SOULI','9999999999999999'])assert.throws(()=>parseWholeSouli(q))
})
test('review → ETH transaction → reload recovery → confirmed real token receipt',async()=>{
  const q=await client.quote('210');assert.equal(q.cost,(210n*PRICE).toString());assert.ok(BigInt(q.feeWei)>0n)
  const pending=await client.buy(q);assert.equal(pending.status,'pending');assert.equal(sends,1)
  client=makeClient();assert.equal(client.pending().hash,pending.hash)
  assert.equal((await client.checkReceipt()).status,'confirming')
  await raw('evm_mine');const receipt=await client.checkReceipt();assert.equal(receipt.status,'success');assert.equal(client.pending(),null)
  assert.equal(await token.balanceOf(selected),210n*UNIT)
})
test('wrong network, wrong bytecode, stale quote and copied quote never request payment',async()=>{
  chain='0x1';await assert.rejects(client.read(),/network/);chain='0x7a69'
  const bad=createNativeSaleClient({...manifest,runtimeCodeHash:'0x'+'11'.repeat(32)},()=>bridge,{allowTest:true,storage});await assert.rejects(bad.read(),/code/)
  const q=await client.quote('1');await assert.rejects(client.buy({...q}),/expired/);clock+=120001;await assert.rejects(client.buy(q),/expired/);assert.equal(sends,0)
})
test('wallet change and sale pause between review and buy block payment',async()=>{
  const q=await client.quote('5');selected=await other.getAddress();await assert.rejects(client.buy(q),/changed/);selected=await buyer.getAddress()
  await sent(sale.pause());await assert.rejects(client.buy(q),/changed/);assert.equal(sends,0)
})
test('oversized quantities and insufficient ETH are rejected before a prompt',async()=>{
  await assert.rejects(client.quote('1001'),/limit/);await assert.rejects(client.quote('10001'),/enough SOULI/)
  await raw('hardhat_setBalance',[selected,'0x1']);await assert.rejects(client.quote('1'));assert.equal(sends,0)
})
test('rejecting the wallet clears intent; ambiguous disconnect preserves it',async()=>{
  intercept=method=>{if(method==='eth_sendTransaction')throw Object.assign(Error('rejected'),{code:4001})}
  await assert.rejects(client.buy(await client.quote('1')),/cancelled/);assert.equal(client.pending(),null)
  intercept=method=>{if(method==='eth_sendTransaction')throw Error('disconnected')}
  await assert.rejects(client.buy(await client.quote('1')),/disconnected/);assert.equal(client.pending().status,'unknown')
  await assert.rejects(client.quote('1'),/earlier/);client.clearUnknown();assert.equal(client.pending(),null)
})
test('double-click and a second client cannot send another purchase',async()=>{
  const q=await client.quote('1'),second=makeClient(),q2=await second.quote('1')
  let release;const barrier=new Promise(resolve=>{release=resolve});let entered
  const started=new Promise(resolve=>{entered=resolve})
  intercept=async(method,params)=>{if(method==='eth_sendTransaction'){entered();await barrier;return raw(method,params)}}
  const first=client.buy(q);await started
  try{await assert.rejects(client.buy(q),/already/);await assert.rejects(second.buy(q2),/earlier|another tab/)}finally{release();await first}
  assert.equal(sends,1)
})
test('disabled storage blocks before broadcast; post-broadcast failure preserves hash in memory',async()=>{
  const set=storage.setItem;storage.setItem=()=>{throw Error('quota')}
  await assert.rejects(client.buy(await client.quote('1')),/No new purchase/);assert.equal(sends,0)
  storage.setItem=set;intercept=async(method,params)=>{if(method==='eth_sendTransaction'){const hash=await raw(method,params);storage.setItem=()=>{throw Error('quota')};return hash}}
  const p=await client.buy(await client.quote('1'));assert.ok(p.hash);assert.equal(p.storageWarning,true);assert.equal(sends,1)
  await raw('evm_mine');assert.equal((await client.checkReceipt()).status,'success')
})
test('unknown transaction hash can be recovered, but other payments cannot be substituted',async()=>{
  let actualHash
  intercept=async(method,params)=>{if(method==='eth_sendTransaction'){actualHash=await raw(method,params);throw Error('connection lost after broadcast')}}
  await assert.rejects(client.buy(await client.quote('3')));assert.equal((await client.checkReceipt()).status,'unknown')
  const unrelated=await other.sendTransaction({to:selected,value:1n});await unrelated.wait()
  await assert.rejects(client.checkReceipt(unrelated.hash),/different wallet/)
  assert.equal((await client.checkReceipt(actualHash)).status,'success');assert.equal(client.pending(),null)
})
test('speed-up replacement is persisted and can be verified after reload',async()=>{
  await raw('evm_setAutomine',[false])
  try{
    const p=await client.buy(await client.quote('2')),original=await raw('eth_getTransactionByHash',[p.hash])
    const hash=await raw('eth_sendTransaction',[{from:selected,to:manifest.address,value:toQuantity(2n*PRICE),data:p.data,nonce:original.nonce,gas:'0x7a120',gasPrice:toQuantity(BigInt(original.gasPrice)*3n)}])
    assert.equal((await client.checkReceipt(hash)).status,'pending');assert.equal(client.pending().hash,hash)
    client=makeClient();await raw('evm_mine');await raw('evm_mine');assert.equal((await client.checkReceipt()).status,'success')
  }finally{await raw('evm_setAutomine',[true])}
})
test('mined failure clears recovery only after confirmation',async()=>{
  await raw('evm_setAutomine',[false])
  try{
    const p=await client.buy(await client.quote('1'))
    // A purchase that was valid at review time can miss its deadline in mempool.
    await raw('evm_setNextBlockTimestamp',[p.deadline+1]);await raw('evm_mine');await raw('evm_mine')
    assert.equal((await client.checkReceipt()).status,'failed');assert.equal(client.pending(),null)
  }finally{await raw('evm_setAutomine',[true])}
})
test('corrupted recovery data cannot be mistaken for confirmed delivery',async()=>{
  await client.buy(await client.quote('1'))
  const key=`souli-purchase-v1:31337:${manifest.address.toLowerCase()}`
  storage.setItem(key,JSON.stringify({...client.pending(),cost:'1'}))
  assert.equal(client.pending().corrupt,true);await assert.rejects(client.checkReceipt(),/manual review/);assert.equal(sends,1)
})

test('smart-account outer sender is accepted only with both exact sale and token delivery events',async()=>{
  const pending=await client.buy(await client.quote('7'));await raw('evm_mine')
  let tamper='sale'
  intercept=async(method,params)=>{
    if(method==='eth_getTransactionByHash'&&params[0]===pending.hash){const tx=await raw(method,params);return {...tx,from:await other.getAddress(),to:await other.getAddress(),input:'0x12345678',value:'0x0'}}
    if(method==='eth_getTransactionReceipt'&&tamper){const r=await raw(method,params);const target=tamper==='sale'?manifest.address:manifest.terms.token;return {...r,logs:r.logs.map(l=>l.address.toLowerCase()===target.toLowerCase()?{...l,address:'0x0000000000000000000000000000000000000001'}:l)}}
  }
  await assert.rejects(client.checkReceipt(),/expected SOULI receipt/)
  assert.ok(client.pending(),'Unproven smart receipt must remain pending')
  tamper='token';await assert.rejects(client.checkReceipt(),/matching token delivery/)
  assert.ok(client.pending())
  tamper=null;client=makeClient();assert.equal((await client.checkReceipt()).status,'success')
  assert.equal(client.pending(),null)
})

test('testnet approval window can be ten minutes without weakening expiry checks',async()=>{
  const extended=createNativeSaleClient(manifest,()=>bridge,{allowTest:true,storage,now:()=>clock,quoteTtlSeconds:600})
  const q=await extended.quote('1')
  const chainTime=(await provider.getBlock('latest')).timestamp
  assert.equal(q.deadline,chainTime+600)
  clock+=600001;await assert.rejects(extended.buy(q),/expired/)
  assert.throws(()=>createNativeSaleClient(manifest,()=>bridge,{quoteTtlSeconds:Infinity}),/approval window/)
  assert.equal(sends,0)
})
test('cancel transaction with same nonce resolves recovery without claiming a purchase',async()=>{
  await raw('evm_setAutomine',[false])
  try{
    const p=await client.buy(await client.quote('2')),original=await raw('eth_getTransactionByHash',[p.hash])
    const cancelHash=await raw('eth_sendTransaction',[{from:selected,to:selected,value:'0x0',nonce:original.nonce,gas:'0x5208',gasPrice:toQuantity(BigInt(original.gasPrice)*3n)}])
    await client.checkReceipt(cancelHash);client=makeClient();await raw('evm_mine');await raw('evm_mine')
    assert.equal((await client.checkReceipt()).status,'replaced');assert.equal(client.pending(),null);assert.equal(await token.balanceOf(selected),0n)
  }finally{await raw('evm_setAutomine',[true])}
})
test('public verification reads stay separate from wallet approvals and recover a purchase',async()=>{
  const walletCalls=[],readCalls=[]
  const signingWallet={request:async args=>{
    walletCalls.push(args.method)
    assert.ok(['eth_chainId','eth_accounts','eth_sendTransaction'].includes(args.method),'No chain data reads through the wallet relay')
    return bridge.request(args)
  }}
  const reader={request:async({method,params=[]})=>{
    readCalls.push(method)
    assert.ok(!/send|sign|accounts/i.test(method),'Read transport must never sign or broadcast')
    return raw(method,params)
  }}
  const separated=createNativeSaleClient(manifest,()=>signingWallet,{allowTest:true,storage,now:()=>clock,reader})
  const quote=await separated.quote('1');await separated.buy(quote);await raw('evm_mine')
  assert.equal((await separated.checkReceipt()).status,'success')
  assert.equal(await token.balanceOf(selected),UNIT)
  assert.equal(walletCalls.filter(m=>m==='eth_sendTransaction').length,1)
  assert.ok(readCalls.includes('eth_getCode')&&readCalls.includes('eth_getTransactionReceipt'))
})

test('wrong read network or unavailable receipt never sends a duplicate purchase',async()=>{
  const wrong=createNativeSaleClient(manifest,()=>bridge,{allowTest:true,storage,now:()=>clock,reader:{request:async()=> '0x1'}})
  await assert.rejects(wrong.quote('1'),/Wrong verification network/);assert.equal(sends,0)
  let offline=false
  const reader={request:async({method,params=[]})=>{
    if(offline&&method==='eth_getTransactionReceipt')throw Error('Receipt read unavailable')
    return raw(method,params)
  }}
  const checked=createNativeSaleClient(manifest,()=>bridge,{allowTest:true,storage,now:()=>clock,reader})
  await checked.buy(await checked.quote('1'));await raw('evm_mine');offline=true
  await assert.rejects(checked.checkReceipt(),/Receipt read unavailable/)
  assert.ok(checked.pending()?.hash)
  await assert.rejects(checked.quote('1'),/earlier wallet request/);assert.equal(sends,1)
  offline=false;assert.equal((await checked.checkReceipt()).status,'success')
})

test('release preparation is unsigned, exact and rejects test networks by default',async()=>{
  const a=JSON.parse(readFileSync(new URL('../artifacts/contracts.json',import.meta.url))).contracts.SouliEthSale
  const input={...manifest.terms,owner:await owner.getAddress()}
  await assert.rejects(prepareDeployment(input,a),/explicit test/)
  const review=await prepareDeployment(input,a,{allowTest:true})
  assert.equal(review.termsHash,manifest.termsHash);assert.equal(review.transaction.value,'0x0');assert.ok(review.transaction.data.startsWith(a.bytecode))
  const plan=inventoryTransactions(manifest.address,review,'321',a);assert.equal(plan.length,3);assert.equal(plan[0].from,await owner.getAddress())
  await assert.rejects(prepareDeployment({...input,unitPriceWei:1},a,{allowTest:true}),/exact decimal/)
  assert.throws(()=>inventoryTransactions(manifest.address,review,'1.5',a),/Invalid/)
})
test('release verification pins deployed runtime and all critical terms',async()=>{
  const a=JSON.parse(readFileSync(new URL('../artifacts/contracts.json',import.meta.url))).contracts.SouliEthSale
  const review=await prepareDeployment({...manifest.terms,owner:await owner.getAddress()},a,{allowTest:true})
  const verified=await inspectDeployment(provider,manifest.address,review,a,{allowTest:true})
  assert.equal(verified.available,'10000');assert.equal(verified.paused,false);assert.equal(verified.candidateManifest.runtimeCodeHash,manifest.runtimeCodeHash)
  await assert.rejects(inspectDeployment(provider,await token.getAddress(),review,a,{allowTest:true}),/bytecode/)
  await assert.rejects(inspectDeployment(provider,manifest.address,{...review,terms:{...review.terms,walletCap:'999'}},a,{allowTest:true}),/walletCap/)
  assert.equal(matchesCompiledRuntime('0xdeadbeef',a),false)
})
