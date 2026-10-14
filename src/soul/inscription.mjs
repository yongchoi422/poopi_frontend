import { Interface, getAddress, keccak256 } from 'ethers'
import abi from '../assets/abis/token.json' with { type: 'json' }
import { BASE_TOKEN_HASH } from '../sale-admin/config.mjs'
export const SOULI_TOKEN = '0xb43eA104c7ec75038Ac8EcA57107Eefc8B039aFF'
const token = new Interface(abi), MAX = (1n << 256n) - 1n
export function seedPair(input) {
  for (const name of ['seed', 'extra']) if (!/^\d{1,78}$/.test(String(input?.[name])) || BigInt(input[name]) > MAX) throw Error('Invalid inscription link.')
  if (BigInt(input.seed) < 1n || BigInt(input.seed) > 210000000n) throw Error('Invalid inscription seed.')
  return { seed: BigInt(input.seed).toString(), extra: BigInt(input.extra).toString() }
}
export function parseSoulLink(hash) {
  if (!hash || hash === '#') return null
  if (hash.length > 220) throw Error('Invalid inscription link.')
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  if (params.get('v') !== '1' || [...params.keys()].some(k => !['v','seed','extra'].includes(k)) || ['v','seed','extra'].some(k => params.getAll(k).length !== 1)) throw Error('Invalid inscription link.')
  return seedPair(Object.fromEntries(params))
}
export function soulLink(soul, origin = 'https://souli.net') {
  const { seed, extra } = seedPair(soul)
  const url = new URL('/soul/', origin)
  url.hash = new URLSearchParams({ v: '1', seed, extra }).toString()
  return url.href
}
export function xShareLink(link) {
  const url = new URL('https://x.com/intent/tweet')
  url.searchParams.set('text', 'gm fren. Meet my little SOULI.\nAn ERC-20i inscription on Base. ✨')
  url.searchParams.set('url', link)
  return url.href
}

// The original renderer emits only one SVG root and solid pixel rectangles.
// Reject other markup instead of inserting untrusted on-chain HTML into the DOM.
export function assertPixelSvg(raw) {
  if (typeof raw !== 'string' || raw.length > 262144) throw Error('Artwork format unavailable.')
  const match = /^<svg\s+xmlns=['"]http:\/\/www\.w3\.org\/2000\/svg['"]\s+viewBox=['"]0 0 24 24['"]\s*>([\s\S]*)<\/svg>$/.exec(raw)
  if (!match) throw Error('Artwork format unavailable.')
  const rects = match[1].match(/<rect\s+[^<>]+\/>/g) || []
  if (!rects.length || rects.length > 4096 || match[1].replace(/<rect\s+[^<>]+\/>/g, '').trim()) throw Error('Artwork format unavailable.')
  for (const rect of rects) {
    const attrs = [...rect.matchAll(/\s+([a-zA-Z]+)=['"]([^'"]*)['"]/g)]
    if (attrs.length !== 5 || new Set(attrs.map(x => x[1])).size !== 5 || rect.replace(/\s+([a-zA-Z]+)=['"]([^'"]*)['"]/g, '') !== '<rect/>') throw Error('Artwork format unavailable.')
    for (const [, key, value] of attrs) {
      if (key === 'fill') { if (!/^#[\da-f]{6}$/i.test(value)) throw Error('Artwork format unavailable.') }
      else if (!['x','y','width','height'].includes(key) || !/^\d{1,2}$/.test(value) || Number(value) > 48 || (['width','height'].includes(key) && Number(value) === 0)) throw Error('Artwork format unavailable.')
    }
  }
  return raw
}
const rpc = (reader, method, params = []) => reader.request({ method, params })
const call = async (reader, block, name, args = []) => token.decodeFunctionResult(name, await rpc(reader, 'eth_call', [{ to: SOULI_TOKEN, data: token.encodeFunctionData(name, args) }, block]))[0]
async function pinned(reader) {
  if (BigInt(await rpc(reader, 'eth_chainId')) !== 8453n) throw Error('Select Base for your SOULI.')
  const block = await rpc(reader, 'eth_blockNumber')
  const [code, header] = await Promise.all([rpc(reader, 'eth_getCode', [SOULI_TOKEN, block]), rpc(reader, 'eth_getBlockByNumber', [block, false])])
  if (keccak256(code) !== BASE_TOKEN_HASH) throw Error('Original SOULI code could not be verified.')
  if (!header?.hash || Math.abs(Date.now() / 1000 - Number(BigInt(header.timestamp))) > 120) throw Error('Base data is stale. Try again in a moment.')
  return { block, hash: header.hash }
}
async function canonical(reader, pinned) {
  if ((await rpc(reader, 'eth_getBlockByNumber', [pinned.block, false]))?.hash !== pinned.hash) throw Error('Base changed during this read. Please refresh.')
}
async function render(reader, block, pair) {
  const data = seedPair(pair), args = [[data.seed, data.extra]]
  const [svg, meta] = await Promise.all([call(reader, block, 'getSvg', args), call(reader, block, 'getSoul', args)])
  const level = Number(meta.lvl)
  if (!Number.isInteger(level) || level < 0 || level > 4) throw Error('Unknown inscription level.')
  return { ...data, svg: assertPixelSvg(svg), level, block: Number(BigInt(block)) }
}
export async function readSharedSoul(reader, pair) {
  const input = seedPair(pair), point = await pinned(reader)
  const soul = await render(reader, point.block, input)
  await canonical(reader, point)
  return { ...soul, source: 'shared' }
}
export async function readOwnedSouls(reader, address, { offset = 0, limit = 6 } = {}) {
  let owner
  try { owner = getAddress(address) } catch { throw Error('Connect a valid Base wallet to see its SOULI.') }
  if (!Number.isSafeInteger(offset) || offset < 0 || !Number.isInteger(limit) || limit < 1 || limit > 8) throw Error('Invalid collection page.')
  const point = await pinned(reader)
  const [dynamic, countValue] = await Promise.all([call(reader, point.block, 'dynamicInscription', [owner]), call(reader, point.block, 'inscriptionCount', [owner])])
  if (countValue > 210000000n) throw Error('Unexpected collection size.')
  const hasDynamic = dynamic.seed > 0n, total = Number(countValue) + Number(hasDynamic), souls = []
  // A transfer can shrink the collection between pagination clicks.
  const start = offset >= total ? 0 : offset
  for (let position = start; position < Math.min(total, start + limit); position++) {
    const isDynamic = hasDynamic && position === 0
    const pair = isDynamic ? dynamic : await call(reader, point.block, 'inscriptionOfOwnerByIndex', [owner, position - Number(hasDynamic)])
    souls.push({ ...await render(reader, point.block, pair), dynamic: isDynamic, owner, source: 'wallet' })
  }
  await canonical(reader, point)
  return { souls, owner, total, offset: start, block: Number(BigInt(point.block)) }
}
