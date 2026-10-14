import {before,after,beforeEach,test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {network} from 'hardhat'
import {BrowserProvider,ContractFactory} from 'ethers'
import {prepareControllerDeployment} from '../scripts/three-wallet-release-tools.mjs'
import {createDeploymentClient} from '../../src/sale-admin/deploy-client.mjs'
let connection,p,artifacts,signers,review,snapshot
const options={allowTest:true}
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)}}
before(async()=>{
 artifacts=JSON.parse(readFileSync(new URL('../artifacts/contracts.json',import.meta.url))).contracts
 connection=await network.create('default');p=new BrowserProvider(connection.provider,undefined,{cacheTimeout:-1});signers=await p.listAccounts()
 const token=await new ContractFactory(artifacts.TestToken.abi,artifacts.TestToken.bytecode,signers[0]).deploy();await token.waitForDeployment()
 const now=(await p.getBlock('latest')).timestamp
 review=await prepareControllerDeployment({chainId:31337,token:await token.getAddress(),deployer:signers[0].address,nonce:String(await p.getTransactionCount(signers[0].address)),operators:signers.slice(0,3).map(x=>x.address),unitPriceWei:'100000000',saleCap:'42',walletCap:'10',startsAt:String(now-1),endsAt:String(now+3600)},artifacts,options)
 snapshot=await p.send('evm_snapshot',[])
})
beforeEach(async()=>{await p.send('evm_revert',[snapshot]);snapshot=await p.send('evm_snapshot',[])})
after(async()=>{p?.destroy();await connection?.close()})
function fixture({store=storage(),modified=review,account=()=>signers[0].address,chain='0x7a69',send}={}){
 let calls=0,lastHash
 const w={request:async({method,params})=>{
  if(method==='eth_accounts')return [account()]
  if(method==='eth_chainId')return chain
  if(method==='eth_sendTransaction'){calls++;const tx=params[0];if(send)return send(tx);lastHash=(await signers[0].sendTransaction({...tx,nonce:Number(BigInt(tx.nonce))})).hash;return lastHash}
  throw Error(method)
 }}
 return {client:createDeploymentClient(modified,artifacts,()=>w,p,store,options),calls:()=>calls,lastHash:()=>lastHash}
}
test('deploys once and verifies both contracts, exact terms, permissions and paused state',async()=>{
 const f=fixture(),plan=await f.client.prepare(),id=await f.client.send(plan)
 await assert.rejects(f.client.send(plan),/existing deployment/)
 await p.send('evm_mine',[]);const result=await f.client.recover(id)
 assert.equal(result.status,'verified');assert.equal(result.controller,review.controller);assert.equal(result.verification.paused,true)
 assert.equal(result.verification.available,'0');assert.equal(f.calls(),1)
 await assert.rejects(f.client.prepare(),/existing deployment/)
})
test('changed reviewed calldata, wrong wallet or wrong chain never prompt signing',async()=>{
 for(const settings of [{modified:{...review,transaction:{...review.transaction,value:'0x1'}}},{account:()=>signers[1].address},{chain:'0x2105'}]){
  const f=fixture(settings);await assert.rejects(f.client.prepare());assert.equal(f.calls(),0)
 }
})
test('changed account or nonce after review fails before wallet request',async()=>{
 let account=signers[0].address;const f=fixture({account:()=>account}),plan=await f.client.prepare()
 account=signers[1].address;await assert.rejects(f.client.send(plan),/Select the reviewed/);assert.equal(f.calls(),0)
 account=signers[0].address;await (await signers[0].sendTransaction({to:signers[1].address,value:1n})).wait()
 await assert.rejects(f.client.send(plan),/Nonce changed/);assert.equal(f.calls(),0)
})
test('recovery storage failure stops signing',async()=>{
 const f=fixture({store:{getItem:()=>null,setItem:()=>{throw Error('quota')}}}),plan=await f.client.prepare()
 await assert.rejects(f.client.send(plan),/Could not save/);assert.equal(f.calls(),0)
})
test('explicit wallet rejection clears request, ambiguous errors preserve it',async()=>{
 const rejected=fixture({send:()=>{throw Object.assign(Error('rejected'),{code:4001})}})
 await assert.rejects(rejected.client.send(await rejected.client.prepare()),/rejected/);assert.equal(rejected.client.state().pending,null)
 const ambiguous=fixture({send:()=>{throw Error('connection lost')}})
 await assert.rejects(ambiguous.client.send(await ambiguous.client.prepare()),/connection lost/)
 assert.ok(ambiguous.client.state().pending);await assert.rejects(ambiguous.client.prepare(),/existing deployment/)
 assert.equal(ambiguous.calls(),1)
})
test('a wallet-returned hash survives post-broadcast storage failure',async()=>{
 const base=storage();let writes=0
 const f=fixture({store:{getItem:base.getItem,setItem:(k,v)=>{if(++writes>1)throw Error('quota');base.setItem(k,v)}}})
 const id=await f.client.send(await f.client.prepare());assert.equal(f.client.state().pending.hash,id);assert.equal(f.client.state().storageWarning,true)
 await p.send('evm_mine',[]);assert.equal((await f.client.recover()).status,'verified')
})
test('an unrelated receipt cannot clear an ambiguous deployment request',async()=>{
 const f=fixture({send:()=>{throw Error('connection lost')}});await assert.rejects(f.client.send(await f.client.prepare()))
 const tx=await signers[1].sendTransaction({to:signers[2].address,value:1n});await tx.wait();await p.send('evm_mine',[])
 await assert.rejects(f.client.recover(tx.hash),/exact deployment/);assert.ok(f.client.state().pending)
})

test('a completed earlier round is preserved before a new reviewed deployment is sent',async()=>{
 const store=storage(),first=fixture({store}),id=await first.client.send(await first.client.prepare())
 await p.send('evm_mine',[]);await first.client.recover(id)
 const key=`souli-deployment-v1:31337:${signers[0].address.toLowerCase()}`,previous=store.getItem(key)
 const next=await prepareControllerDeployment({...review.input,nonce:String(await p.getTransactionCount(signers[0].address))},artifacts,options)
 const second=fixture({store,modified:next}),plan=await second.client.prepare()
 assert.equal(store.getItem(key),previous)
 const nextId=await second.client.send(plan)
 assert.equal(store.getItem(key+':archive:'+JSON.parse(previous).fingerprint),previous)
 await p.send('evm_mine',[]);assert.equal((await second.client.recover(nextId)).status,'verified')
 assert.notEqual(next.controller,review.controller)
})

test('a different unfinished deployment blocks replacement and a failed archive blocks a new signature',async()=>{
 const store=storage(),first=fixture({store,send:()=>{throw Error('connection lost')}})
 await assert.rejects(first.client.send(await first.client.prepare()))
 const next=await prepareControllerDeployment({...review.input,unitPriceWei:'200000000'},artifacts,options)
 const blocked=fixture({store,modified:next});await assert.rejects(blocked.client.prepare(),/Reconcile/);assert.equal(blocked.calls(),0)
 const clean=storage(),completed=fixture({store:clean}),id=await completed.client.send(await completed.client.prepare())
 await p.send('evm_mine',[]);await completed.client.recover(id)
 const nextRound=await prepareControllerDeployment({...review.input,nonce:String(await p.getTransactionCount(signers[0].address))},artifacts,options)
 const badStore={getItem:clean.getItem,setItem:(k,v)=>{if(k.includes(':archive:'))throw Error('full');clean.setItem(k,v)}}
 const guarded=fixture({store:badStore,modified:nextRound})
 await assert.rejects(guarded.client.send(await guarded.client.prepare()),/Could not save/);assert.equal(guarded.calls(),0)
})
