import Web3 from 'web3'
import abi from '../assets/abis/token.json'
import { TOKEN, artForStage } from './soul-art'
export { TOKEN, svgUrl, artForStage, publicSouls, sampleInfo } from './soul-art'
const RPC = 'https://base-rpc.publicnode.com'
export const shortAddress = address => `${address.slice(0, 6)}…${address.slice(-4)}`

export async function readAddress(address) {
  if (!Web3.utils.isAddress(address)) throw new Error('Enter a valid Base wallet address starting with 0x.')
  const web3 = new Web3(new Web3.providers.HttpProvider(RPC, { timeout: 12000 }))
  const contract = new web3.eth.Contract(abi, TOKEN)
  const block = await web3.eth.getBlockNumber()
  const call = (method, ...args) => contract.methods[method](...args).call({}, block)
  const dynamic = await call('dynamicInscription', address)
  const count = Number(await call('inscriptionCount', address))
  const seeds = []
  if (BigInt(dynamic.seed) !== 0n) seeds.push({ seed: dynamic.seed, extra: dynamic.extra, dynamic: true })
  const limit = 8 - seeds.length
  for (let i = 0; i < Math.min(limit, count); i++) {
    const seed = await call('inscriptionOfOwnerByIndex', address, i)
    seeds.push({ seed: seed.seed, extra: seed.extra, dynamic: false })
  }
  const souls = []
  for (const seed of seeds) {
    const svg = await call('getSvg', { seed: seed.seed, extra: seed.extra })
    souls.push({ ...seed, svg, ...artForStage(svg), owner: address, block, source: 'address', label: `${seed.dynamic ? 'Dynamic' : 'Stored'} soul ${souls.length + 1}` })
  }
  return { souls, block, total: count + (BigInt(dynamic.seed) !== 0n ? 1 : 0) }
}
