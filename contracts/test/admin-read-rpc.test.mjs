import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createAdminReader } from '../../src/sale-admin/read-rpc.mjs'

const ok = (request, result) => ({ ok: true, json: async () => ({ jsonrpc: '2.0', id: request.id, result }) })
const make = fn => createAdminReader(8453, { endpoints: ['primary', 'fallback'], timeoutMs: 50,
  fetcher: (url, options) => fn(url, JSON.parse(options.body), options.signal) })

test('archive denial falls back with the exact historical block and chain checks', async () => {
  const calls = []
  const reader = make(async (url, r) => {
    calls.push([url, r.method, r.params])
    if (r.method === 'eth_chainId') return ok(r, '0x2105')
    return url === 'primary' ? { ok: false, status: 403 } : ok(r, '0xcafe')
  })
  assert.equal(await reader.request({ method: 'eth_getCode', params: ['0x1234', '0xabc'] }), '0xcafe')
  assert.deepEqual(calls, [['primary', 'eth_chainId', []], ['primary', 'eth_getCode', ['0x1234', '0xabc']],
    ['fallback', 'eth_chainId', []], ['fallback', 'eth_getCode', ['0x1234', '0xabc']]])
  reader.destroy()
})

test('wallet, signing and broadcast methods never reach any endpoint', async () => {
  let calls = 0; const reader = make(() => { calls++; throw Error('Unexpected request') })
  for (const method of ['eth_sendTransaction', 'eth_sendRawTransaction', 'eth_sign', 'personal_sign', 'wallet_sendCalls', 'eth_accounts']) {
    await assert.rejects(reader.request({ method }), /Only read/)
  }
  assert.equal(calls, 0); reader.destroy()
})

test('wrong-chain response and contract revert fail closed without fallback', async () => {
  for (const wrongChain of [true, false]) {
    const calls = []
    const reader = make(async (url, r) => {
      calls.push(url)
      if (r.method === 'eth_chainId') return ok(r, wrongChain ? '0x1' : '0x2105')
      return { ok: true, json: async () => ({ jsonrpc: '2.0', id: r.id, error: { code: 3, message: 'execution reverted', data: '0xdead' } }) }
    })
    await assert.rejects(reader.request({ method: 'eth_estimateGas', params: [{}] }), wrongChain ? /Wrong read network/ : /execution reverted/)
    assert.ok(calls.every(url => url === 'primary')); reader.destroy()
  }
})

test('RPC archive error falls back but invalid arguments do not', async () => {
  for (const archive of [true, false]) {
    let fallback = 0
    const reader = make(async (url, r) => {
      if (url === 'fallback') fallback++
      if (r.method === 'eth_chainId') return ok(r, '0x2105')
      if (url === 'fallback') return ok(r, '0xabc')
      return { ok: true, json: async () => ({ jsonrpc: '2.0', id: r.id, error: { code: -32602,
        message: archive ? 'Archive requests require a personal token.' : 'invalid argument 0' } }) }
    })
    if (archive) assert.equal(await reader.request({ method: 'eth_getCode', params: ['0x1234', '0xabc'] }), '0xabc')
    else await assert.rejects(reader.request({ method: 'eth_getCode' }), /invalid argument/)
    assert.equal(fallback, archive ? 2 : 0); reader.destroy()
  }
})

test('timeouts use fallback; complete outage rejects without an invented result', async () => {
  const reader = make((url, r, signal) => {
    if (url === 'fallback') return Promise.resolve(ok(r, r.method === 'eth_chainId' ? '0x2105' : null))
    return new Promise((_, reject) => signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))))
  })
  assert.equal(await reader.request({ method: 'eth_getTransactionReceipt', params: ['0xabc'] }), null)
  reader.destroy()
  const failed = make(async () => { throw TypeError('Failed to fetch') })
  await assert.rejects(failed.request({ method: 'eth_blockNumber' }), e => e.code === 'READ_RPC_UNAVAILABLE')
  failed.destroy()
})

test('concurrency is bounded, callers cannot mutate queued params, destroy cancels pending reads', async () => {
  let active = 0, peak = 0, received
  const reader = createAdminReader(8453, { endpoints: ['primary'], concurrency: 2, fetcher: async (_, options) => {
    const r = JSON.parse(options.body)
    active++; peak = Math.max(peak, active)
    await new Promise(resolve => setTimeout(resolve, 5)); active--
    if (r.method !== 'eth_chainId') received = r.params
    return ok(r, r.method === 'eth_chainId' ? '0x2105' : '0x2')
  } })
  const params = ['0xoriginal'], requests = Array.from({ length: 10 }, () => reader.request({ method: 'eth_getTransactionReceipt', params }))
  params[0] = '0xmutated'
  await Promise.all(requests); assert.ok(peak <= 2); assert.deepEqual(received, ['0xoriginal']); reader.destroy()
  const pending = make((_, r, signal) => new Promise((_, reject) => signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))))
  const work = Array.from({ length: 8 }, () => pending.request({ method: 'eth_blockNumber' }))
  pending.destroy()
  assert.ok((await Promise.allSettled(work)).every(r => r.status === 'rejected'))
  await assert.rejects(pending.request({ method: 'eth_blockNumber' }), /Page closed/)
})
