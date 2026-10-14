import { before, after, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { network } from 'hardhat'
import { BrowserProvider, Contract, ContractFactory, id, ZeroAddress } from 'ethers'
import { readFileSync } from 'node:fs'
const UNIT=1_000_000_000n, PRICE=1_000_000_000_000n, CAP=1000n, TARGET=CAP*PRICE
let connection,p,a,owner,buyer,other,token,weth,factory,router,sale,pair,lock,now,snapshot
const sent=async promise=>(await promise).wait()
const addr=async c=>c.getAddress()
async function deploy(name,args=[],signer=owner,options={}) {
  const c=await new ContractFactory(a[name].abi,a[name].bytecode,signer).deploy(...args,options)
  await c.waitForDeployment();return c
}
async function createSale(overrides={}) {
  return deploy('SouliLpSale',[{token:await addr(token),admin:await addr(owner),router:await addr(router),factory:await addr(factory),
    weth:await addr(weth),price:PRICE,cap:CAP,startsAt:now-1,toleranceBps:50,termsHash:id('LOCAL CANDIDATE - NO VALUE'),...overrides}])
}
async function fundStock(s=sale) {
  const reserve=await s.requiredLpUnits()
  await sent(token.approve(await addr(s),CAP*UNIT+reserve));await sent(s.depositInventory(CAP));await sent(s.depositLpReserve(reserve))
}
async function ready() {await sent(sale.connect(buyer).buy(210,now+3600,{value:210n*PRICE}));await sent(sale.connect(other).support({value:790n*PRICE}))}
async function fail(fn,name) {
  await assert.rejects(fn,e=>{
    let data=e.data??e.info?.error?.data; if(typeof data==='object')data=data?.data
    const decoded=typeof data==='string'?sale.interface.parseError(data):null
    assert.equal(decoded?.name,name,`Expected ${name}: ${e.shortMessage||e.message}`);return true
  })
}
async function seedPool(t=100n*UNIT,e=100n*PRICE) {
  await sent(token.transfer(await addr(pair),t));await sent(weth.deposit({value:e}));await sent(weth.transfer(await addr(pair),e));await sent(pair.mint(await addr(owner)))
}
async function conserved() {
  assert.equal(await token.balanceOf(await addr(sale)),await sale.inventoryUnits()+await sale.lpReserveUnits())
  assert.equal(await sale.fundedWei(),await sale.purchaseWei()+await sale.supportWei())
  assert.equal(await p.getBalance(await addr(sale)),await sale.fundedWei()-await sale.suppliedWei())
}
before(async()=>{
  a=JSON.parse(readFileSync(new URL('../artifacts/contracts.json',import.meta.url))).contracts
  connection=await network.create('default');p=new BrowserProvider(connection.provider,undefined,{cacheTimeout:-1})
  ;[owner,buyer,other]=await p.listAccounts();now=(await p.getBlock('latest')).timestamp
  token=await deploy('TestToken');weth=await deploy('LpTestWeth');factory=await deploy('LpTestFactory');router=await deploy('LpTestRouter',[await addr(factory),await addr(weth)])
  sale=await createSale();pair=new Contract(await sale.pair(),a.LpTestPair.abi,owner);lock=new Contract(await sale.lpLock(),a.SouliPermanentLpLock.abi,owner)
  await fundStock();await sent(sale.unpause());snapshot=await p.send('evm_snapshot',[])
})
beforeEach(async()=>{await p.send('evm_revert',[snapshot]);snapshot=await p.send('evm_snapshot',[])})
after(async()=>{p?.destroy();await connection?.close()})

test('LP: immediate exact delivery, separate support, conserved reserve',async()=>{
  await ready();assert.equal(await token.balanceOf(await addr(buyer)),210n*UNIT);assert.equal(await token.balanceOf(await addr(other)),0n)
  assert.equal(await sale.sold(),210n);assert.equal(await sale.purchaseWei(),210n*PRICE);assert.equal(await sale.supportWei(),790n*PRICE)
  assert.equal(await sale.lpReserveUnits(),1005n*UNIT);assert.equal(await sale.state(),2n);await conserved()
})
test('LP: sale cannot open with missing reserve or partial purchase inventory',async()=>{
  const s=await createSale();await sent(token.approve(await addr(s),2005n*UNIT));await sent(s.depositInventory(999))
  await fail(()=>s.unpause(),'ReserveNotReady');await sent(s.depositLpReserve(1005n*UNIT));await fail(()=>s.unpause(),'ReserveNotReady')
  await sent(s.depositInventory(1));await sent(s.unpause());assert.equal(await s.activated(),true)
})
test('LP: amount, exact price, quote and start-time checks reject before taking funds',async()=>{
  await fail(()=>sale.connect(buyer).buy(0,now+3600),'InvalidQuantity')
  await fail(()=>sale.connect(buyer).buy(1,now+3600,{value:PRICE+1n}),'WrongPayment')
  await fail(()=>sale.connect(buyer).buy(1,now-1,{value:PRICE}),'QuoteExpired')
  await fail(()=>sale.connect(buyer).buy(1001,now+3600,{value:1001n*PRICE}),'InvalidQuantity')
  const s=await createSale({startsAt:now+500});await fundStock(s);await sent(s.unpause())
  await fail(()=>s.connect(buyer).buy(1,now+3600,{value:PRICE}),'FundingClosed');await fail(()=>s.support({value:1}),'FundingClosed');await conserved()
})
test('LP: token revert/fee and callback cannot retain payment or duplicate a purchase',async()=>{
  await sent(token.setFailure(true));await assert.rejects(sale.connect(buyer).buy(1,now+3600,{value:PRICE}),/Test transfer failed/)
  await sent(token.setFailure(false));await sent(token.setFee(true));await fail(()=>sale.connect(buyer).buy(1,now+3600,{value:PRICE}),'UnexpectedTransfer')
  assert.equal(await sale.sold(),0n);assert.equal(await sale.fundedWei(),0n);await conserved()
  await sent(token.setFee(false));await sent(token.setCallback(await addr(sale),sale.interface.encodeFunctionData('support')))
  await sent(sale.connect(buyer).buy(2,now+3600,{value:2n*PRICE}));assert.equal(await token.callbackSucceeded(),false);assert.equal(await sale.sold(),2n);await conserved()
})
test('LP: competing last deposits cannot overfund and neither path takes overpayment',async()=>{
  await sent(sale.connect(other).support({value:TARGET-PRICE}));await fail(()=>sale.connect(buyer).buy(2,now+3600,{value:2n*PRICE}),'InsufficientInventory')
  await sent(sale.connect(buyer).buy(1,now+3600,{value:PRICE}))
  await fail(()=>sale.connect(other).support({value:1}),'FundingClosed');await fail(()=>sale.connect(other).buy(1,now+3600,{value:PRICE}),'FundingClosed');await conserved()
})
test('LP: fractional support remainder can be completed without excess purchase',async()=>{
  await sent(sale.support({value:TARGET-PRICE/2n}));assert.equal(await sale.available(),0n)
  await fail(()=>sale.connect(buyer).buy(1,now+3600,{value:PRICE}),'InsufficientInventory')
  await fail(()=>sale.support({value:PRICE}),'WrongPayment');await sent(sale.support({value:PRICE/2n}));assert.equal(await sale.remainingWei(),0n)
})
test('LP: owner can only recover unsold stock, never reserved assets or buyer tokens',async()=>{
  await sent(sale.connect(buyer).buy(210,now+3600,{value:210n*PRICE}));await sent(sale.pause())
  await fail(()=>sale.withdrawInventory(791),'InvalidQuantity');await sent(sale.withdrawInventory(790))
  assert.equal(await token.balanceOf(await addr(sale)),1005n*UNIT);assert.equal(await token.balanceOf(await addr(buyer)),210n*UNIT)
  for(const signature of ['withdrawProceeds()','withdrawLpReserve()','upgradeTo(address)','refund()']){
    const data=id(signature).slice(0,10)+(signature.includes('address')?'0'.repeat(64):'')
    await fail(()=>owner.sendTransaction({to:sale.target,data}),'DirectPaymentDisabled')
  }
  await sent(sale.connect(other).support({value:790n*PRICE}));await sent(sale.connect(other).finalize());assert.equal(await sale.launched(),true)
})
test('LP: permissionless finalization deposits ALL accounted ETH directly into locked LP',async()=>{
  await ready();await sent(sale.pause());await sent(sale.connect(other).finalize())
  assert.equal(await sale.suppliedWei(),TARGET);assert.equal(await weth.balanceOf(await addr(pair)),TARGET)
  assert.equal(await sale.suppliedTokenUnits(),1000n*UNIT);assert.equal(await sale.lpReserveUnits(),5n*UNIT)
  assert.equal(await lock.lockedBalance(),await sale.mintedLockedLp());assert.ok(await lock.lockedBalance()>0n)
  assert.equal(await pair.balanceOf(await addr(owner)),0n);assert.equal(await token.allowance(await addr(sale),await addr(router)),0n);await conserved()
  await fail(()=>sale.connect(buyer).finalize(),'FundingClosed');await fail(()=>sale.support({value:1}),'FundingClosed');await fail(()=>sale.unpause(),'FundingClosed')
})
test('LP: lock has no approval, transfer, owner withdrawal or upgrade route',async()=>{
  await ready();await sent(sale.finalize());const before=await lock.lockedBalance()
  for(const data of [id('withdraw()').slice(0,10),id('transfer(address,uint256)').slice(0,10)+'0'.repeat(128),id('approve(address,uint256)').slice(0,10)+'0'.repeat(128)]){
    await assert.rejects(owner.sendTransaction({to:await addr(lock),data}),e=>{assert.equal(e.code,'CALL_EXCEPTION');return true})
  }
  await assert.rejects(pair.transferFrom(await addr(lock),await addr(owner),1n),e=>{assert.equal(e.code,'CALL_EXCEPTION');return true})
  assert.equal(await lock.lockedBalance(),before)
})
test('LP: failed router, wrong lock, partial ETH, dishonest receipt and excess allowance all roll back',async()=>{
  await seedPool();await ready()
  for(const mode of [1,2,3,4,5]){
    await sent(router.setMode(mode));await assert.rejects(sale.finalize({gasLimit:4000000}).then(tx=>tx.wait()),e=>{
      assert.ok(e.code==='CALL_EXCEPTION'||(e.code==='UNKNOWN_ERROR'&&/revert/i.test(e.message)),e.message);return true
    })
    assert.equal(await sale.launched(),false);assert.equal(await sale.suppliedWei(),0n);assert.equal(await lock.lockedBalance(),0n)
    assert.equal(await token.allowance(await addr(sale),await addr(router)),0n);assert.equal(await weth.balanceOf(await addr(pair)),100n*PRICE);await conserved()
  }
  await sent(router.setMode(0));await sent(sale.connect(other).finalize());assert.equal(await sale.launched(),true)
})
test('LP: router reentrancy cannot run finalization twice',async()=>{
  await seedPool();await ready();await sent(router.setMode(6));await sent(sale.finalize());assert.equal(await router.callbackSucceeded(),false);assert.equal(await sale.suppliedWei(),TARGET)
})
test('LP: first-mint revert, diverted LP, dishonest amount and under-mint are atomic',async()=>{
  await ready()
  for(const mode of [1,2,3,4]){
    await sent(pair.setMintMode(mode))
    if(mode===1)await assert.rejects(sale.finalize(),/MINT_FAILURE/)
    else await fail(()=>sale.finalize(),'InvalidLiquidityReceipt')
    assert.equal(await sale.launched(),false);assert.equal(await lock.lockedBalance(),0n)
    assert.equal(await pair.totalSupply(),0n);assert.equal(await weth.balanceOf(await addr(pair)),0n);await conserved()
  }
  await sent(pair.setMintMode(0));await sent(sale.connect(other).finalize());assert.equal(await sale.launched(),true)
})
test('LP: failed or taxed original-token transfer cannot create partial first liquidity',async()=>{
  await ready();await sent(token.setFailure(true));await assert.rejects(sale.finalize(),/Test transfer failed/)
  await sent(token.setFailure(false));await sent(token.setFee(true));await fail(()=>sale.finalize(),'InvalidLiquidityReceipt')
  assert.equal(await pair.totalSupply(),0n);assert.equal(await sale.suppliedWei(),0n);assert.equal(await token.balanceOf(await addr(buyer)),210n*UNIT);await conserved()
  await sent(token.setFee(false));await sent(sale.finalize());assert.equal(await sale.launched(),true)
})
test('LP: existing pool at fixed price is supported; precreated empty pair is not fatal',async()=>{
  await seedPool();await ready();await sent(sale.finalize());assert.equal(await sale.suppliedWei(),TARGET);assert.equal(await sale.suppliedTokenUnits(),1000n*UNIT)
})
test('LP: bad preseeded ratio rejects without loss and retries after external price correction',async()=>{
  await seedPool(200n*UNIT,100n*PRICE);await ready();await fail(()=>sale.finalize(),'PriceOutsideTerms')
  assert.equal(await sale.state(),2n);assert.equal(await token.balanceOf(await addr(buyer)),210n*UNIT);await conserved()
  // External correction is a test donation, NOT a privileged repair or guarantee.
  await sent(weth.deposit({value:100n*PRICE}));await sent(weth.transfer(await addr(pair),100n*PRICE));await sent(pair.sync())
  await sent(sale.connect(other).finalize());assert.equal(await sale.suppliedWei(),TARGET)
})
test('LP: reserve buffer permits bounded price drift while all ETH is supplied',async()=>{
  await seedPool(1004n*UNIT,1000n*PRICE);await ready();await sent(sale.finalize())
  assert.equal(await sale.suppliedWei(),TARGET);assert.equal(await sale.suppliedTokenUnits(),1004n*UNIT);assert.equal(await sale.lpReserveUnits(),UNIT)
})
test('LP: fractional token rounding and leftover approval do not strand ETH',async()=>{
  const t=999n*UNIT+3n,e=997n*PRICE;assert.notEqual(TARGET*t%e,0n)
  await seedPool(t,e);await ready();await sent(sale.finalize())
  assert.equal(await sale.suppliedWei(),TARGET);assert.equal(await sale.suppliedTokenUnits(),TARGET*t/e)
  assert.equal(await token.allowance(await addr(sale),await addr(router)),0n);await conserved()
})
test('LP: out-of-band drift beyond the immutable bound fails closed',async()=>{
  await seedPool(1006n*UNIT,1000n*PRICE);await ready();await fail(()=>sale.finalize(),'PriceOutsideTerms');await conserved()
})
test('LP: unsynced one-wei dust is skimmed to the lock, not stolen or counted as funding',async()=>{
  await sent(weth.deposit({value:1}));await sent(weth.transfer(await addr(pair),1));await ready();await sent(sale.finalize())
  assert.equal(await weth.balanceOf(await addr(lock)),1n);assert.equal(await sale.suppliedWei(),TARGET)
})
test('LP: synced one-sided dust no longer blocks first mint or takes ETH',async()=>{
  await sent(weth.deposit({value:1}));await sent(weth.transfer(await addr(pair),1));await sent(pair.sync());await ready()
  await sent(sale.finalize());assert.equal(await sale.suppliedWei(),TARGET);assert.equal(await weth.balanceOf(await addr(pair)),TARGET+1n);await conserved()
})
test('LP: a large synced gift that would corrupt the initial price still rejects safely',async()=>{
  await sent(weth.deposit({value:TARGET}));await sent(weth.transfer(await addr(pair),TARGET));await sent(pair.sync());await ready()
  await fail(()=>sale.finalize(),'PriceOutsideTerms');assert.equal(await sale.state(),2n);await conserved()
})
test('LP: direct and forced ETH never forge progress; forced surplus has no admin exit',async()=>{
  await fail(()=>other.sendTransaction({to:sale.target,value:PRICE}),'DirectPaymentDisabled')
  await deploy('LpForceEth',[await addr(sale)],owner,{value:PRICE});assert.equal(await sale.fundedWei(),0n)
  await ready();await sent(sale.finalize());assert.equal(await sale.suppliedWei(),TARGET);assert.equal(await p.getBalance(await addr(sale)),PRICE)
})
test('LP: direct token donation cannot be withdrawn as stock or replace required prefunding',async()=>{
  await sent(token.transfer(await addr(sale),7n*UNIT));await sent(sale.pause());await fail(()=>sale.withdrawInventory(1001),'InvalidQuantity')
  const s=await createSale();await sent(token.transfer(await addr(s),2005n*UNIT));await fail(()=>s.unpause(),'FundingClosed')
})
test('LP: new owner still cannot withdraw reserves and cannot veto ready finalization',async()=>{
  await ready();await sent(sale.transferOwnership(await addr(other)));await sent(sale.connect(other).acceptOwnership())
  await sent(sale.connect(other).pause());await sent(sale.connect(other).withdrawInventory(790));await fail(()=>sale.connect(other).withdrawInventory(1),'InvalidQuantity')
  await sent(sale.connect(buyer).finalize());assert.equal(await sale.suppliedWei(),TARGET);assert.equal(await sale.owner(),await addr(other))
})
test('LP: invalid configuration and mismatched router dependencies are rejected',async()=>{
  for(const override of [{price:0n},{cap:0n},{toleranceBps:101},{token:ZeroAddress},{weth:await addr(token)},{factory:await addr(token)},{termsHash:'0x'+'0'.repeat(64)}])
    await assert.rejects(createSale(override),e=>{assert.equal(e.code,'CALL_EXCEPTION');return true})
})
test('LP: deterministic mixed purchase/support sequence conserves assets through launch',async()=>{
  let seed=793,sold=0n,support=0n
  for(let i=0;i<30;i++){
    seed=(seed*1664525+1013904223)>>>0;const q=BigInt(seed%10+1)
    if(i%3===0){await sent(sale.connect(other).support({value:q*PRICE}));support+=q*PRICE}
    else{await sent(sale.connect(buyer).buy(q,now+3600,{value:q*PRICE}));sold+=q}
    assert.equal(await sale.sold(),sold);assert.equal(await sale.supportWei(),support);await conserved()
  }
  await sent(sale.support({value:await sale.remainingWei()}));await sent(sale.finalize());await conserved()
  assert.equal(await token.balanceOf(await addr(buyer)),sold*UNIT)
})
test('LP: mainnet constructor rejects test-token/router configuration even if dependencies agree',async()=>{
  const c=await network.create({network:'default',override:{chainId:8453}}),provider=new BrowserProvider(c.provider,undefined,{cacheTimeout:-1})
  try{
    const [s]=await provider.listAccounts()
    const localDeploy=async(name,args=[])=>{const x=await new ContractFactory(a[name].abi,a[name].bytecode,s).deploy(...args);await x.waitForDeployment();return x}
    const t=await localDeploy('TestToken'),w=await localDeploy('LpTestWeth'),f=await localDeploy('LpTestFactory'),r=await localDeploy('LpTestRouter',[f.target,w.target])
    await fail(()=>localDeploy('SouliLpSale',[{token:t.target,admin:s.address,router:r.target,factory:f.target,weth:w.target,
      price:PRICE,cap:CAP,startsAt:0,toleranceBps:50,termsHash:id('INVALID MAINNET FIXTURE')}]),'InvalidConfiguration')
  }finally{provider.destroy();await c.close()}
})
