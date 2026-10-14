import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,advanceState,simulateDefense,completeRound,validateState,PRESETS,EXPLORE_MS,PREPARE_MS,ROUND_MS,RETURN_MS} from './grove-rules.mjs';
import {ROOF_CELLS,MARKET_SKIES,roofPaint,roofOwner,roofSummary,initialRoofPaint} from './rooftop-surface.mjs';
const time=1_800_000_000_000;
const startRoof=weather=>advanceState({...createState(time,'rooftop'),weather},time+EXPLORE_MS+PREPARE_MS);

test('a rooftop runs automatically with a frozen, explicitly demo market snapshot',()=>{
  const state=startRoof('fog');assert.ok(validateState(state));assert.equal(state.phase,'defend');assert.equal(state.round.rulesVersion,3);
  assert.equal(state.round.scene,'rooftop');assert.deepEqual(state.round.market,{source:'demo',change:-4.2});
  const expected=simulateDefense(state.round);state.weather='aurora';state.layout={...PRESETS.aurora};assert.deepEqual(simulateDefense(state.round),expected);
  assert.equal(validateState({...state,round:{...state.round,market:{source:'live',change:-4.2}}}),false);
});

test('washing restores tiles instead of adding friendly paint to untouched floor',()=>{
  const owners=new Array(ROOF_CELLS.length).fill(0);
  assert.equal(roofPaint(owners,0,2,1,1),0);assert.equal(roofSummary(owners).clean,100);
  roofPaint(owners,0,2,1,2);assert.equal(roofOwner(owners,0,2),2);const dirty=roofSummary(owners).dirtyCells;
  assert.equal(roofPaint(owners,0,2,1,1),dirty);assert.equal(roofOwner(owners,0,2),1);assert.equal(roofSummary(owners).clean,100);
  assert.equal(roofSummary(owners).cleanedCells,dirty);assert.equal(roofOwner(owners,0,-3),0);assert.equal(roofPaint(owners,100,100,2,2),0);
});

test('gates build pressure, each burst once, and the moving flood changes real floor cells',()=>{
  const run=simulateDefense(startRoof('fog').round),floods=run.frames.flatMap(f=>f.events).filter(e=>e.kind==='flood');
  assert.equal(floods.length,2);assert.equal(new Set(floods.map(e=>e.lane)).size,2);
  for(const flood of floods){
    const before=run.frames[flood.at-1],during=run.frames[flood.at],after=run.frames.slice(flood.at,flood.at+8);
    assert.equal(before.gates[flood.lane].broken,false);assert.equal(during.gates[flood.lane].broken,true);
    assert.equal(during.gates[flood.lane].pressure,during.gates[flood.lane].capacity);
    assert.ok(Math.max(...after.map(f=>f.turf.dirtyCells))>before.turf.dirtyCells+30);
  }
  assert.ok(run.frames[0].gates[0].capacity>run.frames[0].gates[1].capacity);
});

test('rising and falling scenarios have distinct palettes and paint patterns, with recovery in both',()=>{
  const falling=simulateDefense(startRoof('fog').round),rising=simulateDefense(startRoof('aurora').round);
  assert.notEqual(MARKET_SKIES.fog.ink,MARKET_SKIES.aurora.ink);assert.notEqual(MARKET_SKIES.fog.scatter,MARKET_SKIES.aurora.scatter);
  assert.notDeepEqual(falling.frames[40].turf.owners,rising.frames[40].turf.owners);
  for(const run of [falling,rising]){
    assert.equal(run.frames.length,181);assert.equal(run.result.turned+run.result.arrived+run.result.wandered,20);
    assert.ok(run.result.turf.clean>=80);assert.equal(run.result.outcome,'restored');
    assert.ok(run.result.turf.clean>Math.min(...run.frames.map(f=>f.turf.clean))+20);
    assert.ok(run.frames.every(f=>f.events.length<50&&f.enemies.length<=20));
    assert.ok(run.frames.flatMap(f=>f.events).some(e=>e.source==='soul'&&e.side===1));
  }
});

test('reloaded, skipped and late rooftop settlement keep the same cleanup result once',()=>{
  const state=startRoof('fog'),roundEnd=state.round.startedAt+ROUND_MS;
  const skipped=completeRound(state,state.lastAt+1000),offline=advanceState(state,time+7*86400_000);
  assert.deepEqual(skipped.memories[0].result,offline.memories[0].result);assert.equal(offline.memories.length,2);
  assert.equal(offline.phase,'home');assert.equal(advanceState(offline,offline.lastAt).memories.length,2);
  const natural=advanceState(state,roundEnd+RETURN_MS);assert.deepEqual(natural.memories[0].result,offline.memories[0].result);
  assert.ok(validateState(offline));
});

test('score counts exactly the paintable rooftop and frame snapshots remain independent',()=>{
  const owners=initialRoofPaint(),summary=roofSummary(owners);assert.equal(summary.total,ROOF_CELLS.length);
  assert.ok(summary.pollution>0&&summary.clean<100);assert.equal(Math.round((summary.clean+summary.pollution)*10),1000);
  const run=simulateDefense(startRoof('fog').round),saved=run.frames[0].turf.owners;
  for(const f of run.frames){const recounted=roofSummary([...f.turf.owners].map(Number));assert.deepEqual(recounted,f.turf);}
  assert.equal(run.frames[0].turf.owners,saved);assert.deepEqual(run.result.turf,run.frames.at(-1).turf);
});
