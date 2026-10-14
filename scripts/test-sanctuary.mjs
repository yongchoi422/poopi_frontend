import assert from 'node:assert/strict'
import { DAY_MS, OFFLINE_MS, HOME_PROJECTS, nextHomeProject, createSanctuary, restoreSanctuary, advanceSanctuary, toggleSanctuary, buildLantern, buildHomeProject, soulKind } from '../src/lighthouse/sanctuary.mjs'

// A visit is idle until started; starting must not credit the time spent paused.
const state = createSanctuary(0)
assert.equal(buildLantern(state), false)
assert.equal(advanceSanctuary(state, DAY_MS * 10), 0)
toggleSanctuary(state, DAY_MS * 20)
assert.equal(state.days, 0)
assert.equal(advanceSanctuary(state, DAY_MS * 21 - 1), 0)
assert.equal(state.supplies, 0)
assert.equal(advanceSanctuary(state, DAY_MS * 21), 1)
assert.deepEqual([state.memories, state.supplies, state.glowstones], [3, 8, 4])

// A duplicate callback, invalid clock, or a clock moving backwards never pays twice.
const paid = structuredClone(state)
for (const now of [DAY_MS * 21, DAY_MS * 20, NaN, Infinity]) {
  assert.equal(advanceSanctuary(state, now), 0)
  assert.deepEqual(state, paid)
}
assert.equal(buildLantern(state), true)
assert.deepEqual([state.supplies, state.glowstones, state.lantern], [0, 0, true])
const built = structuredClone(state)
assert.equal(buildLantern(state), false)
assert.deepEqual(state, built)

// Pausing preserves the partial minute, and resuming cannot accrue the paused interval.
toggleSanctuary(state, DAY_MS * 21 + 20_000)
advanceSanctuary(state, DAY_MS * 30)
assert.equal(state.elapsed, 20_000)
toggleSanctuary(state, DAY_MS * 40)
assert.equal(advanceSanctuary(state, DAY_MS * 40 + 40_000), 1)
assert.equal(state.days, 2)

// Catch-up is capped at two hours and discarded excess cannot be claimed again.
const away = createSanctuary(0)
toggleSanctuary(away, 0)
assert.equal(advanceSanctuary(away, OFFLINE_MS * 20), 120)
assert.equal(advanceSanctuary(away, OFFLINE_MS * 20), 0)
assert.equal(advanceSanctuary(away, OFFLINE_MS * 20 + DAY_MS), 1)
const asleep = restoreSanctuary(JSON.stringify({ ...away, active: false }), OFFLINE_MS * 50)
assert.equal(advanceSanctuary(asleep, OFFLINE_MS * 50), 0)
assert.equal(asleep.days, 121)

// Reopening a saved running world matches live progress over the same interval.
const live = createSanctuary(0)
toggleSanctuary(live, 0)
for (let now = 250; now <= 5 * DAY_MS + 21_250; now += 250) advanceSanctuary(live, now)
const resumed = restoreSanctuary(JSON.stringify({ ...createSanctuary(0), active: true }), 5 * DAY_MS + 21_250)
advanceSanctuary(resumed, 5 * DAY_MS + 21_250)
for (const field of ['days', 'memories', 'supplies', 'glowstones', 'elapsed']) assert.equal(resumed[field], live[field])

// Damaged, unsupported or untrusted saves must not poison timers and resource totals.
for (const raw of ['garbage', 'null', '{}', '{"version":2}']) assert.equal(restoreSanctuary(raw), null)
for (const patch of [{ active: 'yes' }, { days: -1 }, { memories: 1.5 }, { supplies: 1e15 }, { elapsed: DAY_MS }, { lastAt: -1 }]) {
  assert.equal(restoreSanctuary(JSON.stringify({ ...createSanctuary(0), ...patch })), null)
}
const sanitized = restoreSanctuary(JSON.stringify({ ...createSanctuary(1000), extraField: true, journal: [null, { day: 1, text: 'bad kind', kind: 'mint' }, { day: 1, text: 'A real local event.', kind: 'gather' }] }), 500)
assert.equal(sanitized.lastAt, 500)
assert.equal(sanitized.extraField, undefined)
assert.equal(sanitized.journal.length, 1)
for (let i = 0; i < 20; i++) advanceSanctuary(live, live.lastAt + DAY_MS)
assert.equal(live.journal.length, 12)

// Public examples must never appear as owned Stable assets.
assert.equal(soulKind({ source: 'public', dynamic: false }), 'Practice soul')
assert.equal(soulKind({ source: 'address', dynamic: true }), 'Dynamic SOULI')
assert.equal(soulKind({ source: 'address', dynamic: false }), 'Stable SOULI')
assert.equal(soulKind(null), 'Original SOULI')

// The first chapter takes 15 gathered minutes, cannot skip projects or charge twice.
const chapter=createSanctuary(0)
toggleSanctuary(chapter,0)
advanceSanctuary(chapter,15*DAY_MS)
assert.equal(buildHomeProject(chapter,'gallery'),false)
assert.equal(buildHomeProject(chapter,'unknown'),false)
for(const project of HOME_PROJECTS){
  assert.equal(nextHomeProject(chapter).id,project.id)
  assert.equal(buildHomeProject(chapter,project.id),true)
  const snapshot=structuredClone(chapter)
  assert.equal(buildHomeProject(chapter,project.id),false)
  assert.deepEqual(chapter,snapshot)
}
assert.equal(nextHomeProject(chapter),null)
assert.deepEqual([chapter.supplies,chapter.glowstones,chapter.memories],[0,0,45])
const chapterRestored=restoreSanctuary(JSON.stringify(chapter),15*DAY_MS)
assert.ok(chapterRestored.bench&&chapterRestored.gallery)
const olderSave={...chapter,lantern:true};delete olderSave.bench;delete olderSave.gallery
assert.equal(nextHomeProject(restoreSanctuary(JSON.stringify(olderSave),15*DAY_MS)).id,'bench')
assert.equal(restoreSanctuary(JSON.stringify({...chapter,bench:false,gallery:true})),null)
console.log('Sanctuary tests passed: time accounting, capped catch-up, three ordered projects, duplicate prevention, legacy saves and original labels.')
