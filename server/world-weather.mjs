import { randomUUID } from 'node:crypto'
import { OFFLINE_MS } from '../src/lighthouse/sanctuary.mjs'
import { freshMarket, createDefense, settleDefense, defenseView, defenseStory } from '../src/lighthouse/market-world.mjs'
import { repository } from './repository.mjs'

export const CHECKPOINT_MS = 5 * 60_000
const ROUND_MS = 20 * 60_000
const readState = row => row ? JSON.parse(row.state) : null
const putState = (tx, table, id, state) => tx.put(table, { id, state: JSON.stringify(state) })
export function createWorldWeather({ store, feed, now = Date.now }) {
  const db = repository(store)
  let pending, snapshot
  const publicWorld = world => {
    const time = now(), market = world.market || { asset: 'ETH', status: 'unavailable', kind: 'calm' }
    const live = market.status === 'live' && freshMarket(market, time)
    return { market: { ...market, status: live ? 'live' : market.status === 'live' ? 'stale' : market.status, kind: live ? market.kind : 'calm' }, event: defenseView(world.event, time), serverTime: time }
  }
  async function refresh({ cached = true } = {}) {
    if (cached && snapshot && now() >= snapshot.at && now() - snapshot.at < CHECKPOINT_MS) return publicWorld(snapshot.world)
    if (pending) return pending
    pending = (async () => {
      const owner = randomUUID()
      const reserved = await db.run(async tx => {
        const world = readState(await tx.get('weather_state', 'eth')) || { event: null }
        if ((cached && now() < (world.nextAt || 0)) || now() < (world.leaseUntil || 0)) return { world }
        world.leaseOwner = owner; world.leaseUntil = now() + 15_000
        await putState(tx, 'weather_state', 'eth', world)
        return { world, fetch: true }
      })
      if (!reserved.fetch) {
        // A temporary refresh lease must not hide new data for five minutes.
        if (!reserved.world.leaseUntil || reserved.world.leaseUntil <= now()) snapshot = { world: reserved.world, at: Math.min(now(), (reserved.world.nextAt || now()) - CHECKPOINT_MS) }
        return publicWorld(reserved.world)
      }
      let market
      try { market = await feed.read() } catch { market = { asset: 'ETH', status: 'unavailable', kind: 'calm' } }
      const world = await db.run(async tx => {
        const saved = readState(await tx.get('weather_state', 'eth')) || {}
        if (saved.leaseOwner !== owner) return saved
        const time = now(), live = market.status === 'live' && freshMarket(market, time)
        saved.market = market; saved.nextAt = time + CHECKPOINT_MS
        delete saved.leaseOwner; delete saved.leaseUntil
        // Only a request observing a fresh quote can start an event. No cron,
        // background game loop, or invented historical price events.
        if (live && ['fog', 'aurora'].includes(market.kind) && (!saved.event || time >= saved.event.restUntil)) {
          saved.event = createDefense(market.kind, time)
          await tx.put('weather_events', { id: saved.event.id, start_at: time, state: JSON.stringify(saved.event) })
        }
        await putState(tx, 'weather_state', 'eth', saved)
        return saved
      })
      snapshot = { world, at: now() }
      return publicWorld(world)
    })().finally(() => { pending = null })
    return pending
  }
  async function town(tx, village) {
    let roster = readState(await tx.get('village_roster', village.id))
    if (!roster) {
      // One-time, bounded migration of existing saves; no reset is needed.
      roster = { members: {}, settledAt: now() - OFFLINE_MS }
      for (const row of await tx.find('homes', 'village', '=', village.id)) {
        const watch = await tx.get('home_watch', row.address)
        if (watch) roster.members[row.address] = { from: Number(watch.since_at), until: Number(watch.until_at), receipts: [] }
      }
    }
    let defense = readState(await tx.get('village_defense', village.id))
    const homes = Object.entries(roster.members).map(([id, member]) => ({ id, ...member }))
    const finish = () => {
      if (!defense) return
      settleDefense(defense, homes, now())
      if (defense.result && !defense.recorded) {
        defense.recorded = true; defense.wins = (defense.wins || 0) + (defense.result === 'lit' ? 1 : 0)
        for (const [address, credit] of Object.entries(defense.credits)) if (credit && roster.members[address]) {
          const member = roster.members[address]
          member.receipts = [...(member.receipts || []), { id: defense.id, text: defenseStory(defense) }].slice(-12)
        }
      }
    }
    finish()
    // All leases end within two hours of the previous visit. Read only rounds
    // overlapping that window, even when a town has been unattended for months.
    const end = Math.min(now(), Math.max(roster.settledAt, ...homes.map(home => home.until)))
    const events = await tx.events(roster.settledAt - ROUND_MS, end)
    const world = readState(await tx.get('weather_state', 'eth'))
    if (world?.event && !events.some(row => row.id === world.event.id)) events.push({ id: world.event.id, state: JSON.stringify(world.event) })
    for (const row of events) {
      const event = readState(row)
      if (defense && event.startAt <= defense.startAt) continue
      const eligible = homes.some(home => home.from < event.endAt && home.until > event.startAt)
      if (!eligible && now() >= event.endAt) continue
      const wins = defense?.wins || 0
      defense = createDefense(event.kind, event.startAt, village.members); defense.wins = wins
      finish()
    }
    roster.settledAt = now()
    return { roster, defense }
  }
  async function saveTown(tx, village, address, home, { roster, defense }) {
    const old = roster.members[address]
    if (old?.receipts?.length) {
      for (const receipt of old.receipts) home.journal.unshift({ day: home.days, kind: 'defense', text: receipt.text })
      home.journal = home.journal.slice(0, 12); old.receipts = []
    }
    let leaseUntil = 0
    if (home.automation) {
      const from = old && old.until >= now() ? old.from : now()
      leaseUntil = now() + OFFLINE_MS
      roster.members[address] = { from, until: leaseUntil, receipts: [] }
      await tx.put('home_watch', { address, since_at: from, until_at: leaseUntil })
    }
    await putState(tx, 'village_roster', village, roster)
    if (defense) await putState(tx, 'village_defense', village, defense)
    return { leaseUntil, defense: defenseView(defense, now(), address) }
  }
  return { refresh, town, saveTown }
}
