import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { HERO_FILMS, HERO_SESSION_KEY, chooseFilm, createFilmSession, mayAutoplay } from '../src/site/hero-films.mjs'

assert.deepEqual(HERO_FILMS.map(f => f.id), ['01', '06', '16', '21', '28', '37'])
for (const current of HERO_FILMS) {
  const choices = new Set(Array.from({ length: 5 }, (_, i) => chooseFilm(current.id, () => i / 5).id))
  assert.equal(choices.size, 5)
  assert(!choices.has(current.id), 'Meet another must always choose a different film')
}
const data = new Map()
const storage = { getItem: key => data.get(key), setItem: (key, value) => data.set(key, value) }
const first = createFilmSession(() => storage, () => 0.5)
const restored = createFilmSession(() => storage, () => { throw Error('A valid saved choice must not be randomized') })
assert.equal(restored.current().id, first.current().id)
const previous = first.current().id
assert.notEqual(first.next().id, previous)
assert.equal(createFilmSession(() => storage).current().id, first.current().id)
const cycleStart = first.current().id
const cycle = Array.from({ length: 6 }, () => first.advance().id)
assert.equal(new Set(cycle).size, 6, 'One continuous cycle must include every film exactly once')
assert.equal(cycle.at(-1), cycleStart, 'The sixth transition wraps back to the starting film')
assert.equal(createFilmSession(() => storage).current().id, cycleStart, 'Restore the most recently playing film')
assert.deepEqual(Array.from({ length: 6 }, () => first.advance().id), cycle, 'Following cycles retain the same order')
data.set(HERO_SESSION_KEY, 'retired-episode')
assert.equal(createFilmSession(() => storage, () => 0).current().id, '01')
const unavailable = createFilmSession(() => { throw Error('Storage denied') }, () => 0)
assert.equal(unavailable.current().id, '01')
assert.notEqual(unavailable.next().id, '01')
assert.equal(mayAutoplay(), true)
for (const setting of ['reducedMotion', 'saveData', 'hidden']) assert.equal(mayAutoplay({ [setting]: true }), false)

const directory = 'public/media/souli-moments/v1'
assert.equal((await readdir(directory)).length, 12, 'Ship only the six selected video/poster pairs')
const manifest = JSON.parse(await readFile('docs/hero-film-media.json', 'utf8'))
for (const film of HERO_FILMS) {
  const source = manifest.clips.find(c => c.id === film.id)
  const bytes = await readFile(`public${film.video}`)
  assert.equal(bytes.length, source.bytes)
  assert.equal(createHash('sha256').update(bytes).digest('hex'), source.sha256, 'Do not alter the supplied video')
  assert.equal(createHash('sha256').update(await readFile(`public${film.poster}`)).digest('hex'), source.posterSha256)
}
console.log('PASS: hero film session, complete six-film continuous cycles, distinct selection, blocked storage, autoplay preferences and six original media pairs.')
