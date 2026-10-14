import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,advanceState,startRound,completeRound,simulateDefense,placeTool,validateState,setAutoplay,nextTransitionAt,PRESETS,EXPLORE_MS,ROUND_MS,RETURN_MS,PREPARE_MS,REST_MS} from './grove-rules.mjs';
import {TURF_CELLS,paintTurf,ownerAt,summarizeTurf} from './grove-turf.mjs';
const start=1_800_000_000_000;
const discovered=()=>advanceState({...createState(start),autoplay:false,layout:{...PRESETS.balanced}},start+EXPLORE_MS);
test('discovery survives repeated settlement without duplicate memories',()=>{
  const a=discovered(),b=advanceState(a,start+EXPLORE_MS+1);
  assert.equal(a.discovered,true);assert.equal(a.phase,'arrange');assert.equal(b.memories.length,1);assert.ok(validateState(b));
});
test('moving an existing tool frees its clearing; a fourth tool cannot silently delete one',()=>{
  assert.deepEqual(placeTool(PRESETS.balanced,2,'lantern'),{2:'lantern',3:'chime',4:'fence'});
  assert.throws(()=>placeTool(PRESETS.balanced,1,'bowl'),/Three tools/);
  assert.deepEqual(placeTool(PRESETS.balanced,0,'bowl'),{0:'bowl',3:'chime',4:'fence'});
});
test('round input remains independent of later layout or weather edits',()=>{
  const s=startRound(discovered(),start+20_000),before=simulateDefense(s.round);
  s.layout={...PRESETS.aurora};s.weather='aurora';
  assert.deepEqual(simulateDefense(s.round),before);assert.equal(s.round.weather,'fog');
});
test('live incremental and week-late settlement agree on one fixed encounter',()=>{
  const s=startRound(discovered(),start+20_000);let incremental=s;
  for(let ms=0;ms<=ROUND_MS+RETURN_MS;ms+=1000)incremental=advanceState(incremental,start+20_000+ms);
  const offline=advanceState(s,start+7*24*3600_000);
  assert.equal(offline.phase,'home');assert.equal(offline.memories.length,2);
  assert.deepEqual(offline.memories,incremental.memories);
  assert.deepEqual(advanceState(offline,start+8*24*3600_000).memories,offline.memories);
});
test('skipping the visual preview uses the same result and can only complete once',()=>{
  const s=startRound(discovered(),start+20_000),completed=completeRound(s,start+21_000);
  assert.deepEqual(completed.memories[0].result,simulateDefense(s.round).result);
  assert.equal(completeRound(completed,start+22_000).memories.length,2);
});
test('backward clock does not rewind or remove progress',()=>{
  const s=discovered(),later=advanceState(s,start-50_000);
  assert.equal(later.lastAt,s.lastAt);assert.equal(later.phase,'arrange');assert.deepEqual(later.memories,s.memories);
});
test('fog and aurora create different useful facility choices',()=>{
  const run=(weather,layout)=>simulateDefense({weather,layout,rulesVersion:1,seed:422}).result;
  assert.ok(run('fog',PRESETS.balanced).light>run('fog',PRESETS.aurora).light);
  assert.ok(run('aurora',PRESETS.aurora).light>run('aurora',PRESETS.balanced).light);
  assert.ok(run('aurora',PRESETS.aurora).absorbed>0);
});
test('bounded solver accounts for every visitor without inventing a defeat',()=>{
  for(const weather of ['fog','aurora'])for(const layout of Object.values(PRESETS)){
    const {frames,result}=simulateDefense({weather,layout,rulesVersion:1,seed:422});
    assert.equal(frames.length,181);assert.equal(result.turned+result.arrived+result.wandered,20);
    assert.ok(frames.every(f=>f.light>=0&&f.light<=100&&f.enemies.length<=12));
    assert.equal(frames.at(-1).turned,result.turned);assert.equal(frames.at(-1).enemies.length,0);
  }
});
test('unsupported and malformed local saves are not accepted as a fresh world',()=>{
  const base=createState(start);
  assert.ok(validateState(base));assert.equal(validateState({...base,schemaVersion:2}),false);
  assert.equal(validateState({...base,layout:{0:'lantern',1:'lantern'}}),false);
  assert.equal(validateState({...base,phase:'defend',round:null}),false);
  assert.equal(validateState({...base,soulIndex:99}),false);
  assert.equal(validateState({...base,autoplay:'yes'}),false);
});

test('default autonomous life places each tool, defends, rests and goes out again without input',()=>{
  let s=createState(start);assert.equal(s.autoplay,true);
  s=advanceState(s,nextTransitionAt(s));assert.equal(s.phase,'arrange');assert.deepEqual(s.layout,{});
  for(let count=1;count<=3;count++){
    s=advanceState(s,nextTransitionAt(s));assert.equal(Object.keys(s.layout).length,count);assert.ok(validateState(s));
  }
  assert.equal(s.phase,'defend');assert.deepEqual(s.round.layout,PRESETS.fog);
  assert.equal(s.round.startedAt,start+EXPLORE_MS+PREPARE_MS);
  s=advanceState(s,nextTransitionAt(s));assert.equal(s.phase,'return');assert.equal(s.memories.length,2);
  s=advanceState(s,nextTransitionAt(s));assert.equal(s.phase,'home');
  const rested=advanceState(s,s.phaseAt+REST_MS-1);assert.equal(rested.phase,'home');
  s=advanceState(rested,nextTransitionAt(rested));assert.equal(s.phase,'explore');assert.equal(s.weather,'aurora');
  s=advanceState(s,s.phaseAt+EXPLORE_MS+PREPARE_MS);
  assert.equal(s.phase,'defend');assert.deepEqual(s.round.layout,PRESETS.aurora);assert.equal(s.roundNumber,2);
  assert.equal(s.memories.filter(m=>m.id==='first-seed').length,1);
});

test('manual takeover cancels automatic preparation and persists without an automatic start',()=>{
  let s=advanceState(createState(start),start+EXPLORE_MS+PREPARE_MS/3);
  s=setAutoplay(s,false,s.lastAt);const kept={...s.layout};
  s=advanceState(s,start+24*3600_000);
  assert.equal(s.phase,'arrange');assert.deepEqual(s.layout,kept);assert.equal(nextTransitionAt(s),Infinity);
  s=setAutoplay(s,true,s.lastAt);assert.deepEqual(s.layout,{});
  s=advanceState(s,s.lastAt+PREPARE_MS);assert.equal(s.phase,'defend');assert.deepEqual(s.round.layout,PRESETS.fog);
});

test('mode changes during an encounter never change its snapshot or leave a second round scheduled',()=>{
  let s=advanceState(createState(start),start+EXPLORE_MS+PREPARE_MS);const round=structuredClone(s.round);
  s=setAutoplay(s,false,s.lastAt+1000);assert.deepEqual(s.round,round);
  s=setAutoplay(s,true,s.lastAt+1000);assert.deepEqual(s.round,round);
  s=setAutoplay(s,false,s.lastAt+1000);
  s=advanceState(s,start+24*3600_000);assert.equal(s.phase,'home');assert.equal(s.roundNumber,1);
  assert.equal(nextTransitionAt(s),Infinity);assert.equal(s.memories.length,2);
});

test('autonomous return after a long absence settles one outing once, then gives the soul a full rest',()=>{
  const late=start+365*24*3600_000;
  let s=advanceState(createState(start),late);
  assert.equal(s.phase,'home');assert.equal(s.roundNumber,1);assert.equal(s.phaseAt,late);assert.equal(s.memories.length,2);
  const result=s.memories[0].result;
  s=advanceState(s,late);assert.equal(s.phase,'home');assert.equal(s.memories.length,2);
  assert.deepEqual(s.memories[0].result,result);assert.equal(nextTransitionAt(s),late+REST_MS);
  s=advanceState(s,late-1000);assert.equal(s.lastAt,late);assert.equal(s.phase,'home');
});

test('legacy saves gain autonomy while explicit manual saves and existing memories stay intact',()=>{
  const old=discovered();delete old.autoplay;
  assert.ok(validateState(old));
  const migrated=advanceState(old,start+24*3600_000);
  assert.equal(migrated.autoplay,true);assert.equal(migrated.phase,'arrange');assert.deepEqual(migrated.memories,old.memories);
  assert.equal(migrated.phaseAt,start+24*3600_000);assert.ok(validateState(migrated));
  const manual=advanceState({...old,autoplay:false},start+24*3600_000);assert.equal(manual.autoplay,false);assert.deepEqual(manual.layout,old.layout);
});

test('color actually overwrites ownership and preserves the equal-area total',()=>{
  const owners=new Array(TURF_CELLS.length).fill(0);
  paintTurf(owners,0,2,1,2);const violet=summarizeTurf(owners);assert.ok(violet.wildCells>0);assert.equal(ownerAt(owners,0,2),2);
  paintTurf(owners,0,2,1,1);const mint=summarizeTurf(owners);assert.equal(mint.wildCells,0);assert.equal(mint.soulCells,violet.wildCells);assert.equal(ownerAt(owners,0,2),1);
  assert.equal(ownerAt(owners,0,-2),0);assert.equal(mint.owners.length,TURF_CELLS.length);
  assert.equal(paintTurf(owners,100,100,1,1),0);
});

test('color encounters are deterministic, bounded and count actual territory',()=>{
  const input={rulesVersion:2,weather:'fog',layout:PRESETS.fog,seed:422};
  const run=simulateDefense(input);assert.deepEqual(simulateDefense(input),run);
  assert.equal(run.result.turned+run.result.arrived+run.result.wandered,20);
  assert.equal(run.frames.length,181);assert.deepEqual(run.result.turf,run.frames.at(-1).turf);
  let overwritten=false;
  run.frames.forEach((f,i)=>{
    const territory=summarizeTurf([...f.turf.owners].map(Number));assert.deepEqual(f.turf,territory);
    assert.ok(f.events.length<40&&f.enemies.length<=20);
    if(i&&[...f.turf.owners].some((v,k)=>v==='1'&&run.frames[i-1].turf.owners[k]==='2'))overwritten=true;
  });
  assert.ok(overwritten);assert.ok(run.result.turf.soul>0&&run.result.turf.wild>0);
});

test('visible attacks have real sources and targets, and weather affects the color result',()=>{
  const fog=simulateDefense({rulesVersion:2,weather:'fog',layout:PRESETS.fog,seed:422});
  const effects=fog.frames.flatMap(f=>f.events);
  assert.ok(effects.some(e=>e.kind==='shot'&&e.source==='soul'&&e.side===1));
  assert.ok(effects.some(e=>e.kind==='shot'&&e.source==='lantern'));
  assert.ok(effects.some(e=>e.kind==='shot'&&e.side===2));
  assert.ok(effects.some(e=>e.kind==='pulse'&&e.source==='chime'));
  assert.ok(effects.every(e=>Number.isFinite(e.from.x)&&Number.isFinite(e.to.z)&&Number.isFinite(e.at)));
  const optimized=simulateDefense({rulesVersion:2,weather:'aurora',layout:PRESETS.aurora,seed:422}).result;
  const fogTools=simulateDefense({rulesVersion:2,weather:'aurora',layout:PRESETS.fog,seed:422}).result;
  assert.ok(optimized.absorbed>0);assert.ok(optimized.turf.soul-optimized.turf.wild>fogTools.turf.soul-fogTools.turf.wild);
});

test('an existing version-one encounter still settles by its original rules',()=>{
  let s=startRound(discovered(),start+20_000);s.round.rulesVersion=1;
  assert.ok(validateState(s));
  s=completeRound(s,start+30_000);assert.equal(s.memories[0].result.light,64);assert.equal(s.memories[0].result.turf,undefined);
  assert.equal(validateState({...s,round:{...s.round,rulesVersion:99}}),false);
});

test('territory can lose an encounter even while the lantern still has light',()=>{
  const {result}=simulateDefense({rulesVersion:2,weather:'fog',layout:{0:'fence',1:'bowl',2:'chime'},seed:422});
  assert.ok(result.light>0);assert.equal(result.turf.winner,'wild');assert.equal(result.outcome,'reseed');
});
