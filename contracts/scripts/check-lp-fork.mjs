// Public Base is READ ONLY. All transactions use this in-process Hardhat fork.
import { network } from 'hardhat'
import { JsonRpcProvider, BrowserProvider, JsonRpcSigner, Contract, ContractFactory, id } from 'ethers'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import assert from 'node:assert/strict'
const url=process.env.BASE_READ_RPC||'https://mainnet.base.org'
const TOKEN='0xb43eA104c7ec75038Ac8EcA57107Eefc8B039aFF', ROUTER='0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24'
const FACTORY='0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6', WETH='0x4200000000000000000000000000000000000006'
const UNIT=1_000_000_000n,PRICE=1_000_000_000_000n,CAP=1000n,TARGET=CAP*PRICE
const a=JSON.parse(readFileSync(new URL('../artifacts/contracts.json',import.meta.url))).contracts
const upstream=new JsonRpcProvider(url,undefined,{batchMaxCount:1})
const report={checkedAt:new Date().toISOString(),publicChainId:8453,localChainId:31337,publicTransactionsSent:0,
  independentAudit:false,token:TOKEN,router:ROUTER,factory:FACTORY,weth:WETH,checks:[],gas:{},passed:false}
let connection,p
try {
  assert.equal((await upstream.getNetwork()).chainId,8453n)
  const head=await upstream.getBlockNumber(),block=Number(process.env.BASE_FORK_BLOCK||52067385)
  assert.ok(Number.isSafeInteger(block)&&block<=head&&block>0);report.block=block
  connection=await network.create({network:'default',override:{chainId:31337,forking:{url,blockNumber:block}}})
  p=new BrowserProvider(connection.provider,undefined,{cacheTimeout:-1});assert.equal((await p.getNetwork()).chainId,31337n)
  await p.send('evm_mine',[])
  const [deployer,buyer,caller]=await p.listAccounts(),buyerAddress=await buyer.getAddress(),callerAddress=await caller.getAddress()
  const token=new Contract(TOKEN,a.Souli.abi,p),holder=await token.pool()
  await p.send('hardhat_impersonateAccount',[holder]);await p.send('hardhat_setBalance',[holder,'0x56bc75e2d63100000'])
  const admin=new JsonRpcSigner(p,holder),now=(await p.getBlock('latest')).timestamp,deadline=now+36000
  const sale=await new ContractFactory(a.SouliLpSale.abi,a.SouliLpSale.bytecode,deployer).deploy({token:TOKEN,admin:holder,
    router:ROUTER,factory:FACTORY,weth:WETH,price:PRICE,cap:CAP,startsAt:now-1,toleranceBps:50,termsHash:id('LOCAL LP FORK ONLY')})
  const deployment=await sale.deploymentTransaction().wait();report.gas.deployment=String(deployment.gasUsed)
  const address=await sale.getAddress(),pairAddress=await sale.pair(),lockAddress=await sale.lpLock()
  const pair=new Contract(pairAddress,['function getReserves() view returns(uint112,uint112,uint32)','function sync()',
    'function balanceOf(address) view returns(uint256)','function totalSupply() view returns(uint256)','function transferFrom(address,address,uint256) returns(bool)'],p)
  const weth=new Contract(WETH,['function deposit() payable','function transfer(address,uint256) returns(bool)','function balanceOf(address) view returns(uint256)'],admin)
  const router=new Contract(ROUTER,['function addLiquidityETH(address,uint256,uint256,uint256,address,uint256) payable returns(uint256,uint256,uint256)',
    'function getAmountsOut(uint256,address[]) view returns(uint256[])','function swapExactTokensForETH(uint256,uint256,address[],address,uint256) returns(uint256[])'],admin)
  const sent=async promise=>(await promise).wait()
  await sent(token.connect(admin).approve(address,2005n*UNIT));await sent(sale.connect(admin).depositInventory(CAP))
  await sent(sale.connect(admin).depositLpReserve(1005n*UNIT));await sent(sale.connect(admin).unpause())
  let snapshot=await p.send('evm_snapshot',[])
  const scenario=async(name,fn)=>{
    await p.send('evm_revert',[snapshot]);snapshot=await p.send('evm_snapshot',[])
    await fn();report.checks.push(name);console.log('PASS:',name)
  }
  const ready=async()=>{await sent(sale.connect(buyer).buy(210,deadline,{value:210n*PRICE}));await sent(sale.connect(caller).support({value:790n*PRICE}))}
  const seed=async(tokens=100n*UNIT,eth=100n*PRICE)=>{
    await sent(token.connect(admin).approve(ROUTER,tokens));await sent(router.addLiquidityETH(TOKEN,tokens,tokens,eth,holder,deadline,{value:eth}))
  }
  const launch=async()=>{
    const receipt=await sent(sale.connect(caller).finalize());assert.equal(await sale.suppliedWei(),TARGET)
    assert.equal(await sale.launched(),true);assert.equal(await p.getBalance(address),0n)
    assert.equal(await pair.balanceOf(lockAddress),await sale.mintedLockedLp());assert.ok(await pair.balanceOf(lockAddress)>0n)
    assert.equal(await token.allowance(address,ROUTER),0n);assert.equal(await token.pool(),holder)
    return receipt
  }
  await scenario('actual SOULI immediate inscription, full ETH supply, permanent LP and post-launch token sell',async()=>{
    await ready();const soul=await token.dynamicInscription(buyerAddress);assert.equal(soul.seed,210n)
    assert.match(await token.getSvg([soul.seed,soul.extra]),/<svg/)
    report.gas.firstFinalize=String((await launch()).gasUsed)
    assert.equal(await token.balanceOf(pairAddress),1000n*UNIT);assert.equal(await weth.balanceOf(pairAddress),TARGET)
    await sent(sale.connect(admin).withdrawInventory(790));assert.equal(await token.balanceOf(address),5n*UNIT)
    const out=await router.getAmountsOut(10n*UNIT,[TOKEN,WETH]);await sent(token.connect(buyer).approve(ROUTER,10n*UNIT))
    await sent(router.connect(buyer).swapExactTokensForETH(10n*UNIT,out[1]*99n/100n,[TOKEN,WETH],buyerAddress,deadline))
    assert.equal(await token.balanceOf(buyerAddress),200n*UNIT)
    await assert.rejects(pair.connect(admin).transferFrom(lockAddress,holder,1n),e=>{assert.equal(e.code,'CALL_EXCEPTION');return true})
    await assert.rejects(sale.connect(caller).finalize(),e=>{assert.equal(e.code,'CALL_EXCEPTION');return true})
  })
  await scenario('actual existing pool at fixed ratio supplies every accounted wei',async()=>{
    await seed();await ready();report.gas.existingFinalize=String((await launch()).gasUsed)
    assert.equal(await token.balanceOf(pairAddress),1100n*UNIT);assert.equal(await weth.balanceOf(pairAddress),1100n*PRICE)
  })
  await scenario('preseeded bad ratio preserves funds; external correction allows permissionless retry',async()=>{
    await seed(200n*UNIT,100n*PRICE);await ready()
    await assert.rejects(sale.connect(caller).finalize(),e=>{assert.equal(sale.interface.parseError(e.data)?.name,'PriceOutsideTerms');return true})
    assert.equal(await p.getBalance(address),TARGET);assert.equal(await sale.launched(),false);assert.equal(await token.balanceOf(buyerAddress),210n*UNIT)
    await sent(weth.deposit({value:100n*PRICE}));await sent(weth.transfer(pairAddress,100n*PRICE));await sent(pair.connect(admin).sync());await launch()
  })
  await scenario('one wei unsynced WETH dust cannot brick original-token pair initialization',async()=>{
    await sent(weth.deposit({value:1}));await sent(weth.transfer(pairAddress,1));await ready();await launch();assert.equal(await weth.balanceOf(lockAddress),1n)
  })
  await scenario('one wei synced WETH dust cannot brick first mint',async()=>{
    await sent(weth.deposit({value:1}));await sent(weth.transfer(pairAddress,1));await sent(pair.connect(admin).sync());await ready();await launch()
    assert.equal(await weth.balanceOf(pairAddress),TARGET+1n)
  })
  await scenario('fractional original SOULI dust is skimmed without losing launch funds',async()=>{
    await sent(token.connect(admin).transfer(pairAddress,1n));await ready();await launch();assert.equal(await token.balanceOf(lockAddress),1n)
  })
  await scenario('bounded 0.4% existing-price drift uses protected SOULI buffer, not less ETH',async()=>{
    await seed(1004n*UNIT,1000n*PRICE);await ready();await launch()
    assert.equal(await sale.suppliedTokenUnits(),1004n*UNIT);assert.equal(await sale.lpReserveUnits(),UNIT)
  })
  await scenario('non-divisible existing reserve ratio clears leftover allowance and supplies all ETH',async()=>{
    const t=999n*UNIT+3n,e=997n*PRICE;assert.notEqual(TARGET*t%e,0n)
    await seed(t,e);await ready();await launch();assert.equal(await sale.suppliedTokenUnits(),TARGET*t/e)
  })
  await scenario('router failure rolls back approval and ETH; restored dependency can retry',async()=>{
    await seed();await ready();const code=await p.getCode(ROUTER)
    await p.send('hardhat_setCode',[ROUTER,'0x60006000fd'])
    await assert.rejects(sale.connect(caller).finalize(),e=>{assert.equal(e.code,'CALL_EXCEPTION');return true})
    assert.equal(await p.getBalance(address),TARGET);assert.equal(await token.allowance(address,ROUTER),0n);assert.equal(await sale.state(),2n)
    await p.send('hardhat_setCode',[ROUTER,code]);await launch()
  })
  report.localSale=address;report.localPair=pairAddress;report.localLock=lockAddress;report.passed=true
} catch(e){report.error=e.shortMessage||e.message;report.rpcError=e.info?.error?.message||null;process.exitCode=1;console.error('FAIL:',report.error,report.rpcError||'')}
finally {mkdirSync(new URL('../../logs/sale-checks/',import.meta.url),{recursive:true});writeFileSync(new URL('../../logs/sale-checks/lp-sale-fork.json',import.meta.url),JSON.stringify(report,null,2)+'\n');upstream.destroy();p?.destroy();await connection?.close()}
