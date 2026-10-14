import { createDefense, settleDefense, defenseStory } from './market-world.mjs'
import { OFFLINE_MS } from './sanctuary.mjs'
export const LOCAL_WEATHER_KEY = 'souli-weather-v1'
export function restoreLocalWeather(raw, now) {
  try {
    const value = JSON.parse(raw), e = value.event
    if (!e || !['fog','aurora'].includes(e.kind) || !Number.isFinite(e.startAt) || e.startAt > now || e.startAt < 0) return null
    if (!Number.isFinite(value.from) || !Number.isFinite(value.until) || value.from < e.startAt || value.until < value.from) return null
    const event = createDefense(e.kind, e.startAt)
    const light = e.credits?.local ?? 0
    if (!Number.isSafeInteger(light) || light < 0 || light > 20) return null
    event.light = light; event.credits.local = light
    event.wins = Number.isSafeInteger(e.wins) && e.wins >= 0 && e.wins <= 1e6 ? e.wins : 0
    event.result = ['lit','recovering'].includes(e.result) && now >= event.endAt ? e.result : null
    return { event, from: value.from, until: Math.min(value.until, now + OFFLINE_MS), recorded: value.recorded === true }
  } catch { return null }
}
export function advanceLocalWeather(local, signal, state, now) {
  if (local?.event) {
    settleDefense(local.event, [{ id: 'local', from: local.from, until: local.until }], now)
    if (local.event.result && !local.recorded) {
      state.journal.unshift({ day: state.days, kind: 'defense', text: defenseStory(local.event) })
      state.journal = state.journal.slice(0,12); local.recorded = true
      local.event.wins = (local.event.wins || 0) + (local.event.result === 'lit' ? 1 : 0)
    }
  }
  if (signal && signal.id !== local?.event.id && now < signal.endAt) {
    const wins = local?.event.wins || 0
    local = { event: createDefense(signal.kind, signal.startAt), from: now, until: now + OFFLINE_MS, recorded: false }
    local.event.wins = wins
  }
  // Refresh only while visiting. Offline credit ends at the prior lease, even if
  // a device is reopened days later. A finished round is never charged or replayed.
  if (local && now <= local.until) local.until = now + OFFLINE_MS
  return local
}
