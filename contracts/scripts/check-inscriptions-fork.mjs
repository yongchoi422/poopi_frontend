// The deployed Base SOULI on a disposable LOCAL fork. Never broadcasts upstream.
import { network } from 'hardhat'
import { JsonRpcProvider, JsonRpcSigner, BrowserProvider, Contract, keccak256, toUtf8Bytes, FetchRequest } from 'ethers'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { prepareControllerDeployment, preflightController, inspectControllerDeployment, controllerInventoryTransactions } from './three-wallet-release-tools.mjs'
import { BASE_SOULI, BASE_TOKEN_CODE_HASH } from './release-tools.mjs'
import { planLaunchPrice } from '../../src/lighthouse/launch-pricing.mjs'
import { createReadOnlyForkRpc } from './read-only-fork-rpc.mjs'
const artifacts = JSON.parse(readFileSync(new URL('../artifacts/contracts.json', import.meta.url))).contracts
const url = process.env.BASE_READ_RPC || 'https://mainnet.base.org', request = new FetchRequest(url)
request.timeout = 20000
const upstream = new JsonRpcProvider(request, undefined, {batchMaxCount:1})
const UNIT = 1000000000n, pricePlan = planLaunchPrice('2500'), PRICE = BigInt(pricePlan.unitPriceWei), options = { allowTest: true }
let connection, p, readProxy
try {
  assert.equal((await upstream.getNetwork()).chainId, 8453n)
  const blockNumber = Number(process.env.BASE_FORK_BLOCK || (await upstream.getBlockNumber()) - 20)
  assert.equal(keccak256(await upstream.getCode(BASE_SOULI, blockNumber)), BASE_TOKEN_CODE_HASH)
  console.log('Pinned original Base token:',blockNumber)
  readProxy = await createReadOnlyForkRpc(url)
  connection = await network.create({ network: 'default', override: { chainId: 31337, forking: { url: readProxy.url, blockNumber } } })
  console.log('Local fork created')
  p = new BrowserProvider(connection.provider, undefined, { cacheTimeout: -1 }); assert.equal((await p.getNetwork()).chainId, 31337n)
  await p.send('evm_mine', [])
  console.log('Local block mined')
  const [a,b,c,buyer,other,receiver] = await p.listAccounts(), sent = async tx => (await tx).wait()
  const token = new Contract(BASE_SOULI, artifacts.Souli.abi, p), holder = await token.pool()
  console.log('Original pool read')
  await p.send('hardhat_impersonateAccount', [holder]); await p.send('hardhat_setBalance', [holder, '0x56bc75e2d63100000'])
  const now = (await p.getBlock('latest')).timestamp
  await sent(token.connect(new JsonRpcSigner(p,holder)).transfer(a.address,700000n*UNIT))
  console.log('Local original-token inventory funded')
  const review = await prepareControllerDeployment({chainId:31337,token:BASE_SOULI,deployer:a.address,nonce:String(await p.getTransactionCount(a.address)),
    operators:[a.address,b.address,c.address],unitPriceWei:String(PRICE),saleCap:'700000',walletCap:'700000',startsAt:String(now-1),endsAt:String(now+3600)},artifacts,options)
  await preflightController(p,review,artifacts,options)
  await sent(a.sendTransaction({...review.transaction,nonce:Number(review.input.nonce)})); await inspectControllerDeployment(p,review,artifacts,options)
  for(const {purpose,...tx} of controllerInventoryTransactions(review,a.address,'700000',artifacts))await sent(a.sendTransaction(tx))
  console.log('Local sale deployed and funded; checking level4 growth and preservation')
  const sale = new Contract(review.sale,artifacts.SouliEthSale.abi,p)
  const control = new Contract(review.controller,artifacts.SouliThreeWalletController.abi,a)
  const buy = (who,quantity) => sent(sale.connect(who).buy(quantity,now+1800,{value:BigInt(quantity)*PRICE}))
  const art = async inscription => {const pair=[inscription.seed,inscription.extra];return {level:Number((await token.getSoul(pair)).lvl)+1,hash:keccak256(toUtf8Bytes(await token.getSvg(pair)))} }
  const initial = await p.send('evm_snapshot',[])
  await buy(buyer,500000); const first = await token.dynamicInscription(buyer.address), firstArt = await art(first)
  assert.equal(first.seed,500000n);assert.equal(firstArt.level,4)
  assert.deepEqual(await art(first),firstArt,'Same seed data must render deterministically')
  await buy(buyer,1);const grown=await token.dynamicInscription(buyer.address),grownArt=await art(grown)
  assert.equal(grown.seed,500001n);assert.notEqual(grown.extra,first.extra);assert.equal(grownArt.level,4);assert.notEqual(grownArt.hash,firstArt.hash)
  await sent(token.connect(buyer).transfer(other.address,UNIT));const shrunk=await token.dynamicInscription(buyer.address),shrunkArt=await art(shrunk)
  assert.equal(shrunk.seed,500000n);assert.notEqual(shrunk.extra,grown.extra);assert.equal(shrunkArt.level,4);assert.notEqual(shrunkArt.hash,grownArt.hash)
  await sent(token.connect(buyer).transfer(receiver.address,shrunk.seed*UNIT))
  const stable=await token.inscriptionOfOwnerByIndex(receiver.address,0)
  assert.equal(stable.seed,shrunk.seed);assert.equal(stable.extra,shrunk.extra);assert.deepEqual(await art(stable),shrunkArt)
  assert.equal((await token.dynamicInscription(receiver.address)).seed,0n)
  await buy(receiver,1)
  const kept=await token.inscriptionOfOwnerByIndex(receiver.address,0)
  assert.equal(kept.seed,stable.seed);assert.equal(kept.extra,stable.extra);assert.equal((await token.dynamicInscription(receiver.address)).seed,1n)
  assert.equal(await token.balanceOf(receiver.address),500001n*UNIT)
  await sent(control.pauseSale());await sent(control.recoverInventory(199998))
  const before=await p.getBalance(b.address),receipt=await sent(control.connect(b).collectProceeds())
  assert.equal(await p.getBalance(b.address),before+500002n*PRICE-receipt.gasUsed*receipt.gasPrice)
  assert.equal(await p.getBalance(review.sale),0n);assert.equal(await sale.proceedsWei(),500002n*PRICE)
  assert.equal(await p.send('evm_revert',[initial]),true)
  console.log('Growth, shrink, Stable and funds passed; checking second buyer and last stock')
  await buy(other,500000);const otherSeed=await token.dynamicInscription(other.address),otherArt=await art(otherSeed)
  assert.equal(otherArt.level,4);assert.notEqual(otherSeed.extra,first.extra);assert.notEqual(otherArt.hash,firstArt.hash)
  // A purchase matching the seller's exact remaining seed can transfer that
  // inscription intact. Do not advertise an unconditional fresh reroll per buy.
  const last = await token.dynamicInscription(review.sale)
  assert.equal(last.seed,200000n);await buy(receiver,200000)
  const lastStable = await token.inscriptionOfOwnerByIndex(receiver.address,0)
  assert.equal(lastStable.seed,last.seed);assert.equal(lastStable.extra,last.extra)
  assert.equal(await sale.available(),0n);assert.equal(await sale.proceedsWei(),700000n*PRICE)
  const report={checkedAt:new Date().toISOString(),publicChainId:8453,localChainId:31337,blockNumber,token:BASE_SOULI,publicTransactionsSent:0,independentAudit:false,
    pricing:{...pricePlan,note:'USD2500 is an illustrative rate, not a live or approved sale price. Wallet cap700000 is a test fixture, not approved terms.'},
    checks:['Actual deployed renderer at level4','Two fresh wallets, same amount, different appearances','Same seed+extra renders identically',
      'Adding1 changes Dynamic seed/appearance inside level4','Removing1 changes Dynamic seed/appearance inside level4',
      'Exact whole-seed transfer to empty non-pool wallet preserves Stable seed+extra+art',
      'Later purchase creates separate Dynamic without modifying existing Stable','Inventory recovery and proceeds at exact planned wei price',
      'Last-stock purchase can preserve seller Stable appearance, not a guaranteed reroll'],firstArt,grownArt,shrunkArt,otherArt}
  const dir=new URL('../../logs/sale-checks/',import.meta.url);mkdirSync(dir,{recursive:true})
  writeFileSync(new URL('inscriptions-base-fork.json',dir),JSON.stringify(report,null,2)+'\n')
  console.log('PASS:',JSON.stringify(report))
}finally{upstream.destroy();p?.destroy();await connection?.close();await readProxy?.close()}
