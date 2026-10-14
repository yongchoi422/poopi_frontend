// Local test transport only. No upstream signing or broadcast methods are allowed.
import { createServer } from 'node:http'

const READS = new Set(['eth_chainId', 'net_version', 'eth_blockNumber', 'eth_getBlockByNumber', 'eth_getBlockByHash',
  'eth_getCode', 'eth_getBalance', 'eth_getStorageAt', 'eth_getTransactionCount', 'eth_call',
  'eth_getTransactionByHash', 'eth_getTransactionReceipt', 'eth_getLogs', 'eth_getProof'])

export async function createReadOnlyForkRpc(upstreamUrl) {
  let active = 0, completed = 0
  const queue = [], cache = new Map()
  const run = async body => {
    if (!READS.has(body?.method)) return { jsonrpc: '2.0', id: body?.id ?? null, error: {code: -32601, message: 'Read-only fork transport: method denied'} }
    const key = JSON.stringify([body.method, body.params])
    if (cache.has(key)) return {...cache.get(key), id: body.id}
    if (active >= 4) await new Promise(resolve => queue.push(resolve))
    active++
    try {
      let result
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const response = await fetch(upstreamUrl, {method: 'POST', headers: {'content-type': 'application/json'},
            body: JSON.stringify(body), signal: AbortSignal.timeout(15000)})
          if (!response.ok) throw new Error(`Read RPC HTTP ${response.status}`)
          result = await response.json()
          if (result.error?.code === -32016 || /rate.limit/i.test(result.error?.message || '')) throw new Error(result.error.message)
          break
        } catch (error) {
          if (attempt === 2) throw error
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)))
        }
      }
      // This proxy is private to one pinned fork. Do not cache moving chain reads.
      if (!result.error && !JSON.stringify(body.params).match(/latest|pending|safe|finalized/) && body.method !== 'eth_blockNumber') cache.set(key, result)
      completed++
      if (completed % 100 === 0) console.log(`Fork read transport: ${completed} upstream reads`)
      return {...result, id: body.id}
    } catch (error) {
      console.error(`Fork read failed (${body.method}): ${error.message}`)
      return {jsonrpc:'2.0', id:body.id, error:{code:-32000,message:error.message}}
    } finally {
      active--
      queue.shift()?.()
    }
  }
  const server = createServer(async (req, res) => {
    if (req.method !== 'POST') { res.writeHead(405).end(); return }
    try {
      let text = ''
      for await (const chunk of req) {
        text += chunk
        if (text.length > 1000000) throw new Error('Request too large')
      }
      const input = JSON.parse(text)
      const output = Array.isArray(input) ? await Promise.all(input.map(run)) : await run(input)
      res.writeHead(200, {'content-type':'application/json'}).end(JSON.stringify(output))
    } catch {
      res.writeHead(400).end()
    }
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  return {url:`http://127.0.0.1:${server.address().port}`, close:async () => {
    server.closeAllConnections()
    await new Promise(resolve => server.close(resolve))
  }}
}
