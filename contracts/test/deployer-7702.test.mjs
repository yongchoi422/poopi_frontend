import {before,after,beforeEach,test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {network} from 'hardhat'
import {BrowserProvider,ContractFactory,keccak256} from 'ethers'
import {prepareControllerDeployment,preflightController} from '../scripts/three-wallet-release-tools.mjs'
import {METAMASK_DELEGATE,reviewedDeployerAccount,BASE_METAMASK_DELEGATE_HASH} from '../scripts/deployer-account.mjs'
import {createDeploymentClient} from '../../src/sale-admin/deploy-client.mjs'
let conn,p,a,arts,input,snap
const options={allowTest:true},implementation='0x60006000fd'
const policy={kind:'existing-metamask-7702-direct',implementation:METAMASK_DELEGATE,implementationCodeHash:keccak256(implementation)}
const store=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)}}
before(async()=>{
 arts=JSON.parse(readFileSync(new URL('../artifacts/contracts.json',import.meta.url))).contracts
 conn=await network.create('default');p=new BrowserProvider(conn.provider,undefined,{cacheTimeout:-1});a=await p.listAccounts()
 const token=await new ContractFactory(arts.TestToken.abi,arts.TestToken.bytecode,a[0]).deploy();await token.waitForDeployment()
 input={version:2,chainId:31337,token:await token.getAddress(),deployer:a[0].address,nonce:String(await p.getTransactionCount(a[0].address)),operators:a.slice(0,3).map(x=>x.address),unitPriceWei:'100000000',saleCap:'4200000',walletCap:'700000',startsAt:String((await p.getBlock('latest')).timestamp-1),endsAt:'0',deployerAccount:policy}
 await p.send('hardhat_setCode',[METAMASK_DELEGATE,implementation])
 await p.send('hardhat_setCode',[a[0].address,'0xef0100'+METAMASK_DELEGATE.slice(2).toLowerCase()])
 snap=await p.send('evm_snapshot',[])
})
beforeEach(async()=>{await p.send('evm_revert',[snap]);snap=await p.send('evm_snapshot',[])})
after(async()=>{p?.destroy();await conn?.close()})
function fixture(review,{storage=store(),reader=p,send}={}){
 let requests=0,last
 const wallet={request:async({method,params})=>{
  if(method==='eth_accounts')return [a[0].address]
  if(method==='eth_chainId')return '0x7a69'
  if(method==='eth_sendTransaction'){requests++;last=params[0];if(send)return send(last);return (await a[0].sendTransaction({...last,nonce:Number(BigInt(last.nonce))})).hash}
  throw Error('Unexpected request '+method)
 }}
 return {client:createDeploymentClient(review,arts,()=>wallet,reader,storage,options),requests:()=>requests,last:()=>last}
}
test('pinned existing delegation can originate direct type-2 CREATE and recover after reload',async()=>{
 const r=await prepareControllerDeployment(input,arts,options),storage=store(),f=fixture(r,{storage})
 assert.equal(r.transaction.type,2)
 const hash=await f.client.send(await f.client.prepare());await p.send('evm_mine',[])
 assert.equal(f.last().type,'0x2');assert.equal(f.last().to,undefined);assert.equal(f.last().authorizationList,undefined)
 const tx=await p.getTransaction(hash);assert.equal(tx.type,2);assert.equal(tx.to,null)
 const result=await fixture(r,{storage}).client.recover()
 assert.equal(result.status,'verified');assert.equal(result.verification.paused,true);assert.equal(result.verification.available,'0')
 assert.equal(result.verification.candidateManifest.terms.version,2)
 assert.equal(await p.getCode(a[0].address),'0xef0100'+METAMASK_DELEGATE.slice(2).toLowerCase())
})
test('EOA-only review still rejects delegation, and arbitrary or changed account code stops signing',async()=>{
 const {deployerAccount,...eoa}=input,r=await prepareControllerDeployment(eoa,arts,options)
 await assert.rejects(preflightController(p,r,arts,options),/direct EOA/)
 const pinned=await prepareControllerDeployment(input,arts,options)
 for(const code of ['0x','0x60006000fd','0xef0100'+a[4].address.slice(2).toLowerCase()]){
  await p.send('hardhat_setCode',[a[0].address,code]);const f=fixture(pinned)
  await assert.rejects(f.client.prepare(),/delegation changed/);assert.equal(f.requests(),0)
 }
})
test('implementation hash or delegation changes after review fail before wallet request',async()=>{
 const r=await prepareControllerDeployment(input,arts,options),f=fixture(r),plan=await f.client.prepare()
 await p.send('hardhat_setCode',[METAMASK_DELEGATE,'0x00'])
 await assert.rejects(f.client.send(plan),/implementation code/);assert.equal(f.requests(),0)
})
test('production pin cannot accept a test implementation or an authorization payload',()=>{
 assert.throws(()=>reviewedDeployerAccount(policy,8453,options),/Unreviewed/)
 assert.throws(()=>reviewedDeployerAccount({...policy,authorizationList:[]},31337,options),/Unsupported/)
 assert.throws(()=>reviewedDeployerAccount({...policy,implementation:a[3].address},31337,options),/delegation/)
 assert.equal(reviewedDeployerAccount({...policy,implementationCodeHash:BASE_METAMASK_DELEGATE_HASH},8453).implementationCodeHash,BASE_METAMASK_DELEGATE_HASH)
})
test('a substituted relay/type-4 hash cannot clear the direct-deployment recovery record',async()=>{
 const r=await prepareControllerDeployment(input,arts,options),storage=store(),f=fixture(r,{storage})
 const hash=await f.client.send(await f.client.prepare());await p.send('evm_mine',[])
 const reader=new Proxy(p,{get:(o,k)=>k==='getTransaction'?async id=>({...await o.getTransaction(id),type:4,authorizationList:[{}]}):typeof o[k]==='function'?o[k].bind(o):o[k]})
 const changed=fixture(r,{storage,reader})
 await assert.rejects(changed.client.recover(hash),/direct type-2/);assert.ok(changed.client.state().pending)
 assert.equal((await fixture(r,{storage}).client.recover(hash)).status,'verified')
})
