// All commands are unsigned or read-only. No signing keys or broadcast methods.
import { readFileSync, writeFileSync } from 'node:fs'
import { JsonRpcProvider, FetchRequest } from 'ethers'
import { prepareControllerDeployment, preflightController, inspectControllerDeployment, controllerInventoryTransactions } from './three-wallet-release-tools.mjs'
const [mode, input, output, operator, stock] = process.argv.slice(2)
if (!['prepare', 'preflight', 'verify'].includes(mode) || !input || !output) throw Error('Usage: node scripts/three-wallet-release.mjs prepare|preflight|verify INPUT.json OUTPUT.json [STOCK_OPERATOR WHOLE_STOCK]')
const artifacts = JSON.parse(readFileSync(new URL('../artifacts/contracts.json', import.meta.url))).contracts
const data = JSON.parse(readFileSync(input, 'utf8'))
let result, provider
try {
  if (mode === 'prepare') result = await prepareControllerDeployment(data, artifacts)
  else {
    const transport = new FetchRequest(process.env.BASE_READ_RPC || 'https://base-rpc.publicnode.com'); transport.timeout = 15000
    provider = new JsonRpcProvider(transport, undefined, { batchMaxCount: 1, cacheTimeout: -1 })
    result = mode === 'preflight' ? await preflightController(provider, data, artifacts) : await inspectControllerDeployment(provider, data, artifacts)
    if (mode === 'verify' && (operator || stock)) result.unsignedInventoryPlan = controllerInventoryTransactions(data, operator, stock, artifacts)
  }
  writeFileSync(output, JSON.stringify(result, null, 2) + '\n')
  console.log('Saved unsigned/read-only release review:', output)
} finally { provider?.destroy() }
