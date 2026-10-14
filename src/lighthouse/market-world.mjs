// Shared, deterministic game rules. Prices never change token balances or rewards.
export const MINUTE = 60_000
export const MARKET_TTL = 15 * MINUTE
export const EVENT_REST = 6 * 60 * MINUTE
export const WEATHER = Object.freeze({
  calm: { label: 'Clear skies', icon: '☀', scene: 'sun', activity: 'Gathering light' },
  rain: { label: 'A little rain', icon: '☂', scene: 'rain', activity: 'Lighting the path' },
  fog: { label: 'Fog is coming', icon: '☁', scene: 'fog', activity: 'Keeping the light on' },
  aurora: { label: 'A light storm', icon: '✦', scene: 'aurora', activity: 'Catching starlight' },
})
export function marketKind(change) {
  if (!Number.isFinite(change)) return 'calm'
  if (change <= -4) return 'fog'
  if (change >= 4) return 'aurora'
  return change <= -1 ? 'rain' : 'calm'
}
export function freshMarket(sample, now) {
  return !!sample && sample.asset === 'ETH' && Number.isFinite(sample.change24h) &&
    Number.isFinite(sample.observedAt) && now >= sample.observedAt && now - sample.observedAt <= MARKET_TTL
}
export function createDefense(kind, startAt, members = 1) {
  return { id: `${kind}-${startAt}`, kind, startAt, guardAt: startAt + 5 * MINUTE,
    endAt: startAt + 20 * MINUTE, restUntil: startAt + EVENT_REST,
    target: Math.max(1, Math.min(32, members)) * 8, light: 0, credits: {}, result: null }
}
export function defensePhase(event, now) {
  if (!event) return 'rest'
  if (now < event.guardAt) return 'prepare'
  if (now < event.endAt) return 'guard'
  return now < event.endAt + 10 * MINUTE ? 'recover' : 'rest'
}
// A home contributes one light per full minute, at most once. Cursors and results
// are persisted in the same transaction as the home; polling speed has no effect.
export function settleDefense(event, homes, now) {
  if (!event || event.result) return
  for (const home of homes) {
    const from = Math.max(event.startAt, home.from)
    const until = Math.min(now, event.endAt, home.until)
    const total = Math.max(0, Math.floor((until - from) / MINUTE))
    const previous = event.credits[home.id] || 0
    if (total > previous) {
      event.light += total - previous
      event.credits[home.id] = total
    }
  }
  if (now >= event.endAt) event.result = event.light >= event.target ? 'lit' : 'recovering'
}
export function defenseView(event, now, ownId) {
  if (!event) return null
  return { id: event.id, kind: event.kind, phase: defensePhase(event, now), startAt: event.startAt,
    endAt: event.endAt, target: event.target, light: event.light, result: event.result,
    wins: event.wins || 0, contributors: Object.values(event.credits).filter(n => n > 0).length,
    yours: event.credits[ownId] || 0 }
}
export function defenseStory(event) {
  if (event.result === 'recovering') return 'A little fog remains. We will keep the lights on.'
  return event.kind === 'fog' ? 'ETH fell. Our little town got brighter.' : 'The sky lit up. We saved a little of its light.'
}
