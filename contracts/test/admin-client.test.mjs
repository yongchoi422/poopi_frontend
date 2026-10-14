import { before, beforeEach, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { network } from 'hardhat'
import { BrowserProvider, ContractFactory, Contract, keccak256 } from 'ethers'
import { prepareControllerDeployment, inspectControllerDeployment } from '../scripts/three-wallet-release-tools.mjs'
import { createAdminClient, readAdminState, validateAdminConfig } from '../../src/sale-admin/client.mjs'

let connection, reader, provider, signers, config, token, sale, checkpoint
const opts = { allowTest: true }
const storage = () => { const map = new Map(); return { getItem: k => map.get(k) || null, setItem: (k, v) => map.set(k, v), removeItem: k => map.delete(k) } }
const wallet = (index = 0) => ({ request: async ({ method, params = [] }) => method === 'eth_accounts' ? [signers[index].address] : reader.request({ method, params }) })
const client = (index = 0, store = storage(), w = wallet(index), conf = config) => createAdminClient(conf, () => w, reader, store, signers[index].address, opts)
async function execute(c, action, quantity) {
  await c.send(await c.review(action, quantity)); await reader.request({ method: 'evm_mine', params: [] })
  const r = await c.recover(); assert.equal(r.status, 'confirmed'); return r
}
before(async () => {
  const artifacts = JSON.parse(readFileSync(new URL('../artifacts/contracts.json', import.meta.url))).contracts
  connection = await network.create('default'); reader = connection.provider
  provider = new BrowserProvider(reader, undefined, { cacheTimeout: -1 }); signers = await provider.listAccounts()
  token = await new ContractFactory(artifacts.TestToken.abi, artifacts.TestToken.bytecode, signers[0]).deploy(); await token.waitForDeployment()
  const now = (await provider.getBlock('latest')).timestamp
  const input = { chainId: 31337, token: await token.getAddress(), deployer: signers[0].address,
    nonce: String(await provider.getTransactionCount(signers[0].address)), operators: signers.slice(0, 3).map(s => s.address),
    unitPriceWei: '100000000', saleCap: '1000', walletCap: '500', startsAt: String(now - 1), endsAt: String(now + 3600) }
  const review = await prepareControllerDeployment(input, artifacts, opts)
  await (await signers[0].sendTransaction({ ...review.transaction, nonce: Number(review.input.nonce) })).wait()
  const checked = await inspectControllerDeployment(provider, review, artifacts, opts)
  config = checked.candidateAdminManifest
  sale = new Contract(config.sale.address, artifacts.SouliEthSale.abi, provider)
  checkpoint = await reader.request({ method: 'evm_snapshot', params: [] })
})
beforeEach(async () => { await reader.request({ method: 'evm_revert', params: [checkpoint] }); checkpoint = await reader.request({ method: 'evm_snapshot', params: [] }) })
after(async () => { provider?.destroy(); await connection?.close() })

test('admin release remains closed without a manifest and rejects mismatched permissions/code/network', async () => {
  assert.equal(validateAdminConfig({ enabled: false }), null)
  assert.throws(() => client(0, storage(), wallet(), { enabled: false }), /not configured/)
  assert.throws(() => validateAdminConfig(config), /network/)
  assert.throws(() => validateAdminConfig({ ...config, operators: [config.operators[0], config.operators[0], config.operators[2]] }, opts), /operators/)
  await assert.rejects(readAdminState(reader, { ...config, controllerRuntimeCodeHash: '0x' + '11'.repeat(32) }, opts), /code/)
  await assert.rejects(readAdminState(reader, { ...config, operators: [...config.operators].reverse() }, opts), /permissions/)
  const wrongReader = { request: ({ method, params }) => method === 'eth_chainId' ? '0x2105' : reader.request({ method, params }) }
  await assert.rejects(readAdminState(wrongReader, config, opts), /Wrong read network/)
})
test('read-only dashboard works without a wallet; unrelated wallets cannot review an action', async () => {
  const s = await readAdminState(reader, config, opts)
  assert.equal(s.status, 'Paused'); assert.equal(s.proceedsWei, 0n); assert.equal(s.isOperator, false)
  await assert.rejects(client(3).review('approve', '1'), /not a registered operator/)
})
test('real client cycle funds, opens, sells, pauses, recovers, restocks and collects from a different operator', async () => {
  const a = client(), b = client(1), c = client(2)
  await execute(a, 'approve', '1000'); await execute(a, 'deposit', '1000')
  assert.equal((await a.read()).allowance, 0n)
  await execute(a, 'start')
  await (await sale.connect(signers[3]).buy(210, config.sale.terms.endsAt, { value: 21000000000n })).wait()
  let s = await a.read(); assert.equal(s.sold, 210n); assert.equal(s.inventory, 790000000000n); assert.equal(s.proceedsWei, 21000000000n)
  await assert.rejects(a.review('recover', '1'), /Pause/)
  await execute(a, 'pause'); await execute(c, 'recover', '210')
  await execute(c, 'approve', '210'); await execute(c, 'deposit', '210'); await execute(c, 'start')
  const collectionReview = await b.review('collect')
  assert.equal(collectionReview.collectableWei, '21000000000')
  assert.equal(collectionReview.destination.toLowerCase(), (await signers[1].getAddress()).toLowerCase())
  await execute(b, 'collect'); s = await b.read()
  assert.equal(s.saleEth + s.controllerEth, 0n); assert.equal(s.proceedsWei, 21000000000n)
  assert.equal(s.inventory, 790000000000n); assert.equal(s.sold, 210n)
})
test('amount, balance, allowance, closed-sale and empty-collection checks fail before a wallet request', async () => {
  const a = client()
  for (const q of ['0', '-1', '1.2', '1e2', '1001']) await assert.rejects(a.review('approve', q))
  await assert.rejects(a.review('deposit', '1'), /Approve/)
  await assert.rejects(a.review('start'), /cannot be opened/)
  await assert.rejects(a.review('collect'), /No ETH/)
  await assert.rejects(client(1).review('approve', '1'), /does not hold/)
  await execute(a, 'approve', '5'); await execute(a, 'revoke'); assert.equal((await a.read()).allowance, 0n)
})
test('prepared review cannot be edited, reused after expiry or sent after a wallet switch', async () => {
  let now = Date.now(), address = signers[0].address
  const w = { request: ({ method, params }) => method === 'eth_accounts' ? [address] : reader.request({ method, params }) }
  const a = createAdminClient(config, () => w, reader, storage(), address, { ...opts, now: () => now })
  const p = await a.review('approve', '10')
  await assert.rejects(a.send({ ...p }), /Review this action/)
  now += 121000; await assert.rejects(a.send(p), /Review this action/)
  const next = await a.review('approve', '10'); address = signers[1].address
  await assert.rejects(a.send(next), /Wallet changed/)
})
test('pending intent prevents duplicate requests across clients and survives refresh', async () => {
  const store = storage(), a = client(0, store), b = client(0, store)
  const p1 = await a.review('approve', '10'), p2 = await b.review('approve', '10')
  await a.send(p1); await assert.rejects(b.send(p2), /earlier request/)
  const restored = client(0, store); await reader.request({ method: 'evm_mine', params: [] })
  assert.equal((await restored.recover()).status, 'confirmed'); assert.equal(a.state().pending, null)
})
test('wallet rejection clears intent but an ambiguous sent response stays blocked until exact recovery', async () => {
  const rejectWallet = { request: args => args.method === 'eth_sendTransaction' ? Promise.reject(Object.assign(Error('rejected'), { code: 4001 })) : wallet().request(args) }
  const a = client(0, storage(), rejectWallet); await assert.rejects(a.send(await a.review('approve', '5')), /rejected/); assert.equal(a.state().pending, null)
  let actualHash
  const lostWallet = { request: async args => { if (args.method !== 'eth_sendTransaction') return wallet().request(args); actualHash = await wallet().request(args); throw Error('lost response') } }
  const b = client(0, storage(), lostWallet); await assert.rejects(b.send(await b.review('approve', '5')), /lost response/)
  assert.equal(b.state().pending.hash, null); await assert.rejects(b.review('approve', '5'), /earlier request/)
  await reader.request({ method: 'evm_mine', params: [] }); assert.equal((await b.recover(actualHash)).status, 'confirmed')
})
test('storage failure before broadcast sends nothing; failure after broadcast preserves the hash in memory', async () => {
  let sends = 0, broken = false
  const store = storage(), originalGet = store.getItem, originalSet = store.setItem
  store.setItem = () => { throw Error('storage unavailable') }
  const w = { request: async args => { if (args.method === 'eth_sendTransaction') sends++; return wallet().request(args) } }
  const a = client(0, store, w); await assert.rejects(a.send(await a.review('approve', '5')), /Could not save/); assert.equal(sends, 0)
  store.setItem = (k, v) => { if (broken) throw Error(); originalSet(k, v) }
  store.getItem = k => { if (broken) throw Error(); return originalGet(k) }
  const w2 = { request: async args => { const value = await wallet().request(args); if (args.method === 'eth_sendTransaction') broken = true; return value } }
  const b = client(0, store, w2); const id = await b.send(await b.review('approve', '5'))
  assert.equal(b.state().pending.hash, id); assert.equal(b.state().storageWarning, true)
})
test('unrelated receipts, missing effects and noncanonical blocks never clear the pending intent', async () => {
  const store = storage(), a = client(0, store); await a.send(await a.review('approve', '5'))
  await reader.request({ method: 'evm_mine', params: [] })
  const other = await (await signers[1].sendTransaction({ to: signers[2].address, value: 1n })).wait()
  await assert.rejects(a.recover(other.hash), /does not match/)
  const noLogs = { request: async args => { const result = await reader.request(args); return args.method === 'eth_getTransactionReceipt' ? { ...result, logs: [] } : result } }
  const b = createAdminClient(config, () => wallet(), noLogs, store, signers[0].address, opts)
  await assert.rejects(b.recover(), /expected effect/); assert.ok(a.state().pending)
  const reorg = { request: async args => { const result = await reader.request(args); return args.method === 'eth_getBlockByNumber' ? { ...result, hash: keccak256('0x1234') } : result } }
  const c = createAdminClient(config, () => wallet(), reorg, store, signers[0].address, opts)
  assert.equal((await c.recover()).status, 'pending'); assert.ok(a.state().pending)
  assert.equal((await a.recover()).status, 'confirmed')
})
