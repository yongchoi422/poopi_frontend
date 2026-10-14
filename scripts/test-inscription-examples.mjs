import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { guideForAmount } from '../src/lighthouse/purchase-guide.mjs'
const read = file => JSON.parse(readFileSync(new URL(`../src/lighthouse/${file}`, import.meta.url)))
const levels = read('purchase-levels.json'), examples = read('inscription-examples.json')
assert.equal(examples.contract, levels.contract); assert.equal(examples.tokenRuntimeCodeHash, levels.tokenRuntimeCodeHash)
assert.equal(examples.levels.length, 5)
for (const group of examples.levels) {
  assert.equal(group.examples.length, 4); assert.equal(group.displayLevel, group.contractLevel + 1)
  assert.equal(new Set(group.examples.map(e=>e.seed)).size, 1, 'Same-level comparison keeps seed amount fixed')
  assert.equal(new Set(group.examples.map(e=>e.extra)).size, 4)
  assert.equal(new Set(group.examples.map(e=>e.svg)).size, 4)
  for (const e of group.examples) {
    assert.equal(guideForAmount(levels.levels,e.seed).displayLevel,group.displayLevel)
    assert.match(e.svg, /^<svg/); assert.doesNotMatch(e.svg, /<(?:script|image|foreignObject)|\bon\w+=|javascript:/i)
  }
}
console.log('PASS: 20 pinned original-renderer examples, four distinct appearances per level, same seed and safe SVG content.')
