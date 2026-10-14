import abi from '../assets/abis/token.json' with { type: 'json' }
import { TOKEN, artForStage } from './soul-art'
export { TOKEN, svgUrl, artForStage, publicSouls, sampleInfo } from './soul-art'
const RPC = 'https://base-rpc.publicnode.com'
export const shortAddress = address => `${address.slice(0, 6)}…${address.slice(-4)}`

export async function readAddress(address) {
  // Loading the public world needs no RPC client. Load it only for a lookup.
  const { JsonRpcProvider, FetchRequest, Contract, isAddress } = await import('ethers')
  if (!isAddress(address)) throw new Error('Enter a valid Base wallet address starting with 0x.')
  const request = new FetchRequest(RPC); request.timeout = 12000
  const provider = new JsonRpcProvider(request, 8453, { staticNetwork: true })
  try {
  const contract = new Contract(TOKEN, abi, provider)
  const block = await provider.getBlockNumber()
  const call = (method, ...args) => contract[method](...args, { blockTag: block })
  const dynamic = await call('dynamicInscription', address)
  const count = Number(await call('inscriptionCount', address))
  const seeds = []
  if (dynamic.seed !== 0n) seeds.push({ seed: dynamic.seed.toString(), extra: dynamic.extra.toString(), dynamic: true })
  const limit = 8 - seeds.length
  for (let i = 0; i < Math.min(limit, count); i++) {
    const seed = await call('inscriptionOfOwnerByIndex', address, i)
    seeds.push({ seed: seed.seed.toString(), extra: seed.extra.toString(), dynamic: false })
  }
  const souls = []
  for (const seed of seeds) {
    const svg = await call('getSvg', { seed: seed.seed, extra: seed.extra })
    // Read the deployed renderer; do not infer its levels from source thresholds.
    let level = null
    try {
      const metadata = await call('getSoul', { seed: seed.seed, extra: seed.extra })
      const value = Number(metadata.lvl)
      if (Number.isSafeInteger(value) && value >= 0) level = value
    } catch { /* Artwork can still be shown when optional metadata is unavailable. */ }
    souls.push({ ...seed, level, svg, ...artForStage(svg), owner: address, block, source: 'address', label: `${seed.dynamic ? 'Dynamic' : 'Stable'} soul ${souls.length + 1}` })
  }
  return { souls, block, total: count + (BigInt(dynamic.seed) !== 0n ? 1 : 0) }
  } finally { provider.destroy() }
}
