// Read-only renderer examples: the same seed at each level, different extras.
// These are illustrative inputs, never a preview of a future buyer's result.
import { readFileSync, writeFileSync } from 'node:fs'
import { Contract, JsonRpcProvider, FetchRequest, keccak256 } from 'ethers'
const previous = JSON.parse(readFileSync(new URL('../src/lighthouse/purchase-levels.json', import.meta.url)))
const rpc = new FetchRequest(process.env.BASE_READ_RPC || 'https://mainnet.base.org'); rpc.timeout = 20000
const provider = new JsonRpcProvider(rpc, 8453, { staticNetwork: true, cacheTimeout: -1, batchMaxCount: 1 })
try {
  const block = await provider.getBlockNumber(), options = { blockTag: block }
  const hash = keccak256(await provider.getCode(previous.contract, block))
  if (hash !== previous.tokenRuntimeCodeHash) throw Error('Original renderer code changed')
  const abi = JSON.parse(readFileSync(new URL('../src/assets/abis/token.json', import.meta.url)))
  const contract = new Contract(previous.contract, abi, provider), levels = []
  for (const level of previous.levels) {
    const examples = []
    for (const extra of ['0', '1', '2', '3']) {
      const seed = level.seed
      const soul = await contract.getSoul([seed, extra], options)
      if (Number(soul.lvl) !== level.contractLevel) throw Error('Example level mismatch')
      const svg = await contract.getSvg([seed, extra], options)
      if (!svg.startsWith('<svg') || /<(?:script|image|foreignObject)|\bon\w+=|(?:https?:)?\/\//i.test(svg.replace('http://www.w3.org/2000/svg', ''))) throw Error('Unexpected SVG content')
      examples.push({ seed, extra, svg })
    }
    if (new Set(examples.map(x => x.svg)).size !== 4) throw Error('Examples must visibly differ')
    levels.push({ displayLevel: level.displayLevel, contractLevel: level.contractLevel, examples })
    console.log(`Level ${level.displayLevel}: four verified examples`)
  }
  const snapshot = { chainId: 8453, contract: previous.contract, block, fetchedAt: new Date().toISOString(), tokenRuntimeCodeHash: hash,
    basis: 'Four illustrative renderer inputs per level. No probability, uniqueness or future outcome claim.', levels }
  writeFileSync(new URL('../src/lighthouse/inscription-examples.json', import.meta.url), JSON.stringify(snapshot, null, 2) + '\n')
} finally { provider.destroy() }
