// Public, read-only Base Sepolia evidence. Never requests an account or signs.
import assert from 'node:assert/strict'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { JsonRpcProvider, Interface, getAddress, toQuantity } from 'ethers'
import { readTestShop, NETWORK, UNIT } from '../src/testnet/lab.mjs'

const address = getAddress(process.argv[2] || '')
const first = Number(process.argv[3])
assert.ok(Number.isSafeInteger(first) && first > 0, 'Supply the verified deployment block.')
const bundle = JSON.parse(await readFile(new URL('../src/testnet/contracts.generated.json', import.meta.url), 'utf8'))
const rpc = new JsonRpcProvider(NETWORK.rpcUrls[0], undefined, { batchMaxCount: 1, cacheTimeout: -1 })
try {
  const shop = await readTestShop({ request: ({ method, params = [] }) => rpc.send(method, params) }, bundle.contracts, address)
  assert.ok(first <= shop.block && shop.block - first <= 20000, 'Use a deployment within the 20,000-block evidence window.')
  assert.equal(shop.proceedsWei, shop.sold * shop.unitPriceWei, 'Cumulative revenue must match delivered purchases.')
  const inventoryWhole = shop.inventory / UNIT
  const left = shop.saleCap - shop.sold
  assert.equal(shop.available, inventoryWhole < left ? inventoryWhole : left)
  const iface = new Interface(bundle.contracts.SepoliaTestSale.abi)
  const events = []
  for (let from = first; from <= shop.block; from += 500) {
    const logs = await rpc.send('eth_getLogs', [{ address, fromBlock: toQuantity(from), toBlock: toQuantity(Math.min(from + 499, shop.block)) }])
    for (const log of logs) {
      const decoded = iface.parseLog(log)
      if (!decoded) continue
      events.push({ name: decoded.name, args: Array.from(decoded.args, String), transactionHash: log.transactionHash, block: Number(BigInt(log.blockNumber)) })
    }
  }
  const purchases = events.filter(e => e.name === 'Purchased')
  assert.equal(purchases.reduce((n,e)=>n+BigInt(e.args[1]),0n),shop.sold,'Full purchase history must match sold counter.')
  const evidence = { checkedAt: new Date().toISOString(), chainId: 84532, address, deployedAtBlock: first, snapshot: shop, events }
  await mkdir('logs/sale-checks', { recursive: true })
  const path = `logs/sale-checks/sepolia-sale-${address.toLowerCase()}.json`
  await writeFile(path, JSON.stringify(evidence, (_key,value)=>typeof value === 'bigint' ? String(value) : value, 2) + '\n')
  console.log(JSON.stringify({ address, block: shop.block, inventory: String(shop.inventory / UNIT), available: String(shop.available), sold: String(shop.sold), proceedsWei: String(shop.proceedsWei), ethBalanceWei: String(shop.saleEth), paused: shop.paused, confirmedEvents: events.map(e=>e.name), evidence: path }))
} finally { rpc.destroy() }
