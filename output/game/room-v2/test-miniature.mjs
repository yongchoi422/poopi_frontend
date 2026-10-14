import test from 'node:test';
import assert from 'node:assert/strict';
import {WORLD,CELLS,CREW,simulate,paint,summary,createState,advance,valid,PREPARE_MS,ENCOUNTER_MS} from './miniature-rules.mjs';
const round={version:1,weather:'violet',seed:423},now=1_800_000_000_000;
test('the enlarged neighborhood has five distinct residents and a paintable interior',()=>{
 assert.equal((WORLD.maxX-WORLD.minX)*(WORLD.maxZ-WORLD.minZ),600);assert.equal(new Set(CREW.map(c=>c.sample)).size,5);
 assert.deepEqual(CREW.map(c=>c.job),['guard','guard','wash','wash','repair']);assert.ok(CELLS.length>2000);
 const cells=new Array(CELLS.length).fill(0);assert.equal(paint(cells,0,3,2,1),0);paint(cells,0,3,2,2);assert.ok(summary(cells).homeClean<100);paint(cells,0,3,2,1);assert.equal(summary(cells).homeClean,100);
});
test('five residents perform actual cooperative work, not cosmetic duplicate movement',()=>{
 const full=simulate(round),noGuards=simulate(round,{guards:false}),noCleaners=simulate(round,{cleaners:false}),noMender=simulate(round,{mender:false});
 assert.ok(full.result.crew.every(c=>c.contribution>0));assert.ok(full.result.knockbacks>50);
 assert.ok(noGuards.result.arrived>full.result.arrived);assert.ok(noGuards.result.breaches>full.result.breaches);
 assert.ok(noCleaners.result.homeClean<full.result.homeClean);assert.equal(noMender.result.repairs,0);assert.equal(noMender.frames.at(-1).gate.broken,true);
 const actors=new Set(full.frames.flatMap(f=>f.events).map(e=>e.actor).filter(x=>x!==undefined));assert.equal(actors.size,5);
});
test('the first wave holds, later pressure can breach, and the repaired gate becomes stronger',()=>{
 const r=simulate(round),bursts=r.frames.flatMap(f=>f.events).filter(e=>e.kind==='flood');assert.equal(bursts.length,1);assert.ok(bursts[0].at>58);
 const at=bursts[0].at;assert.equal(r.frames[at-1].gate.broken,false);assert.equal(r.frames[at].gate.broken,true);
 assert.ok(Math.min(...r.frames.slice(at,at+16).map(f=>f.turf.homeClean))<r.frames[at-1].turf.homeClean);
 assert.equal(r.frames.at(-1).gate.broken,false);assert.ok(r.frames.at(-1).gate.capacity>r.frames[0].gate.capacity);
 assert.equal(r.result.outcome,'restored');
});
test('both demo skies are deterministic, bounded, and settle every visitor',()=>{
 for(const weather of ['violet','coral']){const input={...round,weather},r=simulate(input);assert.deepEqual(simulate(input),r);assert.equal(r.frames.length,211);assert.equal(r.result.turned+r.result.arrived+r.result.wandered,30);assert.ok(Math.max(...r.frames.map(f=>f.enemies.length))<=20);assert.ok(r.frames.every(f=>f.crew.length===5&&f.events.length<60));assert.ok(r.result.homeClean>=92);}
 assert.notEqual(simulate(round).frames[100].turf.owners,simulate({...round,weather:'coral'}).frames[100].turf.owners);
});
test('autonomous saves freeze the encounter and settle one outing after a long absence',()=>{
 const fresh=createState(now),active=advance(fresh,now+PREPARE_MS);assert.ok(valid(active));assert.equal(active.phase,'encounter');assert.deepEqual(active.round.market,{source:'demo',change:-4.2});
 const normal=advance(active,now+PREPARE_MS+ENCOUNTER_MS),late=advance(active,now+86400000*7);assert.deepEqual(normal.memories[0].result,late.memories[0].result);assert.equal(late.memories.length,1);assert.equal(late.phase,'rest');
 assert.equal(advance(late,late.lastAt).memories.length,1);assert.deepEqual(advance(active,active.lastAt-90000),active);
 const resumed=advance(late,late.lastAt+16000);assert.equal(resumed.phase,'prepare');assert.equal(resumed.weather,'coral');assert.equal(resumed.round,null);
});
test('unsupported or incomplete saved neighborhoods are rejected',()=>{
 assert.ok(valid(createState(now)));assert.equal(valid({...createState(now),phase:'encounter'}),false);assert.equal(valid({...createState(now),weather:'live'}),false);
 const s=advance(createState(now),now+PREPARE_MS);assert.equal(valid({...s,round:{...s.round,version:99}}),false);assert.equal(valid({...s,round:{...s.round,market:{source:'live',change:-4.2}}}),false);
});
