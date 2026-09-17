import { createGame, startGame, stepGame, DEFAULT_ROLES, ROLES } from './engine.mjs'

export const OFFLINE_CAP_SECONDS = 2 * 60 * 60
export const TIDES = ['up', 'calm', 'down']
export const nextTide = mode => TIDES[(TIDES.indexOf(mode) + 1) % TIDES.length]
export function createIdle({ memories = 0, night = 1 } = {}) {
  return { version: 2, active: false, game: createGame('up', DEFAULT_ROLES, night), memories, bank: 0, log: [], rest: 0, remainder: 0, lastSavedAt: 0 }
}
export function toggleIdle(state) {
  state.active = !state.active
  if (state.active && state.game.status === 'ready') startGame(state.game)
  return state.active
}
export function claimMemories(state) {
  const amount = state.bank
  state.memories += amount
  state.bank = 0
  return amount
}
export function setIdleTide(state, mode) {
  if (state.active || !TIDES.includes(mode)) return false
  state.game = createGame(mode, state.game.roles, state.game.night + (state.game.status === 'finished' ? 1 : 0))
  state.rest = 0; state.remainder = 0
  return true
}
export function setIdleRole(state, index, role) {
  if (state.active || !ROLES[role] || !Number.isInteger(index) || index < 0 || index > 5) return false
  const roles = [...state.game.roles]
  roles[index] = role
  state.game = createGame(state.game.mode, roles, state.game.night + (state.game.status === 'finished' ? 1 : 0))
  state.rest = 0; state.remainder = 0
  return true
}
function remember(state) {
  const result = state.game.result
  const earned = result.memories + (result.mode === 'down' && result.success ? 1 : 0)
  state.bank += earned
  state.log.unshift({ ...result, earned, help: result.mode === 'up' ? 'The squad touched grass. It was productive.' : result.mode === 'down' ? 'Teamwork > doomscrolling.' : 'Rest is also a strategy, ser.' })
  state.log = state.log.slice(0, 6)
  state.rest = 3
}
// Visible play and away progress run exactly the same deterministic simulation.
export function advanceIdle(state, seconds) {
  if (!state.active || !Number.isFinite(seconds) || seconds <= 0) return { earned: 0, rounds: 0, seconds: 0 }
  const used = Math.min(seconds, OFFLINE_CAP_SECONDS)
  const before = state.bank
  let rounds = 0
  state.remainder += used
  while (state.remainder >= .1 - 1e-8) {
    state.remainder = Math.max(0, state.remainder - .1)
    if (state.game.status === 'finished') {
      state.rest -= .1
      if (state.rest <= 1e-8) {
        state.rest = 0
        state.game = createGame(nextTide(state.game.mode), state.game.roles, state.game.night + 1)
        startGame(state.game)
      }
      continue
    }
    if (state.game.status === 'ready') startGame(state.game)
    stepGame(state.game, .1)
    if (state.game.status === 'finished') { remember(state); rounds++ }
  }
  return { earned: state.bank - before, rounds, seconds: used }
}
export function restoreIdle(raw) {
  try {
    const saved = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!saved || saved.version !== 2 || typeof saved.active !== 'boolean') return null
    if (![saved.memories, saved.bank, saved.rest, saved.remainder, saved.lastSavedAt].every(v => Number.isFinite(v) && v >= 0)) return null
    const game = saved.game
    if (!game || !TIDES.includes(game.mode) || !['ready', 'running', 'finished'].includes(game.status)) return null
    if (!Number.isSafeInteger(game.night) || game.night < 1) return null
    if (game.roles?.length !== 6 || game.roles.some(role => !ROLES[role])) return null
    if (game.contribution?.length !== 6 || !Array.isArray(game.enemies) || !Array.isArray(game.beams) || !Array.isArray(game.links)) return null
    if (![game.elapsed, game.shield, game.spawned, game.kills, game.nextSpawn].every(Number.isFinite)) return null
    if (game.status === 'finished' && !game.result) return null
    saved.log = Array.isArray(saved.log) ? saved.log.filter(entry => entry && TIDES.includes(entry.mode) && typeof entry.message === 'string').slice(0, 6) : []
    saved.rest = Math.min(3, saved.rest)
    saved.remainder = Math.min(.1, saved.remainder)
    return saved
  } catch { return null }
}
export function catchUpIdle(state, now) {
  const seconds = Math.max(0, (now - state.lastSavedAt) / 1000)
  const result = advanceIdle(state, seconds)
  state.lastSavedAt = now
  return result
}
