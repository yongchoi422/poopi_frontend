// Public RPCs only read/simulate. Wallet signing and broadcasting never enter
// this transport; fallback repeats the exact request, including its block tag.
export const ADMIN_READ_ENDPOINTS = Object.freeze({
  8453: ['https://mainnet.base.org', 'https://base-rpc.publicnode.com'],
  84532: ['https://sepolia.base.org'],
})
const METHODS = new Set(['eth_chainId', 'eth_blockNumber', 'eth_getCode', 'eth_call',
  'eth_getBalance', 'eth_getBlockByNumber', 'eth_getTransactionCount',
  'eth_getTransactionByHash', 'eth_getTransactionReceipt', 'eth_estimateGas', 'eth_gasPrice'])
const unavailable = cause => Object.assign(new Error('Chain verification is temporarily unavailable. Any pending request stays saved. Check its receipt before sending another transaction.', { cause }), { code: 'READ_RPC_UNAVAILABLE' })

export function createAdminReader(chainId, { endpoints = ADMIN_READ_ENDPOINTS[chainId], fetcher = globalThis.fetch,
  timeoutMs = 10000, concurrency = 4, now = Date.now } = {}) {
  if (!endpoints?.length || !Number.isSafeInteger(chainId) || concurrency < 1 || timeoutMs < 1) throw Error('Invalid read network configuration.')
  const nodes = endpoints.map(url => ({ url, checked: null, retryAt: 0 }))
  const queue = [], activeControllers = new Set()
  let active = 0, id = 0, closed = false
  async function post(node, method, params) {
    if (closed) throw Error('Page closed.')
    const controller = new AbortController(), requestId = ++id
    activeControllers.add(controller)
    const timeout = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await fetcher(node.url, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: requestId, method, params }), signal: controller.signal, credentials: 'omit', cache: 'no-store' })
      if (!response.ok) throw Object.assign(Error(`Read RPC HTTP ${response.status}`), { retryable: true })
      const body = await response.json()
      if (body?.jsonrpc !== '2.0' || body.id !== requestId) throw Object.assign(Error('Invalid read RPC response.'), { retryable: true })
      if (body.error) {
        // Reverts/invalid arguments must not be turned into successful fallback.
        const archiveDenied = /archive.*(token|required|access)|historical state.*unavailable|missing trie node/i.test(body.error.message || '')
        throw Object.assign(Error(body.error.message || 'Read RPC error.'), { code: body.error.code, data: body.error.data,
          retryable: archiveDenied || body.error.code === -32005 })
      }
      if (!Object.hasOwn(body, 'result')) throw Object.assign(Error('Missing read RPC result.'), { retryable: true })
      return body.result
    } catch (error) {
      if (closed) throw Error('Page closed.')
      if (error.name === 'AbortError' || error instanceof TypeError || error instanceof SyntaxError) error.retryable = true
      throw error
    } finally { clearTimeout(timeout); activeControllers.delete(controller) }
  }
  async function run(method, params) {
    let last
    const ordered = [...nodes].sort((a, b) => Number(a.retryAt > now()) - Number(b.retryAt > now()))
    for (const node of ordered) {
      if (closed) throw Error('Page closed.')
      try {
        node.checked ||= post(node, 'eth_chainId', []).then(chain => {
          if (!/^0x[\da-f]+$/i.test(chain) || BigInt(chain) !== BigInt(chainId)) throw Error('Wrong read network. Verification stopped.')
          return chain
        }).catch(error => { node.checked = null; throw error })
        const chain = await node.checked
        const result = method === 'eth_chainId' ? chain : await post(node, method, params)
        node.retryAt = 0
        return result
      } catch (error) {
        if (!error.retryable || closed) throw error
        node.retryAt = now() + 30000; last = error
      }
    }
    throw unavailable(last)
  }
  function pump() {
    while (!closed && active < concurrency && queue.length) {
      const job = queue.shift(); active++
      run(job.method, job.params).then(job.resolve, job.reject).finally(() => { active--; pump() })
    }
  }
  return {
    request({ method, params = [] }) {
      if (closed) return Promise.reject(Error('Page closed.'))
      if (!METHODS.has(method)) return Promise.reject(Error('Only read and simulation requests are allowed.'))
      const snapshot = JSON.parse(JSON.stringify(params))
      return new Promise((resolve, reject) => { queue.push({ method, params: snapshot, resolve, reject }); pump() })
    },
    destroy() {
      closed = true
      for (const controller of activeControllers) controller.abort()
      for (const job of queue.splice(0)) job.reject(Error('Page closed.'))
    },
  }
}
