import { before, after, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { network } from 'hardhat'
import { BrowserProvider, ContractFactory, Contract, id, ZeroAddress } from 'ethers'
import { readFileSync } from 'node:fs'
let connection, provider, artifacts, a, b, c, buyer, outsider, token, control, sale, now, snap, owners
const UNIT=1_000_000_000n, PRICE=100_000_000n
const sent=async p=>(await p).wait()
async function deploy(name,args=[],signer=a){const art=artifacts[name];const x=await new ContractFactory(art.abi,art.bytecode,signer).deploy(...args);await x.waitForDeployment();return x}
async function make(ops=owners){return deploy('SouliThreeWalletController',[await token.getAddress(),ops,PRICE,10000,1000,now-1,now+3600,id('controller test')])}
before(async()=>{
  artifacts=JSON.parse(readFileSync(new URL('../artifacts/contracts.json',import.meta.url))).contracts
  connection=await network.create('default');provider=new BrowserProvider(connection.provider,undefined,{cacheTimeout:-1})
  ;[a,b,c,buyer,outsider]=await provider.listAccounts();owners=await Promise.all([a,b,c].map(x=>x.getAddress()))
  now=(await provider.getBlock('latest')).timestamp;token=await deploy('TestToken');control=await make()
  sale=new Contract(await control.sale(),artifacts.SouliEthSale.abi,provider)
  await sent(token.approve(await control.getAddress(),10000n*UNIT));await sent(control.depositStock(10000));await sent(control.startSale())
  snap=await provider.send('evm_snapshot',[])
})
beforeEach(async()=>{await provider.send('evm_revert',[snap]);snap=await provider.send('evm_snapshot',[])})
after(async()=>{provider?.destroy();await connection?.close()})
test('controller is sole sale owner/treasury with three distinct independent operators',async()=>{
  assert.equal(await sale.owner(),await control.getAddress());assert.equal(await sale.treasury(),await control.getAddress())
  for(let i=0;i<3;i++){assert.equal(await control.operators(i),owners[i]);assert.equal(await control.isOperator(owners[i]),true)}
  assert.equal(await control.isOperator(await outsider.getAddress()),false)
  assert.equal(await token.allowance(owners[0],await control.getAddress()),0n)
  assert.equal(await token.allowance(await control.getAddress(),await sale.getAddress()),0n)
})
test('zero/duplicate operators and accidental mainnet/test-chain deployments reject',async()=>{
  await assert.rejects(make([owners[0],owners[0],owners[2]]));await assert.rejects(make([owners[0],ZeroAddress,owners[2]]))
  await assert.rejects(deploy('SepoliaThreeWalletController',[await token.getAddress(),owners,PRICE,10000,1000,now-1,now+3600,id('test')]))
})
for(const i of [0,1,2])test(`operator ${i+1} alone collects proceeds, recovers stock and restocks`,async()=>{
  const signer=[a,b,c][i],op=control.connect(signer),addr=owners[i]
  await sent(sale.connect(buyer).buy(210,now+300,{value:210n*PRICE}));const balance=await provider.getBalance(addr)
  const receipt=await sent(op.collectProceeds());assert.equal(await provider.getBalance(addr),balance+210n*PRICE-receipt.gasUsed*receipt.gasPrice)
  assert.equal(await provider.getBalance(await sale.getAddress()),0n);assert.equal(await sale.proceedsWei(),210n*PRICE)
  await assert.rejects(op.recoverInventory(1));await sent(op.pauseSale())
  const before=await token.balanceOf(addr);await sent(op.recoverInventory(9790));assert.equal(await token.balanceOf(addr),before+9790n*UNIT)
  assert.equal(await token.balanceOf(await buyer.getAddress()),210n*UNIT)
  await sent(token.connect(signer).approve(await control.getAddress(),9790n*UNIT));await sent(op.depositStock(9790));await sent(op.startSale())
  assert.equal(await sale.available(),9790n);assert.equal(await sale.sold(),210n)
})
test('outsider cannot administer, recover or collect; direct calls by operators to sale fail',async()=>{
  const bad=control.connect(outsider)
  for(const method of ['pauseSale','startSale','collectProceeds','recoverHeldTokens'])await assert.rejects(bad[method]())
  await assert.rejects(bad.depositStock(1));await assert.rejects(bad.recoverInventory(1))
  for(const signer of [a,b,c])for(const method of ['pause','withdrawProceeds'])await assert.rejects(sale.connect(signer)[method]())
})
test('rejected payout keeps ETH in sale; another operator can still collect',async()=>{
  const reject=await deploy('RejectingOperator'), x=await make([owners[0],await reject.getAddress(),owners[2]])
  const s=new Contract(await x.sale(),artifacts.SouliEthSale.abi,provider)
  await sent(token.approve(await x.getAddress(),2n*UNIT));await sent(x.depositStock(2));await sent(x.startSale())
  await sent(s.connect(buyer).buy(1,now+300,{value:PRICE}));await assert.rejects(reject.collect(await x.getAddress()))
  assert.equal(await provider.getBalance(await s.getAddress()),PRICE);await sent(x.connect(c).collectProceeds())
  assert.equal(await provider.getBalance(await s.getAddress()),0n)
})
test('failed token funding/withdrawal rolls back; accidental held SOULI is recoverable',async()=>{
  await sent(control.pauseSale());await sent(token.setFee(true));await assert.rejects(control.recoverInventory(1))
  assert.equal(await token.balanceOf(await sale.getAddress()),10000n*UNIT)
  await sent(token.approve(await control.getAddress(),UNIT-1n));await assert.rejects(control.depositStock(1))
  await sent(token.setFee(false));await sent(token.transfer(await control.getAddress(),UNIT))
  const before=await token.balanceOf(owners[1]);await sent(control.connect(b).recoverHeldTokens());assert.equal(await token.balanceOf(owners[1]),before+UNIT)
})
test('direct ETH, empty withdrawals and arbitrary selector calls fail',async()=>{
  await assert.rejects(a.sendTransaction({to:await control.getAddress(),value:PRICE}))
  await assert.rejects(a.sendTransaction({to:await control.getAddress(),data:'0x12345678'}))
  await assert.rejects(control.collectProceeds());await assert.rejects(control.recoverHeldTokens())
})
test('invalid and paused purchases still revert payment and accounting atomically',async()=>{
  await assert.rejects(sale.connect(buyer).buy(1,now+300,{value:PRICE+1n}));await sent(control.connect(c).pauseSale())
  await assert.rejects(sale.connect(buyer).buy(1,now+300,{value:PRICE}));assert.equal(await sale.sold(),0n)
  assert.equal(await provider.getBalance(await sale.getAddress()),0n)
})
