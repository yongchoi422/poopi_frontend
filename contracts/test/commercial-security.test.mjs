// Local disposable chain only. These checks are internal review, not an audit.
import { before, after, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { network } from 'hardhat'
import { BrowserProvider, ContractFactory, Contract, id, toBeHex } from 'ethers'
let connection, provider, artifacts, a, b, c, buyer, outsider, token, control, sale, now, snapshot
const UNIT = 10n ** 9n, PRICE = 26684264049332n, CAP = 4200000n
const sent = async p => (await p).wait()
async function deploy(name,args=[]) { const x=await new ContractFactory(artifacts[name].abi,artifacts[name].bytecode,a).deploy(...args); await x.waitForDeployment(); return x }
async function setup(tok,ops=[a.address,b.address,c.address],cap=CAP,wallet=CAP,clock=now) {
  const ctl=await deploy('SouliThreeWalletController',[await tok.getAddress(),ops,PRICE,cap,wallet,clock-1,clock+3600,id('local proposal, not live terms')])
  return {ctl, shop:new Contract(await ctl.sale(),artifacts.SouliEthSale.abi,provider)}
}
before(async()=>{
  artifacts=JSON.parse(readFileSync(new URL('../artifacts/contracts.json',import.meta.url))).contracts
  connection=await network.create('default');provider=new BrowserProvider(connection.provider,undefined,{cacheTimeout:-1})
  assert.equal((await provider.getNetwork()).chainId,31337n)
  ;[a,b,c,buyer,outsider]=await provider.listAccounts();now=(await provider.getBlock('latest')).timestamp
  token=await deploy('TestToken');const x=await setup(token);control=x.ctl;sale=x.shop
  await sent(token.approve(await control.getAddress(),CAP*UNIT));await sent(control.depositStock(CAP));await sent(control.startSale())
  snapshot=await provider.send('evm_snapshot',[])
})
beforeEach(async()=>{await provider.send('evm_revert',[snapshot]);snapshot=await provider.send('evm_snapshot',[])})
after(async()=>{provider?.destroy();await connection?.close()})

test('operator callback cannot collect ETH twice, including repeated sale receipts',async()=>{
  const receiver=await deploy('ReentrantOperator'),x=await setup(token,[a.address,await receiver.getAddress(),c.address])
  await sent(token.approve(await x.ctl.getAddress(),20n*UNIT));await sent(x.ctl.depositStock(20));await sent(x.ctl.startSale())
  for(const q of [3n,7n]) {
    await sent(x.shop.connect(buyer).buy(q,now+600,{value:q*PRICE}))
    await sent(receiver.collect(await x.ctl.getAddress()))
    assert.equal(await receiver.callbackSucceeded(),false)
    assert.equal(await provider.getBalance(await x.shop.getAddress()),0n)
    assert.equal(await provider.getBalance(await x.ctl.getAddress()),0n)
  }
  assert.equal(await receiver.received(),10n*PRICE);assert.equal(await x.shop.proceedsWei(),10n*PRICE)
})

test('forced ETH can be collected without being counted as customer revenue',async()=>{
  await sent(sale.connect(buyer).buy(3,now+600,{value:3n*PRICE}))
  // Synthetic balances model forced ETH on this local chain; no public RPC write.
  await provider.send('hardhat_setBalance',[await sale.getAddress(),toBeHex(3n*PRICE+17n)])
  await provider.send('hardhat_setBalance',[await control.getAddress(),toBeHex(19n)])
  const before=await provider.getBalance(b.address),r=await sent(control.connect(b).collectProceeds())
  assert.equal(await provider.getBalance(b.address),before+3n*PRICE+36n-r.gasUsed*r.gasPrice)
  assert.equal(await sale.proceedsWei(),3n*PRICE);assert.equal(await sale.sold(),3n)
  assert.equal(await provider.getBalance(await sale.getAddress()),0n)
  assert.equal(await provider.getBalance(await control.getAddress()),0n)
})

test('selling out and replenishing stock never reopens the lifetime sale cap',async()=>{
  await sent(sale.connect(buyer).buy(CAP,now+600,{value:CAP*PRICE}))
  await sent(control.pauseSale());await sent(token.approve(await control.getAddress(),UNIT));await sent(control.depositStock(1))
  assert.equal(await sale.available(),0n);await assert.rejects(control.startSale())
  await assert.rejects(sale.connect(outsider).buy(1,now+600,{value:PRICE}))
  await sent(control.recoverInventory(1))
  assert.equal(await sale.sold(),CAP);assert.equal(await token.balanceOf(buyer.address),CAP*UNIT)
  assert.equal(await sale.proceedsWei(),CAP*PRICE)
})

test('expiry blocks purchases but preserves stock recovery and proceeds access',async()=>{
  await sent(sale.connect(buyer).buy(7,now+600,{value:7n*PRICE}))
  await provider.send('evm_setNextBlockTimestamp',[now+3600]);await provider.send('evm_mine',[])
  await assert.rejects(sale.connect(buyer).buy(1,now+7200,{value:PRICE}))
  await sent(control.connect(c).pauseSale());await sent(control.connect(c).recoverInventory(CAP-7n))
  await sent(control.connect(b).collectProceeds())
  assert.equal(await token.balanceOf(buyer.address),7n*UNIT);assert.equal(await sale.sold(),7n)
  assert.equal(await token.balanceOf(await sale.getAddress()),0n)
  assert.equal(await provider.getBalance(await sale.getAddress()),0n)
})

test('original ERC20i supports proposed large inventory, LV5 purchase and recovery',async()=>{
  const original=await deploy('Souli');await sent(original.launch(a.address))
  // The original token limits large transfers from its pool immediately after
  // launch. Model the already-mature Base token, without disabling that guard.
  await assert.rejects(original.transfer(buyer.address,CAP*UNIT))
  assert.equal(await original.balanceOf(buyer.address),0n)
  const mature=now+86400
  await provider.send('evm_setNextBlockTimestamp',[mature]);await provider.send('evm_mine',[])
  const {ctl,shop}=await setup(original,undefined,CAP,CAP,mature)
  await sent(original.approve(await ctl.getAddress(),CAP*UNIT));await sent(ctl.depositStock(CAP));await sent(ctl.startSale())
  // Large purchase stress case, not approval of this commercial wallet limit.
  await sent(shop.connect(buyer).buy(2500000,mature+1000,{value:2500000n*PRICE}))
  assert.equal((await original.dynamicInscription(buyer.address)).seed,2500000n)
  await sent(shop.connect(buyer).buy(1,mature+1000,{value:PRICE}))
  assert.equal(await original.balanceOf(buyer.address),2500001n*UNIT)
  await sent(ctl.connect(c).pauseSale());await sent(ctl.connect(c).recoverInventory(CAP-2500001n))
  await sent(ctl.connect(b).collectProceeds())
  assert.equal(await original.balanceOf(await shop.getAddress()),0n)
  assert.equal(await original.balanceOf(await ctl.getAddress()),0n)
  assert.equal(await original.allowance(a.address,await ctl.getAddress()),0n)
  assert.equal(await original.allowance(await ctl.getAddress(),await shop.getAddress()),0n)
  assert.equal(await shop.proceedsWei(),2500001n*PRICE)
})
