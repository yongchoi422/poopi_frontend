// Public read-only evidence. Wallet identity and investment terms are NOT inferred.
import { JsonRpcProvider, Contract, Interface, formatUnits, keccak256 } from 'ethers'
import { mkdirSync, writeFileSync } from 'node:fs'
const TOKEN = '0xb43eA104c7ec75038Ac8EcA57107Eefc8B039aFF'
const MULTICALL = '0xcA11bde05977b3631167028862bE2a173976CA11'
const provider = new JsonRpcProvider('https://mainnet.base.org', undefined, { batchMaxCount: 1 })
const abi = ['function holdersCount() view returns(uint256)', 'function getHoldersList(uint256,uint256) view returns(address[])',
  'function owner() view returns(address)', 'function pool() view returns(address)', 'function totalSupply() view returns(uint256)',
  'function balanceOf(address) view returns(uint256)', 'function decimals() view returns(uint8)']
const iface = new Interface(abi), token = new Contract(TOKEN, abi, provider)
try {
  if ((await provider.getNetwork()).chainId !== 8453n) throw Error('Wrong network')
  const block = await provider.getBlockNumber(), tag = { blockTag: block }
  const [count, owner, pool, supply, decimals] = await Promise.all([
    token.holdersCount(tag), token.owner(tag), token.pool(tag), token.totalSupply(tag), token.decimals(tag),
  ])
  if (count > 10000n) throw Error('Review snapshot size before proceeding')
  const addresses = []
  for (let start = 0; start < Number(count); start += 200) {
    addresses.push(...await token.getHoldersList(start, Math.min(200, Number(count) - start), tag))
  }
  const unique = [...new Set([...addresses, owner, pool, TOKEN].map(x => x.toLowerCase()))]
  if (await provider.getCode(MULTICALL, block) === '0x') throw Error('Missing Multicall3 code')
  const multicall = new Contract(MULTICALL, ['function aggregate3(tuple(address target,bool allowFailure,bytes callData)[] calls) payable returns(tuple(bool success,bytes returnData)[])'], provider)
  const rows = []
  for (let start = 0; start < unique.length; start += 150) {
    const chunk = unique.slice(start, start + 150)
    const result = await multicall.aggregate3.staticCall(chunk.map(address => [TOKEN, false, iface.encodeFunctionData('balanceOf', [address])]), tag)
    result.forEach((r, i) => { if (!r.success) throw Error('Partial balance read'); const units = iface.decodeFunctionResult('balanceOf', r.returnData)[0];
      rows.push({ address: chunk[i], balanceUnits: String(units), tokens: formatUnits(units, decimals), identity: 'unverified' }) })
  }
  rows.sort((a, b) => BigInt(a.balanceUnits) > BigInt(b.balanceUnits) ? -1 : BigInt(a.balanceUnits) < BigInt(b.balanceUnits) ? 1 : 0)
  const sum = rows.reduce((a, row) => a + BigInt(row.balanceUnits), 0n), unit = 10n ** decimals
  const matchingBalanceRange = rows.filter(r => BigInt(r.balanceUnits) >= 840000n * unit && BigInt(r.balanceUnits) <= 1050000n * unit)
  const report = { checkedAt: new Date().toISOString(), chainId: 8453, block, token: TOKEN, source: 'pinned public Base RPC',
    tokenRuntimeHash: keccak256(await provider.getCode(TOKEN, block)), holderRegistryCount: String(count), owner, pool,
    totalSupplyUnits: String(supply), enumeratedBalanceUnits: String(sum), unaccountedUnits: String(supply - sum),
    completeBalanceReconciliation: sum === supply,
    limitations: ['Registry may omit fractional-only wallets; compare the unaccounted balance',
      'Balances do not identify founder vs investor ownership or original sale prices', 'Holder registry is not a list of unique people'],
    userEstimate: { historicalFdvUsd: 10000000, investmentUsd: 70000, impliedTokens: 1470000, largestIndividualUsd: [40000, 50000], largestIndividualImpliedTokens: [840000, 1050000], status: 'unverified recollection, not chain-confirmed sale proceeds' },
    comparableCurrentBalanceRange: { minimumTokens: 840000, maximumTokens: 1050000, count: matchingBalanceRange.length,
      warning: 'Current balance is not original allocation and does not establish investor identity' }, rows }
  const dir = new URL('../logs/sale-checks/', import.meta.url); mkdirSync(dir, { recursive: true })
  writeFileSync(new URL('token-distribution.json', dir), JSON.stringify(report, null, 2))
  console.log(JSON.stringify({ ...report, rows: rows.slice(0, 20) }, null, 2))
} finally { provider.destroy() }
