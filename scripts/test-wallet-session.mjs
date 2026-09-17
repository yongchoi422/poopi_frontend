import assert from 'node:assert/strict'
import { createWalletSession } from '../src/lighthouse/wallet-session.mjs'
const A = '0x1111111111111111111111111111111111111111', B = '0x2222222222222222222222222222222222222222'
const calls = [], handlers = new Map()
let account = A, chainId = '0x2105'
let deferredRead = null
const provider = {
  isMetaMask: true,
  on(name, handler) { handlers.set(name, handler) },
  removeListener(name, handler) { if (handlers.get(name) === handler) handlers.delete(name) },
  async request(call) {
    calls.push(call)
    if (call.method === 'eth_requestAccounts') return [account]
    if (call.method === 'eth_chainId') return chainId
    if (call.method === 'eth_blockNumber') return '0x100'
    if (call.method === 'eth_call') {
      if (deferredRead) return deferredRead
      return call.params[0].data.endsWith(A.slice(2)) ? '0x64' : '0xc8'
    }
    if (call.method === 'wallet_switchEthereumChain') { chainId = call.params[0].chainId; return null }
    throw Error(`Unexpected method: ${call.method}`)
  },
}
const tick = async () => { for (let i = 0; i < 20; i++) await Promise.resolve() }
const states = []
const session = createWalletSession(() => provider, s => states.push(s))
assert.equal(calls.length, 0, 'creating a session must not open a wallet or read accounts')
assert.equal(await session.connect(), A)
assert.equal(session.state.usdcUnits, 100n)
assert.equal(handlers.size, 3)
assert.equal(await session.connect(), A)
assert.equal(calls.filter(c => c.method === 'eth_requestAccounts').length, 1, 'opening another feature must reuse the account')
account = B
handlers.get('accountsChanged')([B]); await tick()
assert.equal(session.state.address, B); assert.equal(session.state.usdcUnits, 200n)
chainId = '0x1'; handlers.get('chainChanged')(chainId); await tick()
assert.equal(session.state.usdcUnits, null)
assert.equal(calls.filter(c => c.method === 'wallet_switchEthereumChain').length, 0, 'connection and chain events must not silently switch networks')
await session.switchBase()
assert.equal(session.state.chainId, '0x2105')
assert.equal(session.state.usdcUnits, 200n)
let release
deferredRead = new Promise(resolve => { release = resolve })
const pending = session.refresh()
await tick(); session.disconnect(); release('0xffff'); await pending
assert.equal(session.state.address, ''); assert.equal(session.state.usdcUnits, null)
assert.equal(handlers.size, 0, 'clear removes provider listeners')
assert.match(session.state.notice, /earlier token approvals/)
const allowed = new Set(['eth_requestAccounts', 'eth_chainId', 'eth_blockNumber', 'eth_call', 'wallet_switchEthereumChain'])
assert.ok(calls.every(c => allowed.has(c.method)), 'no signature, allowance, transaction or broad permissions request')
session.destroy()
assert.equal(await session.connect(), '')

const missing = createWalletSession(() => null)
await missing.connect(); assert.match(missing.state.error, /No browser wallet/)
const rejected = createWalletSession(() => ({ request: async () => { throw { code: 4001 } } }))
await rejected.connect(); assert.equal(rejected.state.busy, false); assert.equal(rejected.state.address, ''); assert.match(rejected.state.error, /cancelled/)

let completeConnect
const delayed = createWalletSession(() => ({ request: () => new Promise(resolve => { completeConnect = resolve }) }))
const connecting = delayed.connect()
delayed.disconnect(); completeConnect([A]); await connecting
assert.equal(delayed.state.address, '', 'late wallet approval cannot reconnect a cleared session')
console.log('PASS: shared read-only wallet, no automatic prompt/network switch, account changes, blocked stale responses, disconnect and rejection.')
