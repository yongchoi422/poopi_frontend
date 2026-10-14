// Public Base is read-only. Every transaction below runs on disposable chain 31337.
import {network} from 'hardhat'
import {JsonRpcProvider,BrowserProvider,JsonRpcSigner,Contract,ContractFactory,keccak256,ZeroAddress} from 'ethers'
import {readFileSync,writeFileSync} from 'node:fs'
import assert from 'node:assert/strict'
import {createReadOnlyForkRpc} from './read-only-fork-rpc.mjs'
import {BASE_V2,YEAR_SECONDS} from './lp-timelock-plan.mjs'
import {BASE_TOKEN_CODE_HASH} from './release-tools.mjs'
const url='https://mainnet.base.org',upstream=new JsonRpcProvider(url,undefined,{batchMaxCount:1,cacheTimeout:-1})
const arts=JSON.parse(readFileSync(new URL('../artifacts/contracts.json',import.meta.url))).contracts
const report={checkedAt:new Date().toISOString(),publicChainId:8453,localChainId:31337,publicTransactionsSent:0,
  independentAudit:false,passed:false,checks:[],protocol:BASE_V2}
let proxy,connection,p
try {
 assert.equal((await upstream.getNetwork()).chainId,8453n)
 const block=(await upstream.getBlockNumber())-20;report.forkBlock=block
 assert.equal(keccak256(await upstream.getCode(BASE_V2.token,block)),BASE_TOKEN_CODE_HASH)
 console.log('Read-only Base fork:',block)
 proxy=await createReadOnlyForkRpc(url)
 connection=await network.create({network:'default',override:{chainId:31337,forking:{url:proxy.url,blockNumber:block}}})
 p=new BrowserProvider(connection.provider,undefined,{cacheTimeout:-1})
 assert.equal((await p.getNetwork()).chainId,31337n);await p.send('evm_mine',[])
 const [beneficiary,nextOwner,caller]=await p.listAccounts()
 const token=new Contract(BASE_V2.token,arts.Souli.abi,p),holder=await token.pool()
 await p.send('hardhat_impersonateAccount',[holder]);await p.send('hardhat_setBalance',[holder,'0x56bc75e2d63100000'])
 const holderSigner=new JsonRpcSigner(p,holder),sent=async x=>{const r=await(await x).wait();assert.equal(r.status,1);return r}
 const router=new Contract(BASE_V2.router,['function factory() view returns(address)','function WETH() view returns(address)',
   'function addLiquidityETH(address,uint256,uint256,uint256,address,uint256) payable returns(uint256,uint256,uint256)',
   'function removeLiquidityETH(address,uint256,uint256,uint256,address,uint256) returns(uint256,uint256)'],holderSigner)
 const factory=new Contract(BASE_V2.factory,['function getPair(address,address) view returns(address)'],p)
 assert.equal((await router.factory()).toLowerCase(),BASE_V2.factory.toLowerCase());assert.equal(await router.WETH(),BASE_V2.weth)
 assert.equal(await factory.getPair(BASE_V2.token,BASE_V2.weth),ZeroAddress,'Existing pair requires a fresh reserve/price review')
 for(const [name,addr]of Object.entries(BASE_V2).filter(([k])=>k!=='chainId')){
   const code=await p.getCode(addr);assert.notEqual(code,'0x');report[name+'RuntimeHash']=keccak256(code)
 }
 const now=(await p.getBlock('latest')).timestamp,price=26666033792798n,units=1000n*10n**9n,eth=1000n*price
 await sent(token.connect(holderSigner).approve(BASE_V2.router,units))
 const mint=await sent(router.addLiquidityETH(BASE_V2.token,units,units,eth,beneficiary.address,now+3600,{value:eth}))
 const pairAddress=await factory.getPair(BASE_V2.token,BASE_V2.weth)
 const pair=new Contract(pairAddress,['function factory() view returns(address)','function token0() view returns(address)','function token1() view returns(address)',
   'function balanceOf(address) view returns(uint256)','function totalSupply() view returns(uint256)','function transfer(address,uint256) returns(bool)',
   'function approve(address,uint256) returns(bool)','function allowance(address,address) view returns(uint256)',
   'function getReserves() view returns(uint112,uint112,uint32)'],beneficiary)
 assert.equal((await pair.factory()).toLowerCase(),BASE_V2.factory.toLowerCase())
 assert.deepEqual([await pair.token0(),await pair.token1()].map(x=>x.toLowerCase()).sort(),[BASE_V2.token,BASE_V2.weth].map(x=>x.toLowerCase()).sort())
 assert.equal(await token.allowance(holder,BASE_V2.router),0n)
 const lp=await pair.balanceOf(beneficiary.address),unlock=(await p.getBlock(mint.blockNumber)).timestamp+YEAR_SECONDS+86400
 const lock=await new ContractFactory(arts.VestingWallet.abi,arts.VestingWallet.bytecode,beneficiary).deploy(beneficiary.address,unlock,0)
 await lock.waitForDeployment();const address=await lock.getAddress()
 const deposit=await sent(pair.transfer(address,lp)),depositTime=(await p.getBlock(deposit.blockNumber)).timestamp
 assert.ok(unlock-depositTime>=YEAR_SECONDS)
 assert.equal(await pair.balanceOf(address),lp);assert.equal(await pair.balanceOf(beneficiary.address),0n)
 assert.equal(await pair.totalSupply(),lp+1000n,'Uniswap minimum permanently locked liquidity is separate')
 assert.equal(await pair.allowance(address,BASE_V2.router),0n)
 await sent(lock.connect(caller)['release(address)'](pairAddress));assert.equal(await pair.balanceOf(address),lp)
 await sent(lock.transferOwnership(nextOwner.address));assert.equal(await lock.start(),BigInt(unlock))
 await p.send('evm_setNextBlockTimestamp',[unlock-1]);await p.send('evm_mine',[])
 assert.equal(await lock['releasable(address)'](pairAddress),0n)
 await p.send('evm_setNextBlockTimestamp',[unlock]);await sent(lock.connect(caller)['release(address)'](pairAddress))
 assert.equal(await pair.balanceOf(nextOwner.address),lp);assert.equal(await pair.balanceOf(caller.address),0n)
 const reserves=await pair.getReserves(),total=await pair.totalSupply()
 const tokenIs0=(await pair.token0()).toLowerCase()===BASE_V2.token.toLowerCase()
 const expectedTokens=lp*reserves[tokenIs0?0:1]/total,expectedEth=lp*reserves[tokenIs0?1:0]/total
 const tokensBefore=await token.balanceOf(nextOwner.address)
 await sent(pair.connect(nextOwner).approve(BASE_V2.router,lp))
 await sent(router.connect(nextOwner).removeLiquidityETH(BASE_V2.token,lp,expectedTokens,expectedEth,nextOwner.address,unlock+3600))
 assert.equal(await token.balanceOf(nextOwner.address),tokensBefore+expectedTokens)
 assert.equal(await pair.balanceOf(nextOwner.address),0n);assert.equal(await pair.allowance(nextOwner.address,BASE_V2.router),0n)
 report.checks=['official Base V2 factory/router/WETH and original SOULI runtime verified',
   'actual SOULI + ETH minted genuine V2 LP on local fork with finite approval',
   'all operator LP deposited; minimum 1000 LP units remain permanently locked by Uniswap',
   'funding receipt precedes expiry by at least 365 days',
   'no release before expiry, including after beneficiary transfer',
   'stranger-triggered release pays current owner at exact expiry',
   'released LP removes both underlying assets with finite approval and exact minimum outputs']
 Object.assign(report,{passed:true,localPair:pairAddress,localLock:address,lockedLpUnits:String(lp),unlockTimestamp:unlock,
   depositTimestamp:depositTime,remainingUniswapMinimumUnits:'1000',localMintHash:mint.hash,localDepositHash:deposit.hash,
   note:'LOCAL FORK ONLY. These addresses/receipts do not prove a public LP or public lock.'})
 console.log('PASS:',report.checks.join('\nPASS: '))
}catch(error){report.error=error.message;process.exitCode=1;console.error(error)}
finally{
 writeFileSync(new URL('../../logs/sale-checks/lp-timelock-base-fork.json',import.meta.url),JSON.stringify(report,null,2)+'\n')
 p?.destroy();await connection?.close();await proxy?.close();upstream.destroy()
}
