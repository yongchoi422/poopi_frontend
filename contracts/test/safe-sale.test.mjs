// Official Safe 1.4.1 bytecode, disposable local chain only. No user keys.
import { before, beforeEach, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { network } from 'hardhat'
import { BrowserProvider, Contract, ContractFactory, ZeroAddress, id, concat } from 'ethers'

const fixture = name => JSON.parse(readFileSync(new URL(`../vendor/safe-1.4.1/${name}.json`, import.meta.url)))
const types = { SafeTx: [
  { name:'to',type:'address' },{ name:'value',type:'uint256' },{ name:'data',type:'bytes' },
  { name:'operation',type:'uint8' },{ name:'safeTxGas',type:'uint256' },{ name:'baseGas',type:'uint256' },
  { name:'gasPrice',type:'uint256' },{ name:'gasToken',type:'address' },{ name:'refundReceiver',type:'address' },{ name:'nonce',type:'uint256' },
] }
const UNIT = 1_000_000_000n, PRICE = 100_000_000n
let connection, provider, owners, buyer, outsider, relayer, safe, sale, token, snapshot, now
const sent = async promise => (await promise).wait()
async function deploy(a, args=[]) { const c=await new ContractFactory(a.abi,a.bytecode,relayer).deploy(...args);await c.waitForDeployment();return c }
async function transaction(to, data, value=0n) {
  return { to, value, data, operation:0, safeTxGas:0, baseGas:0, gasPrice:0, gasToken:ZeroAddress, refundReceiver:ZeroAddress, nonce:await safe.nonce() }
}
async function signatures(tx, signers) {
  const list=await Promise.all(signers.map(async signer=>({ address:(await signer.getAddress()).toLowerCase(),signature:await signer.signTypedData({chainId:31337,verifyingContract:await safe.getAddress()},types,tx) })))
  return concat(list.sort((a,b)=>a.address.localeCompare(b.address)).map(x=>x.signature))
}
async function execute(tx, sigs) {
  return safe.execTransaction(tx.to,tx.value,tx.data,tx.operation,tx.safeTxGas,tx.baseGas,tx.gasPrice,tx.gasToken,tx.refundReceiver,sigs)
}
async function call(to,data,signers=owners.slice(0,2),value=0n) { const tx=await transaction(to,data,value); return sent(execute(tx,await signatures(tx,signers))) }

before(async()=>{
  connection=await network.create('default');provider=new BrowserProvider(connection.provider,undefined,{cacheTimeout:-1})
  const accounts=await provider.listAccounts();owners=accounts.slice(0,3);[buyer,outsider,relayer]=accounts.slice(3,6)
  const implementation=await deploy(fixture('SafeL2')), factory=await deploy(fixture('SafeProxyFactory'))
  const initializer=implementation.interface.encodeFunctionData('setup',[await Promise.all(owners.map(x=>x.getAddress())),2,ZeroAddress,'0x',ZeroAddress,ZeroAddress,0,ZeroAddress])
  const receipt=await sent(factory.createProxyWithNonce(await implementation.getAddress(),initializer,1))
  const event=receipt.logs.map(l=>{try{return factory.interface.parseLog(l)}catch{return null}}).find(e=>e?.name==='ProxyCreation')
  safe=new Contract(event.args.proxy,fixture('SafeL2').abi,relayer)
  const artifacts=JSON.parse(readFileSync(new URL('../artifacts/contracts.json',import.meta.url))).contracts
  token=await deploy(artifacts.TestToken);now=(await provider.getBlock('latest')).timestamp
  sale=await deploy(artifacts.SouliEthSale,[await token.getAddress(),await safe.getAddress(),await safe.getAddress(),PRICE,10000,1000,now-1,now+3600,id('LOCAL SAFE TEST ONLY')])
  await sent(token.transfer(await safe.getAddress(),10000n*UNIT))
  await call(await token.getAddress(),token.interface.encodeFunctionData('approve',[await sale.getAddress(),10000n*UNIT]))
  await call(await sale.getAddress(),sale.interface.encodeFunctionData('deposit',[10000]))
  await call(await sale.getAddress(),sale.interface.encodeFunctionData('unpause'))
  await sent(sale.connect(buyer).buy(210,now+300,{value:210n*PRICE}))
  snapshot=await provider.send('evm_snapshot',[])
})
beforeEach(async()=>{await provider.send('evm_revert',[snapshot]);snapshot=await provider.send('evm_snapshot',[])})
after(async()=>{provider?.destroy();await connection?.close()})

test('official Safe proxy owns stock/admin/treasury with exactly two of three signers and no modules',async()=>{
  assert.equal(await safe.VERSION(),'1.4.1');assert.equal(await safe.getThreshold(),2n)
  assert.deepEqual((await safe.getOwners()).map(x=>x.toLowerCase()),await Promise.all(owners.map(async x=>(await x.getAddress()).toLowerCase())))
  const [modules]=await safe.getModulesPaginated('0x0000000000000000000000000000000000000001',10);assert.equal(modules.length,0)
  assert.equal(await sale.owner(),await safe.getAddress());assert.equal(await sale.treasury(),await safe.getAddress())
  assert.equal(await token.allowance(await safe.getAddress(),await sale.getAddress()),0n)
  assert.equal(await token.balanceOf(await buyer.getAddress()),210n*UNIT)
})
test('one signature, repeated signer, and a non-owner cannot withdraw; nonce and balances stay intact',async()=>{
  const tx=await transaction(await sale.getAddress(),sale.interface.encodeFunctionData('withdrawProceeds'))
  for(const signers of [[owners[0]],[owners[0],owners[0]],[owners[0],outsider]]) {
    await assert.rejects(execute(tx,await signatures(tx,signers)))
    assert.equal(await safe.nonce(),tx.nonce);assert.equal(await provider.getBalance(await sale.getAddress()),210n*PRICE)
  }
})
for(const pair of [[0,1],[0,2],[1,2]])test(`owners ${pair.join('+')} withdraw to Safe while another account pays gas`,async()=>{
  const receipt=await call(await sale.getAddress(),sale.interface.encodeFunctionData('withdrawProceeds'),pair.map(i=>owners[i]))
  assert.ok(receipt.logs.some(l=>{try{return safe.interface.parseLog(l)?.name==='ExecutionSuccess'}catch{return false}}))
  assert.equal(await provider.getBalance(await sale.getAddress()),0n);assert.equal(await provider.getBalance(await safe.getAddress()),210n*PRICE)
  assert.equal(await sale.proceedsWei(),210n*PRICE)
})
test('individual owners cannot call sale treasury/admin powers directly',async()=>{
  for(const owner of owners){await assert.rejects(sale.connect(owner).withdrawProceeds());await assert.rejects(sale.connect(owner).pause())}
})
test('two approvals pause, recover unsold stock to Safe, and restock without changing purchased tokens',async()=>{
  await call(await sale.getAddress(),sale.interface.encodeFunctionData('pause'))
  await call(await sale.getAddress(),sale.interface.encodeFunctionData('withdrawInventory',[9790]))
  assert.equal(await token.balanceOf(await safe.getAddress()),9790n*UNIT)
  await call(await token.getAddress(),token.interface.encodeFunctionData('approve',[await sale.getAddress(),9790n*UNIT]))
  await call(await sale.getAddress(),sale.interface.encodeFunctionData('deposit',[9790]))
  await call(await sale.getAddress(),sale.interface.encodeFunctionData('unpause'))
  assert.equal(await sale.available(),9790n);assert.equal(await token.balanceOf(await buyer.getAddress()),210n*UNIT)
})
test('replaying executed signatures or changing their target cannot transfer treasury funds',async()=>{
  await call(await sale.getAddress(),sale.interface.encodeFunctionData('withdrawProceeds'))
  const tx=await transaction(await outsider.getAddress(),'0x',PRICE),sigs=await signatures(tx,owners.slice(0,2))
  await assert.rejects(execute({...tx,to:await buyer.getAddress()},sigs))
  await sent(execute(tx,sigs));await assert.rejects(execute(tx,sigs))
  assert.equal(await provider.getBalance(await safe.getAddress()),209n*PRICE)
})
test('failed sale call with zero reimbursement gas leaves Safe nonce and treasury unchanged for corrected retry',async()=>{
  const nonce=await safe.nonce()
  await assert.rejects(call(await sale.getAddress(),sale.interface.encodeFunctionData('withdrawInventory',[9790])))
  assert.equal(await safe.nonce(),nonce);assert.equal(await sale.paused(),false)
  await call(await sale.getAddress(),sale.interface.encodeFunctionData('pause'))
  await call(await sale.getAddress(),sale.interface.encodeFunctionData('withdrawInventory',[9790]))
  assert.equal(await sale.available(),0n)
})
