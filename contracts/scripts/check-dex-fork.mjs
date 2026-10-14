// READ-ONLY public Base access. All writes run on disposable chain 31337.
import { network } from 'hardhat'
import { BrowserProvider, JsonRpcProvider, JsonRpcSigner, Contract, keccak256, parseEther, ZeroAddress } from 'ethers'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const url = process.env.BASE_READ_RPC || 'https://base-rpc.publicnode.com'
const TOKEN = '0xb43eA104c7ec75038Ac8EcA57107Eefc8B039aFF'
// Official v2 Base deployments; verify identity on the pinned fork as well.
const FACTORY = '0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6'
const ROUTER = '0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24'
const WETH = '0x4200000000000000000000000000000000000006'
const routerAbi = [
  'function factory() view returns(address)', 'function WETH() view returns(address)',
  'function addLiquidityETH(address,uint256,uint256,uint256,address,uint256) payable returns(uint256,uint256,uint256)',
  'function getAmountsOut(uint256,address[]) view returns(uint256[])',
  'function swapExactETHForTokens(uint256,address[],address,uint256) payable returns(uint256[])',
  'function swapExactTokensForETH(uint256,uint256,address[],address,uint256) returns(uint256[])',
  'function removeLiquidityETH(address,uint256,uint256,uint256,address,uint256) returns(uint256,uint256)',
]
const pairAbi = ['function token0() view returns(address)', 'function token1() view returns(address)',
  'function getReserves() view returns(uint112,uint112,uint32)', 'function totalSupply() view returns(uint256)',
  'function balanceOf(address) view returns(uint256)', 'function approve(address,uint256) returns(bool)']
const artifacts = JSON.parse(readFileSync(new URL('../artifacts/contracts.json', import.meta.url))).contracts
const upstream = new JsonRpcProvider(url)
const dir = new URL('../../logs/sale-checks/', import.meta.url)
const report = { checkedAt: new Date().toISOString(), publicChainId: 8453, localChainId: 31337,
  token: TOKEN, router: ROUTER, factory: FACTORY, weth: WETH, publicTransactionsSent: 0, independentAudit: false,
  source: 'https://developers.uniswap.org/docs/protocols/v2/deployments', checks: [], gas: {} }
let connection, provider
const sent = async (name, promise) => {
  const receipt = await (await promise).wait()
  assert.equal(receipt.status, 1); report.gas[name] = String(receipt.gasUsed)
  return receipt
}
try {
  assert.equal((await upstream.getNetwork()).chainId, 8453n)
  const head = await upstream.getBlockNumber()
  report.blockNumber = process.env.BASE_FORK_BLOCK ? Number(process.env.BASE_FORK_BLOCK) : head - 20
  assert.ok(Number.isSafeInteger(report.blockNumber) && report.blockNumber > 0 && report.blockNumber <= head)
  console.log('Read-only Base DEX snapshot:', report.blockNumber)
  connection = await network.create({ network: 'default', override: { chainId: 31337, forking: { url, blockNumber: report.blockNumber } } })
  provider = new BrowserProvider(connection.provider, undefined, { cacheTimeout: -1 })
  assert.equal((await provider.getNetwork()).chainId, 31337n)
  // Execute eth_call on a local block under the configured local hardfork.
  // EDR does not contain Base's historical hardfork activation schedule.
  await provider.send('evm_mine', [])
  const [buyer] = await provider.listAccounts(), buyerAddress = await buyer.getAddress()
  const token = new Contract(TOKEN, artifacts.Souli.abi, provider)
  const holder = await token.pool()
  report.configuredTokenPool = holder
  await provider.send('hardhat_impersonateAccount', [holder])
  await provider.send('hardhat_setBalance', [holder, '0x56bc75e2d63100000'])
  const owner = new JsonRpcSigner(provider, holder)
  const router = new Contract(ROUTER, routerAbi, owner)
  const factory = new Contract(FACTORY, ['function getPair(address,address) view returns(address)'], provider)
  assert.equal((await router.factory()).toLowerCase(), FACTORY.toLowerCase())
  assert.equal((await router.WETH()).toLowerCase(), WETH.toLowerCase())
  for (const [name, address] of [['token', TOKEN], ['router', ROUTER], ['factory', FACTORY]]) {
    const code = await provider.getCode(address); assert.notEqual(code, '0x')
    report[name + 'RuntimeHash'] = keccak256(code)
  }
  const originalPair = await factory.getPair(TOKEN, WETH)
  report.existingPair = originalPair
  // A pre-existing pool needs a separate price/launch review; never overwrite it.
  assert.equal(originalPair, ZeroAddress, 'Existing pair: review reserves before choosing initial price')
  const tokenUnits = 100_000n * 1_000_000_000n, eth = parseEther('0.01')
  const deadline = (await provider.getBlock('latest')).timestamp + 3600
  await sent('approve', token.connect(owner).approve(ROUTER, tokenUnits))
  await sent('add', router.addLiquidityETH(TOKEN, tokenUnits, tokenUnits, eth, holder, deadline, { value: eth }))
  const pairAddress = await factory.getPair(TOKEN, WETH), pair = new Contract(pairAddress, pairAbi, owner)
  report.localPair = pairAddress
  assert.notEqual(pairAddress, ZeroAddress)
  assert.equal(await token.balanceOf(pairAddress), tokenUnits)
  assert.equal(await token.allowance(holder, ROUTER), 0n)
  report.checks.push('official Base v2 router/factory/WETH verified', 'original SOULI added with exact token/ETH amounts')
  const input = parseEther('0.001')
  const quote = await router.getAmountsOut(input, [WETH, TOKEN])
  await sent('buy', router.connect(buyer).swapExactETHForTokens(quote[1] * 99n / 100n, [WETH, TOKEN], buyerAddress, deadline, { value: input }))
  assert.equal(await token.balanceOf(buyerAddress), quote[1])
  const soul = await token.dynamicInscription(buyerAddress)
  const svg = await token.getSvg([soul.seed, soul.extra]); assert.match(svg, /<svg/)
  report.buyerSeed = String(soul.seed); report.svgBytes = Buffer.byteLength(svg)
  const sellUnits = (await token.balanceOf(buyerAddress)) / 2n
  const sellQuote = await router.getAmountsOut(sellUnits, [TOKEN, WETH])
  await sent('sellApprove', token.connect(buyer).approve(ROUTER, sellUnits))
  await sent('sell', router.connect(buyer).swapExactTokensForETH(sellUnits, sellQuote[1] * 99n / 100n, [TOKEN, WETH], buyerAddress, deadline))
  assert.equal(await token.balanceOf(buyerAddress), quote[1] - sellUnits)
  assert.equal(await token.allowance(buyerAddress, ROUTER), 0n)
  report.checks.push('ETH to SOULI swap and original inscription SVG', 'SOULI to ETH swap with fractional token units')
  const liquidity = await pair.balanceOf(holder)
  await sent('removeApprove', pair.approve(ROUTER, liquidity))
  await sent('remove', router.removeLiquidityETH(TOKEN, liquidity, 0, 0, holder, deadline))
  assert.equal(await pair.balanceOf(holder), 0n)
  assert.equal(await token.pool(), holder)
  report.checks.push('liquidity removal on disposable fork only', 'original configured pool unchanged')
  report.passed = true
  console.log('PASS:', JSON.stringify(report))
} catch (error) {
  report.passed = false; report.error = error.shortMessage || error.message
  report.rpcError = error.info?.error?.message || null
  console.error('FAIL:', report.error); process.exitCode = 1
} finally {
  mkdirSync(dir, { recursive: true }); writeFileSync(new URL('base-dex-fork.json', dir), JSON.stringify(report, null, 2))
  upstream.destroy(); provider?.destroy(); await connection?.close()
}
