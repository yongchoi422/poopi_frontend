import assert from 'node:assert/strict'
import { createGame, startGame, stepGame, connections, DEFAULT_ROLES } from '../src/lighthouse/engine.mjs'

const play = (mode, roles = DEFAULT_ROLES) => {
  const game = createGame(mode, roles)
  startGame(game)
  for (let i = 0; i < 1200 && game.status === 'running'; i++) stepGame(game, 0.05)
  assert.equal(game.status, 'finished')
  return game
}
const balanced = play('down')
const healers = play('down', Array(6).fill('comforter'))
assert.equal(balanced.result.success, true, 'A complementary defense can win')
assert.equal(healers.result.success, false, 'A defense without damage should lose')
assert.ok(balanced.kills > healers.kills)
assert.ok(balanced.contribution.some(value => value.slow > 0), 'Guides provide actual slowing')
assert.equal(connections(Array(6).fill('warden')).length, 0)
assert.ok(connections(DEFAULT_ROLES).length > 0)
const exploration = play('up')
const noGuides = play('up', Array(6).fill('warden'))
assert.ok(exploration.memories > noGuides.memories, 'Role choice changes expedition yield')
assert.equal(play('calm').repairs, 6)
const ready = createGame()
stepGame(ready, 1)
assert.equal(ready.elapsed, 0, 'Ready worlds do not run before the user starts')
const original = JSON.stringify(balanced)
stepGame(balanced, 0.1)
assert.equal(JSON.stringify(balanced), original, 'Completed games cannot duplicate rewards')
assert.notEqual(createGame('down').enemies, createGame('down').enemies)
console.log(JSON.stringify({ passed: true, balanced: { kills: balanced.kills, shield: balanced.result.shield }, noDamage: { kills: healers.kills, shield: healers.result.shield }, exploration: exploration.memories, withoutGuides: noGuides.memories }, null, 2))
