// Original Base token, disposable local fork. Upstream is READ ONLY.
import { network } from 'hardhat'
import { JsonRpcProvider, JsonRpcSigner, BrowserProvider, Contract, keccak256 } from 'ethers'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { prepareControllerDeployment, preflightController, inspectControllerDeployment, controllerInventoryTransactions } from './three-wallet-release-tools.mjs'
import { BASE_SOULI, BASE_TOKEN_CODE_HASH } from './release-tools.mjs'
const url = process.env.BASE_READ_RPC || 'https://mainnet.base.org'
const artifacts = JSON.parse(readFileSync(new URL('../artifacts/contracts.json', import.meta.url))).contracts
const upstream = new JsonRpcProvider(url), UNIT = 1000000000n, PRICE = 1000000000000n, options = { allowTest: true }
let connection, p
try {
  assert.equal((await upstream.getNetwork()).chainId, 8453n)
  const head = await upstream.getBlockNumber(), blockNumber = process.env.BASE_FORK_BLOCK ? Number(process.env.BASE_FORK_BLOCK) : head - 20
  assert.ok(Number.isSafeInteger(blockNumber) && blockNumber > 0 && blockNumber <= head)
  const code = await upstream.getCode(BASE_SOULI, blockNumber)
  assert.equal(keccak256(code), BASE_TOKEN_CODE_HASH)
  console.log('Original SOULI read-only snapshot:', blockNumber)
  connection = await network.create({ network: 'default', override: { chainId: 31337, forking: { url, blockNumber } } })
  p = new BrowserProvider(connection.provider, undefined, { cacheTimeout: -1 })
  assert.equal((await p.getNetwork()).chainId, 31337n)
  // Execute calls on a local block, not a historical Base hardfork boundary.
  await p.send('evm_mine', [])
  const [a, b, c, buyer, finalBuyer] = await p.listAccounts(), token = new Contract(BASE_SOULI, artifacts.Souli.abi, p)
  const now = (await p.getBlock('latest')).timestamp, holder = await token.pool(), sent = async promise => (await promise).wait()
  // Impersonation and synthetic ETH apply ONLY to the local 31337 fork.
  await p.send('hardhat_impersonateAccount', [holder]); await p.send('hardhat_setBalance', [holder, '0x56bc75e2d63100000'])
  const localHolder = new JsonRpcSigner(p, holder)
  await sent(token.connect(localHolder).transfer(a.address, 1000n * UNIT))
  const input = { chainId: 31337, token: BASE_SOULI, deployer: a.address, nonce: String(await p.getTransactionCount(a.address)),
    operators: [a.address, b.address, c.address], unitPriceWei: String(PRICE), saleCap: '1000', walletCap: '1000', startsAt: String(now - 1), endsAt: String(now + 3600) }
  const review = await prepareControllerDeployment(input, artifacts, options)
  await preflightController(p, review, artifacts, options)
  const deployed = await sent(a.sendTransaction({ ...review.transaction, nonce: Number(review.input.nonce) }))
  assert.equal(deployed.contractAddress, review.controller)
  await inspectControllerDeployment(p, review, artifacts, options)
  for (const { purpose, ...tx } of controllerInventoryTransactions(review, a.address, '1000', artifacts)) await sent(a.sendTransaction(tx))
  const control = new Contract(review.controller, artifacts.SouliThreeWalletController.abi, a)
  const sale = new Contract(review.sale, artifacts.SouliEthSale.abi, p)
  await sent(sale.connect(buyer).buy(210, now + 600, { value: 210n * PRICE }))
  assert.equal(await token.balanceOf(buyer.address), 210n * UNIT)
  const first = await token.dynamicInscription(buyer.address)
  assert.equal(first.seed, 210n)
  const svg = await token.getSvg([first.seed, first.extra]); assert.match(svg, /<svg/)
  await sent(sale.connect(buyer).buy(10, now + 600, { value: 10n * PRICE }))
  assert.equal((await token.dynamicInscription(buyer.address)).seed, 220n)
  await assert.rejects(control.recoverInventory(1))
  await sent(control.connect(c).pauseSale()); await sent(control.connect(c).recoverInventory(780))
  assert.equal(await token.balanceOf(c.address), 780n * UNIT)
  assert.equal(await token.balanceOf(buyer.address), 220n * UNIT)
  await sent(token.connect(c).approve(review.controller, 780n * UNIT)); await sent(control.connect(c).depositStock(780)); await sent(control.connect(b).startSale())
  assert.equal(await token.allowance(c.address, review.controller), 0n)
  assert.equal(await token.allowance(review.controller, review.sale), 0n)
  const before = await p.getBalance(b.address), payout = await sent(control.connect(b).collectProceeds())
  assert.equal(await p.getBalance(b.address), before + 220n * PRICE - payout.gasUsed * payout.gasPrice)
  await sent(sale.connect(finalBuyer).buy(780, now + 600, { value: 780n * PRICE }))
  assert.equal(await token.balanceOf(finalBuyer.address), 780n * UNIT)
  assert.equal((await token.inscriptionOfOwnerByIndex(finalBuyer.address, 0)).seed, 780n)
  assert.equal(await sale.available(), 0n); assert.equal(await sale.sold(), 1000n)
  assert.equal(await sale.proceedsWei(), 1000n * PRICE)
  assert.equal(await p.getBalance(review.sale), 780n * PRICE)
  const report = { checkedAt: new Date().toISOString(), publicChainId: 8453, localChainId: 31337, blockNumber,
    token: BASE_SOULI, tokenRuntimeCodeHash: keccak256(code), controller: review.controller, sale: review.sale,
    checks: ['unsigned release address and runtime verification', 'original-token stock through controller', 'non-operator exact purchase', 'dynamic inscription 210 then 220 and on-chain SVG', 'C alone pause/recover/restock', 'B alone resume/collect', 'finite allowances consumed', 'last-stock stable inscription 780', 'buyer balances and revenue conserved'],
    svgBytes: Buffer.byteLength(svg), publicTransactionsSent: 0, independentAudit: false }
  const dir = new URL('../../logs/sale-checks/', import.meta.url); mkdirSync(dir, { recursive: true })
  writeFileSync(new URL('three-wallet-base-fork.json', dir), JSON.stringify(report, null, 2)); writeFileSync(new URL('three-wallet-base-fork.svg', dir), svg)
  console.log('PASS:', JSON.stringify(report))
} finally { upstream.destroy(); p?.destroy(); await connection?.close() }
