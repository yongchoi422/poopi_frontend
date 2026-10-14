import {before,after,beforeEach,test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {network} from 'hardhat'
import {BrowserProvider,ContractFactory,keccak256,ZeroAddress} from 'ethers'
import {YEAR_SECONDS,planLpTimelock,purchaseAllocation} from '../scripts/lp-timelock-plan.mjs'
let connection,p,accounts,arts,token,lock,unlock,snapshot
const sent=async x=>(await x).wait()
const deploy=async(name,args=[])=>{const a=arts[name],c=await new ContractFactory(a.abi,a.bytecode,accounts[0]).deploy(...args);await c.waitForDeployment();return c}
const advance=async timestamp=>{await p.send('evm_setNextBlockTimestamp',[timestamp]);await p.send('evm_mine',[])}
before(async()=>{
 arts=JSON.parse(readFileSync(new URL('../artifacts/contracts.json',import.meta.url))).contracts
 connection=await network.create('default');p=new BrowserProvider(connection.provider,undefined,{cacheTimeout:-1})
 assert.equal((await p.getNetwork()).chainId,31337n)
 accounts=await p.listAccounts();token=await deploy('TestToken')
 unlock=(await p.getBlock('latest')).timestamp+YEAR_SECONDS+86400
 lock=await deploy('VestingWallet',[accounts[1].address,unlock,0])
 await sent(token.transfer(await lock.getAddress(),1000n))
 snapshot=await p.send('evm_snapshot',[])
})
beforeEach(async()=>{await p.send('evm_revert',[snapshot]);snapshot=await p.send('evm_snapshot',[])})
after(async()=>{p?.destroy();await connection?.close()})
test('adding the standard LP lock leaves deployed V1 and V2 creation bytecode unchanged',()=>{
 const v1=JSON.parse(readFileSync(new URL('../release/base-pilot.review.json',import.meta.url)))
 const hashes={SouliEthSale:v1.saleCreationCodeHash,SouliThreeWalletController:v1.controllerCreationCodeHash,
   SouliEthSaleV2:'0xe070623260881eae564c583d8cab1ba544937de6292db63d2a1d517c857acf08',
   SouliThreeWalletControllerV2:'0xee956a82adee43a35b3dc4c55ba64a73292f32f85d93c103b5c1a1926531432d'}
 for(const [name,hash]of Object.entries(hashes))assert.equal(keccak256(arts[name].bytecode),hash,name)
})
test('beneficiary and strangers cannot release principal before expiry; exact boundary releases to owner',async()=>{
 const addr=await token.getAddress()
 for(const caller of [accounts[1],accounts[2]])await sent(lock.connect(caller)['release(address)'](addr))
 assert.equal(await token.balanceOf(await lock.getAddress()),1000n)
 await advance(unlock-1);assert.equal(await lock['releasable(address)'](addr),0n)
 await p.send('evm_setNextBlockTimestamp',[unlock])
 await sent(lock.connect(accounts[2])['release(address)'](addr))
 assert.equal(await token.balanceOf(accounts[1].address),1000n)
 assert.equal(await token.balanceOf(accounts[2].address),0n)
 assert.equal(await lock['released(address)'](addr),1000n)
 await sent(lock['release(address)'](addr));assert.equal(await token.balanceOf(accounts[1].address),1000n)
})
test('ownership transfer changes the eventual recipient, never the unlock time',async()=>{
 await assert.rejects(lock.connect(accounts[2]).transferOwnership(accounts[2].address),/revert/)
 await sent(lock.connect(accounts[1]).transferOwnership(accounts[2].address))
 assert.equal(await lock.start(),BigInt(unlock));assert.equal(await lock.duration(),0n)
 await sent(lock['release(address)'](await token.getAddress()))
 assert.equal(await token.balanceOf(await lock.getAddress()),1000n)
 await advance(unlock);await sent(lock['release(address)'](await token.getAddress()))
 assert.equal(await token.balanceOf(accounts[1].address),0n);assert.equal(await token.balanceOf(accounts[2].address),1000n)
})
test('later deposits inherit the old expiry; deposits after expiry are immediately releasable',async()=>{
 await advance(unlock-100);await sent(token.transfer(await lock.getAddress(),500n))
 assert.equal(await lock['releasable(address)'](await token.getAddress()),0n)
 await advance(unlock);await sent(lock['release(address)'](await token.getAddress()))
 await sent(token.transfer(await lock.getAddress(),250n));await sent(lock['release(address)'](await token.getAddress()))
 assert.equal(await token.balanceOf(accounts[1].address),1750n)
})
test('ETH also stays locked, and a stranger can trigger payment only to the beneficiary',async()=>{
 await sent(accounts[0].sendTransaction({to:await lock.getAddress(),value:999n}))
 await sent(lock['release()']());assert.equal(await p.getBalance(await lock.getAddress()),999n)
 await advance(unlock);const before=await p.getBalance(accounts[1].address)
 await sent(lock.connect(accounts[2])['release()']())
 assert.equal(await p.getBalance(accounts[1].address),before+999n)
})
test('standard ownership renunciation can strand funds: operationally prohibited, not hidden',async()=>{
 await sent(lock.connect(accounts[1]).renounceOwnership());assert.equal(await lock.owner(),ZeroAddress)
 await advance(unlock);await assert.rejects(lock['release(address)'](await token.getAddress()),/revert/)
 assert.equal(await token.balanceOf(await lock.getAddress()),1000n)
})
test('planner refuses too-short locks, wrong chain, sale controllers, token and invalid recipient',async()=>{
 const input={chainId:8453,pair:await token.getAddress(),beneficiary:accounts[1].address,fundingWindowEndsAt:unlock-YEAR_SECONDS,unlockTimestamp:unlock}
 const plan=await planLpTimelock(input,arts.VestingWallet)
 assert.equal(plan.readyToFund,false);assert.equal(plan.constructorArgs[2],0)
 for(const bad of [{chainId:1},{unlockTimestamp:unlock-1},{beneficiary:ZeroAddress},{beneficiary:input.pair},
   {beneficiary:'0xc177F10Da4c62FBbef8182e82EE09F7Db79769dA'},{pair:'0xb43eA104c7ec75038Ac8EcA57107Eefc8B039aFF'}])
   await assert.rejects(planLpTimelock({...input,...bad},arts.VestingWallet))
})
test('manual 50:50 accounting uses purchase proceeds, keeps rounding explicit and never counts topups',()=>{
 const price='26666033792798',r=purchaseAllocation((4200000n*BigInt(price)).toString(),price)
 assert.equal(r.lpBudgetWei,r.operationsBudgetWei)
 assert.equal(r.matchingSouliUnitsAtSalePrice,'2100000000000000')
 assert.deepEqual(purchaseAllocation('3','1'),{purchaseWei:'3',lpBudgetWei:'1',operationsBudgetWei:'2',matchingSouliUnitsAtSalePrice:'1000000000',enforcedOnChain:false})
 assert.throws(()=>purchaseAllocation('1.5',price));assert.throws(()=>purchaseAllocation('1','0'))
})
