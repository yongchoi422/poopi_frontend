import { before, after, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { network } from 'hardhat'
import { BrowserProvider, ContractFactory, id, parseEther, ZeroAddress } from 'ethers'
import { readFileSync } from 'node:fs'
let connection, provider, accounts, artifacts, owner, buyer, other, treasury, token, sale, snapshot, now
const PRICE=1_000_000_000_000n, UNIT=1_000_000_000n
const sent=async promise=>(await promise).wait()
async function deploy(name,args=[],signer=owner){const a=artifacts[name];const c=await new ContractFactory(a.abi,a.bytecode,signer).deploy(...args);await c.waitForDeployment();return c}
async function saleFor(asset,overrides={}) {
  return deploy('SouliEthSale',[await asset.getAddress(),await owner.getAddress(),overrides.treasury||await treasury.getAddress(),overrides.price??PRICE,overrides.cap??10000n,overrides.wallet??1000n,overrides.start??now-1,overrides.end??now+3600,id('TEST TERMS - NO REAL VALUE')])
}
before(async()=>{
  artifacts=JSON.parse(readFileSync(new URL('../artifacts/contracts.json',import.meta.url))).contracts;connection=await network.create('default');provider=new BrowserProvider(connection.provider,undefined,{cacheTimeout:-1});
  accounts=await provider.listAccounts();[owner,buyer,other,treasury]=accounts;
  now=(await provider.getBlock('latest')).timestamp;token=await deploy('TestToken');sale=await saleFor(token);
  await sent(token.approve(await sale.getAddress(),10000n*UNIT));await sent(sale.deposit(10000));await sent(sale.unpause());
  snapshot=await provider.send('evm_snapshot',[])
})
beforeEach(async()=>{await provider.send('evm_revert',[snapshot]);snapshot=await provider.send('evm_snapshot',[])})
after(async()=>{provider?.destroy();await connection?.close()})

test('exact ETH buys exact 9-decimal SOULI and emits a receipt',async()=>{
  const receipt=await sent(sale.connect(buyer).buy(210,now+300,{value:210n*PRICE}));
  assert.equal(await token.balanceOf(await buyer.getAddress()),210n*UNIT);assert.equal(await sale.sold(),210n);
  assert.equal(await sale.purchased(await buyer.getAddress()),210n);assert.equal(await sale.proceedsWei(),210n*PRICE);
  const event=receipt.logs.map(l=>{try{return sale.interface.parseLog(l)}catch{return null}}).find(e=>e?.name==='Purchased');
  assert.equal(event.args.buyer,await buyer.getAddress());assert.equal(event.args.wholeSouli,210n)
})
test('zero, excess, insufficient and overpaid quantities fail without payment',async()=>{
  for(const [q,value]of [[0n,0n],[10001n,10001n*PRICE],[2n,PRICE],[1n,PRICE+1n]])await assert.rejects(sale.connect(buyer).buy(q,now+300,{value}));
  assert.equal(await sale.sold(),0n);assert.equal(await provider.getBalance(await sale.getAddress()),0n)
})
test('wallet cumulative cap cannot be bypassed by repeated purchases',async()=>{
  await sent(sale.connect(buyer).buy(600,now+300,{value:600n*PRICE}));
  await assert.rejects(sale.connect(buyer).buy(401,now+300,{value:401n*PRICE}));
  await sent(sale.connect(buyer).buy(400,now+300,{value:400n*PRICE}));assert.equal(await sale.purchased(await buyer.getAddress()),1000n)
})
test('pause and start/end boundaries fail closed',async()=>{
  await sent(sale.pause());await assert.rejects(sale.connect(buyer).buy(1,now+300,{value:PRICE}));
  const later=await saleFor(token,{start:now+100,end:now+200});await sent(token.approve(await later.getAddress(),100n*UNIT));await sent(later.deposit(100));await sent(later.unpause());
  await assert.rejects(later.connect(buyer).buy(1,now+300,{value:PRICE}));
  await provider.send('evm_setNextBlockTimestamp',[now+100]);await sent(later.connect(buyer).buy(1,now+300,{value:PRICE,gasLimit:500000}));
  await provider.send('evm_setNextBlockTimestamp',[now+200]);await provider.send('evm_mine',[]);await assert.rejects(later.connect(buyer).buy(1,now+300,{value:PRICE}))
})
test('expired quotes and sold-out stock cannot take money',async()=>{
  await assert.rejects(sale.connect(buyer).buy(1,now-10,{value:PRICE}));
  await sent(sale.pause());await sent(sale.withdrawInventory(9999));await sent(sale.unpause());
  await sent(sale.connect(buyer).buy(1,now+300,{value:PRICE}));await assert.rejects(sale.connect(other).buy(1,now+300,{value:PRICE}));assert.equal(await sale.proceedsWei(),PRICE)
})
test('token transfer reverts and fee deductions roll back all accounting and ETH',async()=>{
  for(const method of ['setFailure','setFee']){
    await sent(token[method](true));await assert.rejects(sale.connect(buyer).buy(1,now+300,{value:PRICE}));
    assert.equal(await sale.sold(),0n);assert.equal(await sale.purchased(await buyer.getAddress()),0n);assert.equal(await sale.proceedsWei(),0n);assert.equal(await token.balanceOf(await buyer.getAddress()),0n);
    await sent(token[method](false))
  }
})
test('reentrant token callback cannot enter sale twice',async()=>{
  await sent(token.setCallback(await sale.getAddress(),sale.interface.encodeFunctionData('buy',[1,now+300])));
  await sent(sale.connect(buyer).buy(2,now+300,{value:2n*PRICE}));assert.equal(await token.callbackSucceeded(),false);assert.equal(await sale.sold(),2n)
})
test('only owner controls stock/pause and two-step ownership is required',async()=>{
  for(const method of ['pause','unpause','renounceOwnership'])await assert.rejects(sale.connect(buyer)[method]());
  await assert.rejects(sale.withdrawInventory(1));await assert.rejects(sale.connect(buyer).deposit(1));
  await sent(sale.transferOwnership(await other.getAddress()));assert.equal(await sale.owner(),await owner.getAddress());
  await assert.rejects(sale.connect(buyer).acceptOwnership());await sent(sale.connect(other).acceptOwnership());
  await assert.rejects(sale.pause());await sent(sale.connect(other).pause());await assert.rejects(sale.connect(other).renounceOwnership())
})
test('only immutable treasury withdraws proceeds; purchase never calls treasury',async()=>{
  await sent(sale.connect(buyer).buy(5,now+300,{value:5n*PRICE}));await assert.rejects(sale.withdrawProceeds());
  await sent(sale.connect(treasury).withdrawProceeds());assert.equal(await provider.getBalance(await sale.getAddress()),0n);assert.equal(await sale.proceedsWei(),5n*PRICE);
  const reject=await deploy('RejectTreasury');const isolated=await saleFor(token,{treasury:await reject.getAddress()});
  await sent(token.approve(await isolated.getAddress(),10n*UNIT));await sent(isolated.deposit(10));await sent(isolated.unpause());
  await sent(isolated.connect(buyer).buy(1,now+300,{value:PRICE}));await assert.rejects(reject.withdraw(await isolated.getAddress()));
  assert.equal(await provider.getBalance(await isolated.getAddress()),PRICE)
})
test('direct ETH and unknown selectors are rejected',async()=>{
  await assert.rejects(buyer.sendTransaction({to:await sale.getAddress(),value:PRICE}));
  await assert.rejects(buyer.sendTransaction({to:await sale.getAddress(),data:'0x12345678',value:PRICE}))
})

test('an accepted new owner cannot redirect treasury proceeds or take delivered buyer tokens',async()=>{
  await sent(sale.connect(buyer).buy(7,now+300,{value:7n*PRICE}));
  await sent(sale.transferOwnership(await other.getAddress()));await sent(sale.connect(other).acceptOwnership());
  await assert.rejects(sale.connect(other).withdrawProceeds());
  await sent(sale.connect(other).pause());await sent(sale.connect(other).withdrawInventory(9993));
  assert.equal(await token.balanceOf(await buyer.getAddress()),7n*UNIT);
  assert.equal(await token.balanceOf(await sale.getAddress()),0n);
  assert.equal(await sale.treasury(),await treasury.getAddress());
  await sent(sale.connect(treasury).withdrawProceeds());
  assert.equal(await sale.proceedsWei(),7n*PRICE);assert.equal(await provider.getBalance(await sale.getAddress()),0n)
})

test('finite restock approval is consumed and cannot fund another deposit',async()=>{
  await sent(sale.pause());await sent(sale.withdrawInventory(50));
  await sent(token.approve(await sale.getAddress(),50n*UNIT));
  await assert.rejects(sale.connect(other).deposit(50));
  assert.equal(await token.allowance(await owner.getAddress(),await sale.getAddress()),50n*UNIT);
  await sent(sale.deposit(50));
  assert.equal(await token.allowance(await owner.getAddress(),await sale.getAddress()),0n);
  await assert.rejects(sale.deposit(1));assert.equal(await token.balanceOf(await sale.getAddress()),10000n*UNIT)
})

test('treasury callback cannot withdraw twice and repeated sale receipts remain cumulative',async()=>{
  const receiver=await deploy('ReentrantTreasury');const isolated=await saleFor(token,{treasury:await receiver.getAddress()});
  await sent(token.approve(await isolated.getAddress(),20n*UNIT));await sent(isolated.deposit(20));await sent(isolated.unpause());
  for(const quantity of [3n,5n]){
    await sent(isolated.connect(buyer).buy(quantity,now+300,{value:quantity*PRICE}));
    await sent(receiver.withdraw(await isolated.getAddress()));
    assert.equal(await receiver.callbackSucceeded(),false);assert.equal(await provider.getBalance(await isolated.getAddress()),0n)
  }
  assert.equal(await isolated.sold(),8n);assert.equal(await isolated.proceedsWei(),8n*PRICE);
  assert.equal(await provider.getBalance(await receiver.getAddress()),8n*PRICE)
})
test('constructor rejects dangerous or invalid terms',async()=>{
  for(const options of [{price:0n},{cap:0n},{wallet:0n},{wallet:10001n},{end:now},{start:now+300,end:now+200}])await assert.rejects(saleFor(token,options));
  await assert.rejects(saleFor(await deploy('WrongDecimals')));
  await assert.rejects(deploy('SouliEthSale',[ZeroAddress,await owner.getAddress(),await treasury.getAddress(),PRICE,100n,10n,now,now+100,id('terms')]))
})
test('deterministic quantity sweep preserves token/ETH conservation and cap',async()=>{
  let seed=937, sold=0n;
  for(let i=0;i<24;i++){
    seed=(seed*1664525+1013904223)>>>0;const q=BigInt(seed%20+1);const signer=i%2?buyer:other;
    await sent(sale.connect(signer).buy(q,now+1000,{value:q*PRICE}));sold+=q;
    assert.equal(await sale.sold(),sold);assert.equal(await sale.proceedsWei(),sold*PRICE);assert.equal(await token.balanceOf(await sale.getAddress()),(10000n-sold)*UNIT)
  }
})
test('original SOULI source: pool-funded stock, repeat purchases and final Stable delivery',async()=>{
  const original=await deploy('Souli');await sent(original.launch(await owner.getAddress()));
  const s=await saleFor(original,{cap:1000n,wallet:1000n});await sent(original.approve(await s.getAddress(),1000n*UNIT));await sent(s.deposit(1000));await sent(s.unpause());
  await sent(s.connect(buyer).buy(210,now+300,{value:210n*PRICE}));
  assert.equal((await original.dynamicInscription(await buyer.getAddress())).seed,210n);
  await sent(s.connect(buyer).buy(10,now+300,{value:10n*PRICE}));assert.equal((await original.dynamicInscription(await buyer.getAddress())).seed,220n);
  // Last stock can preserve the sale wallet's remaining form. The UI must not
  // promise every purchase increases Dynamic level or produces a fixed SVG.
  await sent(s.connect(other).buy(780,now+300,{value:780n*PRICE}));
  assert.equal(await original.balanceOf(await other.getAddress()),780n*UNIT);assert.equal(await original.inscriptionCount(await other.getAddress()),1n);
  assert.equal((await original.inscriptionOfOwnerByIndex(await other.getAddress(),0)).seed,780n);assert.equal(await s.available(),0n)
})
test('original SOULI source: stored inventory is spendable without losing buyer units',async()=>{
  const original=await deploy('Souli');await sent(original.launch(await owner.getAddress()));await sent(original.transfer(await other.getAddress(),500n*UNIT));
  const s=await saleFor(original,{cap:500n,wallet:500n});await sent(s.transferOwnership(await other.getAddress()));await sent(s.connect(other).acceptOwnership());
  await sent(original.connect(other).approve(await s.getAddress(),500n*UNIT));await sent(s.connect(other).deposit(500));
  assert.equal(await original.inscriptionCount(await s.getAddress()),1n);await sent(s.connect(other).unpause());
  await sent(s.connect(buyer).buy(100,now+300,{value:100n*PRICE}));assert.equal(await original.balanceOf(await buyer.getAddress()),100n*UNIT);assert.equal((await original.dynamicInscription(await buyer.getAddress())).seed,100n)
})
