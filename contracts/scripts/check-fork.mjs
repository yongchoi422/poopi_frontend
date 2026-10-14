// Public Base RPC is READ ONLY. Every deployment, impersonation and purchase
// runs inside Hardhat's disposable in-process chain (31337).
import { network } from 'hardhat'
import { JsonRpcProvider, JsonRpcSigner, BrowserProvider, Contract, ContractFactory, keccak256, id } from 'ethers'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import assert from 'node:assert/strict'
const url=process.env.BASE_READ_RPC||'https://base-rpc.publicnode.com'
const tokenAddress='0xb43eA104c7ec75038Ac8EcA57107Eefc8B039aFF'
const a=JSON.parse(readFileSync(new URL('../artifacts/contracts.json',import.meta.url))).contracts
const upstream=new JsonRpcProvider(url),UNIT=1000000000n,PRICE=1000000000000n
let connection,p
try{
  assert.equal((await upstream.getNetwork()).chainId,8453n)
  const head=await upstream.getBlockNumber(),blockNumber=process.env.BASE_FORK_BLOCK?Number(process.env.BASE_FORK_BLOCK):head-20
  assert.ok(Number.isSafeInteger(blockNumber)&&blockNumber>0&&blockNumber<=head)
  console.log('Read-only Base snapshot:',blockNumber)
  const publicToken=new Contract(tokenAddress,a.Souli.abi,upstream)
  const holder=await publicToken.pool({blockTag:blockNumber}),code=await upstream.getCode(tokenAddress,blockNumber)
  assert.notEqual(code,'0x');assert.ok(await publicToken.balanceOf(holder,{blockTag:blockNumber})>=1000n*UNIT)
  connection=await network.create({network:'default',override:{chainId:31337,forking:{url,blockNumber}}})
  p=new BrowserProvider(connection.provider,undefined,{cacheTimeout:-1})
  assert.equal((await p.getNetwork()).chainId,31337n)
  const [admin,buyer,finalBuyer,treasury]=await p.listAccounts()
  const token=new Contract(tokenAddress,a.Souli.abi,p)
  const now=(await p.getBlock('latest')).timestamp
  const sale=await new ContractFactory(a.SouliEthSale.abi,a.SouliEthSale.bytecode,admin).deploy(tokenAddress,holder,await treasury.getAddress(),PRICE,1000,1000,now-1,now+3600,id('LOCAL BASE FORK ONLY'))
  await sale.waitForDeployment()
  // Never use an upstream signer. These methods affect only the local fork.
  await p.send('hardhat_impersonateAccount',[holder]);await p.send('hardhat_setBalance',[holder,'0x56bc75e2d63100000'])
  const localHolder=new JsonRpcSigner(p,holder),sent=async promise=>(await promise).wait()
  // The configured pool is currently also an EOA owner, not evidence of a DEX.
  // Check actual deployed behavior without sending anything to public Base.
  const poolResetRejected = await token.connect(localHolder).launch.staticCall(await finalBuyer.getAddress()).then(()=>false,()=>true)
  assert.equal(poolResetRejected,true,'Do not assume an already-launched token can be assigned a new pool')
  await sent(token.connect(localHolder).approve(await sale.getAddress(),1000n*UNIT));await sent(sale.connect(localHolder).deposit(1000));await sent(sale.connect(localHolder).unpause())
  await sent(sale.connect(buyer).buy(210,now+300,{value:210n*PRICE}));assert.equal(await token.balanceOf(await buyer.getAddress()),210n*UNIT)
  const first=await token.dynamicInscription(await buyer.getAddress());assert.equal(first.seed,210n)
  const svg=await token.getSvg([first.seed,first.extra]);assert.match(svg,/<svg/)
  await sent(sale.connect(buyer).buy(10,now+300,{value:10n*PRICE}));assert.equal((await token.dynamicInscription(await buyer.getAddress())).seed,220n)
  await sent(sale.connect(finalBuyer).buy(780,now+300,{value:780n*PRICE}));assert.equal(await token.balanceOf(await finalBuyer.getAddress()),780n*UNIT)
  assert.equal(await token.inscriptionCount(await finalBuyer.getAddress()),1n)
  assert.equal((await token.inscriptionOfOwnerByIndex(await finalBuyer.getAddress(),0)).seed,780n)
  assert.equal(await sale.available(),0n);assert.equal(await p.getBalance(await sale.getAddress()),1000n*PRICE)
  const report={checkedAt:new Date().toISOString(),publicChainId:8453,localChainId:31337,blockNumber,token:tokenAddress,tokenRuntimeCodeHash:keccak256(code),stockSource:holder,poolResetRejected,checks:['configured pool cannot relaunch token','exact 210 SOULI delivery','on-chain SVG returned','repeat purchase Dynamic seed 220','final inventory delivered Stable seed 780','stock and ETH conservation'],svgBytes:Buffer.byteLength(svg),publicTransactionsSent:0,independentAudit:false}
  const dir=new URL('../../logs/sale-checks/',import.meta.url);mkdirSync(dir,{recursive:true});writeFileSync(new URL('base-fork.json',dir),JSON.stringify(report,null,2));writeFileSync(new URL('base-fork-buyer.svg',dir),svg)
  console.log('PASS:',JSON.stringify(report))
}finally{upstream.destroy();p?.destroy();await connection?.close()}
