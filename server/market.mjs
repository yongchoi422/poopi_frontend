import { MARKET_TTL, marketKind, freshMarket } from '../src/lighthouse/market-world.mjs'

const ROOT = 'https://api.exchange.coinbase.com/products/ETH-USD'
export function parseEthMarket(stats, ticker, fetchedAt) {
  const open = Number(stats.open), price = Number(ticker.price), observedAt = Date.parse(ticker.time)
  if (!(open > 0 && price > 0) || !Number.isFinite(open + price) ||
    !Number.isFinite(observedAt) || observedAt > fetchedAt + 60_000 || fetchedAt - observedAt > MARKET_TTL) throw Error('Invalid or stale ETH data')
  const change24h = (price / open - 1) * 100
  if (!Number.isFinite(change24h) || Math.abs(change24h) > 100) throw Error('Invalid change')
  return { asset: 'ETH', pair: 'ETH-USD', source: 'Coinbase Exchange', price,
    change24h, observedAt, fetchedAt, kind: marketKind(change24h) }
}
export function createMarketFeed({ fetcher = fetch, now = Date.now } = {}) {
  let sample = null, nextAt = 0, pending = null, failed = false
  return {
    async read() {
      if (now() >= nextAt && !pending) {
        nextAt = now() + 5 * 60_000
        pending = (async () => {
          try {
            const [stats, ticker] = await Promise.all(['stats', 'ticker'].map(async path => {
              const response = await fetcher(`${ROOT}/${path}`, { signal: AbortSignal.timeout(6000), headers: { Accept: 'application/json' } })
              if (!response.ok) throw Error('Market feed unavailable')
              const serverDate = Date.parse(response.headers.get('date'))
              if (!Number.isFinite(serverDate) || Math.abs(now() - serverDate) > MARKET_TTL) throw Error('Stale upstream response')
              return response.json()
            }))
            sample = parseEthMarket(stats, ticker, now()); failed = false
          } catch { failed = true }
          finally { pending = null }
        })()
      }
      if (pending) await pending
      const live = !failed && freshMarket(sample, now())
      return { ...(sample || { asset: 'ETH', source: 'Coinbase Exchange', price: null, change24h: null, observedAt: null }),
        status: live ? 'live' : sample ? 'stale' : 'unavailable', kind: live ? sample.kind : 'calm' }
    },
  }
}
