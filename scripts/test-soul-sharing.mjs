import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { Interface, keccak256 } from 'ethers'
import abi from '../src/assets/abis/token.json' with { type: 'json' }
import examples from '../src/lighthouse/inscription-examples.json' with { type: 'json' }
import { assertPixelSvg, parseSoulLink, readOwnedSouls, readSharedSoul, soulLink, xShareLink } from '../src/soul/inscription.mjs'
import { BASE_TOKEN_HASH } from '../src/sale-admin/config.mjs'
const iface = new Interface(abi), code = readFileSync(new URL('./fixtures/souli-runtime.hex', import.meta.url), 'utf8').trim()
assert.equal(keccak256(code), BASE_TOKEN_HASH, 'Fixture is the verified original token runtime, not alternate code.')
const raw = examples.levels[0].examples[0].svg
for (const level of examples.levels) for (const soul of level.examples) assert.equal(assertPixelSvg(soul.svg), soul.svg)
for (const bad of [raw.replace('<rect ', '<rect onload="alert(1)" '), raw.replace('</svg>', '<script>alert(1)</script></svg>'), raw.replace('</svg>', '<image href="https://evil.invalid/a"/></svg>'), raw.replace("fill='", "style='"), '<svg/>', 'a'.repeat(262145)]) assert.throws(() => assertPixelSvg(bad))
const pair = { seed: '1', extra: '123456789012345678901234567890123456789' }
assert.deepEqual(parseSoulLink(new URL(soulLink(pair)).hash), pair)
assert.equal(parseSoulLink(''), null)
const link = soulLink({ ...pair, owner: 'PRIVATE-ADDRESS', balance: '1234' })
assert.ok(!link.includes('PRIVATE') && !link.includes('balance'))
assert.equal(new URL(xShareLink(link)).searchParams.get('url'), link)
for (const hash of ['#v=2&seed=1&extra=0', '#v=1&seed=1&seed=2&extra=0', '#v=1&seed=1&extra=0&owner=0x1', '#v=1&seed=0&extra=0', '#v=1&seed=210000001&extra=0', '#v=1&seed=1&extra=-1', '#v=1&seed=1&extra=' + (1n << 256n), '#v=1&seed=1e3&extra=0']) assert.throws(() => parseSoulLink(hash))
const owner = '0x1375b43B72676067079fb66969cb85F33EC1768B', block = '0x31b24f0'
function fixture({ dynamic = [1n, 7n], count = 2n, chain = '0x2105', runtime = code, stale = false, reorg = false } = {}) {
  const requests = []; let headers = 0
  return { requests, async request({ method, params = [] }) {
    requests.push({ method, params })
    if (method === 'eth_chainId') return chain
    if (method === 'eth_blockNumber') return block
    if (method === 'eth_getCode') return runtime
    if (method === 'eth_getBlockByNumber') return { hash: reorg && headers++ > 0 ? '0xother' : '0xcanonical', timestamp: '0x' + Math.floor(Date.now() / 1000 - (stale ? 300 : 0)).toString(16) }
    if (method !== 'eth_call') throw Error('Unexpected write or wallet request: ' + method)
    assert.equal(params[1], block, 'Every read uses the same pinned block.')
    const call = iface.parseTransaction({ data: params[0].data }); let value
    if (call.name === 'dynamicInscription') value = dynamic
    else if (call.name === 'inscriptionCount') value = count
    else if (call.name === 'inscriptionOfOwnerByIndex') value = [21000n + call.args[1], 99n]
    else if (call.name === 'getSvg') value = raw
    else if (call.name === 'getSoul') value = [0, '', 0, '', 0, '', 0, '', 0, '', false, '']
    else throw Error('Unexpected method ' + call.name)
    return iface.encodeFunctionResult(call.name, [value])
  } }
}
const reader = fixture(), owned = await readOwnedSouls(reader, owner)
assert.equal(owned.total, 3); assert.deepEqual(owned.souls.map(s => s.dynamic), [true, false, false])
assert.deepEqual(owned.souls.map(s => s.seed), ['1', '21000', '21001'])
assert.ok(owned.souls.every(s => s.owner === owner && s.source === 'wallet'))
const second = await readOwnedSouls(fixture({count:10n}), owner, { offset: 6, limit: 6 })
assert.equal(second.souls.length, 5); assert.equal(second.souls[0].seed, '21005'); assert.equal(second.total, 11)
const stableOnly = await readOwnedSouls(fixture({dynamic:[0n,0n]}), owner)
assert.equal(stableOnly.total, 2); assert.equal(stableOnly.souls[0].seed, '21000'); assert.equal(stableOnly.souls[0].dynamic, false)
assert.equal((await readOwnedSouls(fixture({dynamic:[0n,0n],count:0n}),owner)).total, 0)
const shrunk = await readOwnedSouls(fixture({count:0n}),owner,{offset:6})
assert.equal(shrunk.offset,0); assert.equal(shrunk.souls.length,1)
const shared = await readSharedSoul(fixture(), pair)
assert.equal(shared.source, 'shared'); assert.equal(shared.owner, undefined); assert.equal(shared.dynamic, undefined)
for (const options of [{chain:'0x14a34'}, {runtime:'0x1234'}, {stale:true}, {reorg:true}]) await assert.rejects(readOwnedSouls(fixture(options), owner))
await assert.rejects(readOwnedSouls(fixture(), owner, { limit: 9 }))
const invalidReader = { request() { throw Error('Should not read RPC for invalid link') } }
await assert.rejects(readSharedSoul(invalidReader,{seed:'0',extra:'0'}), /Invalid inscription/)
console.log('PASS: original SVG allowlist, safe share links, pinned read-only rendering, pagination, empty/stable collections, wrong chain/code/stale/reorg rejection.')
