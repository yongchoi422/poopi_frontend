// Reads the existing published test contracts. Never deploys, signs or broadcasts.
import { readFileSync, writeFileSync } from 'node:fs'
import { JsonRpcProvider, FetchRequest, keccak256 } from 'ethers'
import { readController, OPERATORS, TEST_TOKEN } from '../src/testnet/three-wallet.mjs'
import { readAdminState } from '../src/sale-admin/client.mjs'
const published = JSON.parse(readFileSync('src/testnet/public-controller.json', 'utf8'))
const artifacts = JSON.parse(readFileSync('src/testnet/contracts.generated.json', 'utf8')).contracts
const transport = new FetchRequest('https://sepolia.base.org'); transport.timeout = 15000
const provider = new JsonRpcProvider(transport, undefined, { batchMaxCount: 1, cacheTimeout: -1 })
const reader = { request: ({ method, params = [] }) => provider.send(method, params) }
try {
  const checked = await readController(reader, artifacts, published.address)
  const c = { enabled: true, chainId: 84532, controller: checked.address, operators: OPERATORS,
    controllerRuntimeCodeHash: keccak256(await provider.getCode(checked.address, checked.block)),
    tokenRuntimeCodeHash: keccak256(await provider.getCode(TEST_TOKEN, checked.block)), sale: checked.sale.manifest }
  const s = await readAdminState(reader, c, { allowTest: true })
  writeFileSync('src/sale-admin/testnet.json', JSON.stringify(c, null, 2) + '\n')
  console.log(JSON.stringify({ network: 'Base Sepolia', controller: c.controller, sale: c.sale.address, block: s.block, sold: String(s.sold), sent: 0 }))
} finally { provider.destroy() }
