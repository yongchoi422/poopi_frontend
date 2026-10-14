import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { compactFrame } from '../src/lighthouse/soul-framing.mjs'
const r = (x,y,width,height) => ({x,y,width,height})
assert.equal(compactFrame([]), null)
assert.equal(compactFrame([r(0,0,24,24)]), null)
assert.equal(compactFrame([r(NaN,1,1,1)]), null)
assert.equal(compactFrame([r(-1,1,1,1)]), null)
assert.equal(compactFrame([r(23,23,2,2)]), null)
assert.equal(compactFrame([r(11,11,1,1)]).viewBox, '7.5 7.5 8 8')
// The real first-form renderer positions this tiny soul near the top-right corner.
const sample=JSON.parse(readFileSync(new URL('../src/lighthouse/tiny-soul.json',import.meta.url)))
const rects=[...sample.svg.matchAll(/<rect\b([^>]+)\/>/g)].slice(4).map(m=>Object.fromEntries(['x','y','width','height'].map(k=>[k,Number(m[1].match(new RegExp(`${k}='([^']+)'`))[1])])) )
const frame=compactFrame(rects)
assert.equal(frame.viewBox,'16 -1.5 8 8')
assert.equal(sample.level,0)
assert.equal(rects.length,3)
const [x,y,w,h]=frame.viewBox.split(' ').map(Number)
for(const rect of rects){ assert.ok(rect.x>=x&&rect.x+rect.width<=x+w); assert.ok(rect.y>=y&&rect.y+rect.height<=y+h) }
assert.equal(compactFrame([r(1,1,1,1),r(22,20,1,1)]),null,'Do not crop separated foreground effects')
console.log('PASS: first-form framing, preserved bounds, invalid shapes, large originals and scattered foreground effects.')
