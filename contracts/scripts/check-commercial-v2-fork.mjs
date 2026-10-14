// Upstream Base is read-only; all transactions and funded balances are LOCAL 31337.
import {network} from 'hardhat'
import {JsonRpcProvider,JsonRpcSigner,BrowserProvider,Contract,FetchRequest,keccak256,toUtf8Bytes} from 'ethers'
import {readFileSync,writeFileSync} from 'node:fs'
import assert from 'node:assert/strict'
import {createReadOnlyForkRpc} from './read-only-fork-rpc.mjs'
import {prepareControllerDeployment,preflightController,inspectControllerDeployment} from './three-wallet-release-tools.mjs'
import {METAMASK_DELEGATE,BASE_METAMASK_DELEGATE_HASH} from './deployer-account.mjs'
import {BASE_SOULI,BASE_TOKEN_CODE_HASH} from './release-tools.mjs'
import {createDeploymentClient} from '../../src/sale-admin/deploy-client.mjs'
const root=new URL('../../',import.meta.url),draft=JSON.parse(readFileSync(new URL('contracts/release/base-sale.draft.json',root)))
const arts=JSON.parse(readFileSync(new URL('contracts/artifacts/contracts.json',root))).contracts
const url='https://mainnet.base.org',request=new FetchRequest(url);request.timeout=20000
const upstream=new JsonRpcProvider(request,undefined,{batchMaxCount:1,cacheTimeout:-1})
const UNIT=1000000000n,PRICE=26657574656538n,options={allowTest:true}
let conn,p,proxy
try{
 assert.equal((await upstream.getNetwork()).chainId,8453n)
 const blockNumber=(await upstream.getBlockNumber())-20
 assert.equal(keccak256(await upstream.getCode(BASE_SOULI,blockNumber)),BASE_TOKEN_CODE_HASH)
 console.log('Pinned Base source, LOCAL writes only:',blockNumber)
 proxy=await createReadOnlyForkRpc(url)
 conn=await network.create({network:'default',override:{chainId:31337,forking:{url:proxy.url,blockNumber}}})
 p=new BrowserProvider(conn.provider,undefined,{cacheTimeout:-1});assert.equal((await p.getNetwork()).chainId,31337n)
 await p.send('evm_mine',[])
 const [buyer]=await p.listAccounts(),[A,B,C]=draft.operators
 const token=new Contract(BASE_SOULI,arts.Souli.abi,p),holder=await token.pool()
 for(const who of [A,B,C,holder]){await p.send('hardhat_impersonateAccount',[who]);await p.send('hardhat_setBalance',[who,'0x56bc75e2d63100000'])}
 const signer=new JsonRpcSigner(p,A),b=new JsonRpcSigner(p,B),c=new JsonRpcSigner(p,C),sent=async x=>(await x).wait()
 const codeBefore=await p.getCode(A)
 assert.equal(codeBefore.toLowerCase(),'0xef0100'+METAMASK_DELEGATE.slice(2).toLowerCase())
 assert.equal(keccak256(await p.getCode(METAMASK_DELEGATE)),BASE_METAMASK_DELEGATE_HASH)
 const now=(await p.getBlock('latest')).timestamp
 const review=await prepareControllerDeployment({...draft,chainId:31337,nonce:String(await p.getTransactionCount(A)),unitPriceWei:String(PRICE),startsAt:String(now-1),deployerAccount:{kind:'existing-metamask-7702-direct',implementation:METAMASK_DELEGATE,implementationCodeHash:BASE_METAMASK_DELEGATE_HASH}},arts,options)
 assert.equal(review.terms.walletCap,'4200000')
 await preflightController(p,review,arts,options)
 const cache=new Map(),wallet={request:async({method,params})=>method==='eth_accounts'?[A]:method==='eth_chainId'?'0x7a69':method==='eth_sendTransaction'?(await signer.sendTransaction({...params[0],nonce:Number(BigInt(params[0].nonce))})).hash:Promise.reject(Error('Unexpected request'))}
 const client=createDeploymentClient(review,arts,()=>wallet,p,{getItem:k=>cache.get(k)||null,setItem:(k,v)=>cache.set(k,v)},options)
 const deployment=await client.send(await client.prepare());await p.send('evm_mine',[])
 assert.equal((await client.recover(deployment)).status,'verified')
 const verified=await inspectControllerDeployment(p,review,arts,options),ctl=new Contract(review.controller,arts.SouliThreeWalletControllerV2.abi,signer),sale=new Contract(review.sale,arts.SouliEthSaleV2.abi,p)
 assert.equal(verified.paused,true);assert.equal((await p.getTransaction(deployment)).type,2)
 assert.equal(await p.getCode(A),codeBefore)
 const before=await token.balanceOf(A)
 await sent(token.connect(new JsonRpcSigner(p,holder)).transfer(A,6300000n*UNIT))
 await sent(token.connect(signer).approve(review.controller,4200000n*UNIT));await sent(ctl.depositStock(4200000))
 assert.equal(await token.balanceOf(A),before+2100000n*UNIT);assert.equal(await token.allowance(A,review.controller),0n)
 await sent(ctl.startSale())
 const buy=async(q)=>sent(sale.connect(buyer).buy(q,(await p.getBlock('latest')).timestamp+300,{value:BigInt(q)*PRICE}))
 await buy(1);const dot=await token.dynamicInscription(buyer.address);assert.equal(dot.seed,1n)
 const svg=await token.getSvg([dot.seed,dot.extra]);assert.match(svg,/<svg/)
 await buy(499999);const grown=await token.dynamicInscription(buyer.address);assert.equal(grown.seed,500000n)
 assert.equal(Number((await token.getSoul([grown.seed,grown.extra])).lvl),3)
 await buy(1);assert.equal((await token.dynamicInscription(buyer.address)).seed,500001n)
 await buy(1999999);const level5=await token.dynamicInscription(buyer.address);assert.equal(level5.seed,2500000n)
 assert.equal(Number((await token.getSoul([level5.seed,level5.extra])).lvl),4)
 await sent(ctl.connect(b).pauseSale());const stock=await sale.available();assert.equal(stock,1700000n)
 const bBefore=await token.balanceOf(B);await sent(ctl.connect(b).recoverInventory(stock));assert.equal(await token.balanceOf(B),bBefore+stock*UNIT)
 await sent(token.connect(b).approve(review.controller,stock*UNIT));await sent(ctl.connect(b).depositStock(stock));await sent(ctl.connect(c).startSale())
 assert.equal(await token.allowance(B,review.controller),0n)
 await sent(ctl.connect(c).collectProceeds());assert.equal(await p.getBalance(review.sale),0n);assert.equal(await p.getBalance(review.controller),0n)
 assert.equal(await sale.proceedsWei(),2500000n*PRICE)
 // Simulate no-end behavior with the real original token and exact wallet code.
 await p.send('evm_increaseTime',[365*86400]);await p.send('evm_mine',[]);await buy(1)
 await buy(1699999);await assert.rejects(buy(1),/revert/)
 await sent(ctl.pauseSale());await sent(ctl.collectProceeds());await assert.rejects(ctl.startSale(),/revert/)
 assert.equal(await token.balanceOf(buyer.address),4200000n*UNIT);assert.equal(await sale.available(),0n)
 const report={checkedAt:new Date().toISOString(),localChainId:31337,publicChainId:8453,blockNumber,originalToken:BASE_SOULI,originalTokenCodeHash:BASE_TOKEN_CODE_HASH,delegationCode:codeBefore,delegateCodeHash:BASE_METAMASK_DELEGATE_HASH,checks:['exact original Base token and current A delegation','direct type-2 CREATE through production deployment client','controller and child code/terms/operators verification','4.2M buyer stock and separate 2.1M LP stock','dot, level4 and level5 original renderer','one wallet buys full 4.2M; extra purchase and restart blocked','B pause/recover/restock, C reopen/collect independently','finite stock approvals consumed','one-year-later purchase and final sellout'],localSold:String(await sale.sold()),localProceedsWei:String(await sale.proceedsWei()),svgHash:keccak256(toUtf8Bytes(svg)),publicTransactionsSent:0,independentAudit:false}
 writeFileSync(new URL('logs/sale-checks/commercial-v2-base-fork.json',root),JSON.stringify(report,null,2)+'\n')
 console.log('PASS:',JSON.stringify(report))
}finally{p?.destroy();await conn?.close();await proxy?.close();upstream.destroy()}
