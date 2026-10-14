import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {network} from 'hardhat'
import {BrowserProvider,ContractFactory,Contract,id} from 'ethers'
test('Slither stock-balance findings: authorized callback cannot reenter deposit, recovery, held-token or ETH paths',async()=>{
 const connection=await network.create('default'),p=new BrowserProvider(connection.provider,undefined,{cacheTimeout:-1})
 try{
  assert.equal((await p.getNetwork()).chainId,31337n)
  const arts=JSON.parse(readFileSync(new URL('../artifacts/contracts.json',import.meta.url))).contracts
  const [a,b,c]=await p.listAccounts(),sent=async x=>(await x).wait()
  const deploy=async(name,args=[])=>{const art=arts[name],x=await new ContractFactory(art.abi,art.bytecode,a).deploy(...args);await x.waitForDeployment();return x}
  const token=await deploy('StockCallbackToken'),op=await deploy('StockCallbackOperator'),now=(await p.getBlock('latest')).timestamp
  const ctl=await deploy('SouliThreeWalletControllerV2',[await token.getAddress(),[a.address,await op.getAddress(),c.address],100000000n,100,100,now-1,0,id('LOCAL callback reproduction')])
  const sale=new Contract(await ctl.sale(),arts.SouliEthSaleV2.abi,p)
  await sent(token.transfer(await op.getAddress(),100n*1000000000n))
  await sent(token.setCallback(await op.getAddress(),op.interface.encodeFunctionData('reenter')))
  await sent(op.deposit(await ctl.getAddress(),100))
  const depositAttempts=await op.attempts();assert.ok(depositAttempts>=8n)
  assert.equal(await op.guardRejections(),depositAttempts);assert.equal(await op.successes(),0n)
  assert.equal(await sale.available(),100n);assert.equal(await token.balanceOf(await ctl.getAddress()),0n)
  await sent(token.setCallback('0x0000000000000000000000000000000000000000','0x'))
  await sent(ctl.startSale());await sent(sale.connect(b).buy(3,now+600,{value:300000000n}));await sent(ctl.pauseSale())
  await sent(token.setCallback(await op.getAddress(),op.interface.encodeFunctionData('reenter')))
  await sent(op.recover(await ctl.getAddress(),97))
  assert.ok(await op.attempts()>depositAttempts);assert.equal(await op.guardRejections(),await op.attempts());assert.equal(await op.successes(),0n)
  assert.equal(await token.balanceOf(await op.getAddress()),97n*1000000000n);assert.equal(await token.balanceOf(b.address),3n*1000000000n)
  assert.equal(await token.allowance(await op.getAddress(),await ctl.getAddress()),0n);assert.equal(await sale.available(),0n)
  await sent(ctl.collectProceeds());assert.equal(await p.getBalance(await ctl.getAddress()),0n);assert.equal(await p.getBalance(await sale.getAddress()),0n)
 }finally{p.destroy();await connection.close()}
})
