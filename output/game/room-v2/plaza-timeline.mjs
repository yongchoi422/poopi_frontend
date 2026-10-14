import {simulate,CREW,preview} from './miniature-rules.mjs';
import {logicalAtTime} from './plaza-beats.mjs';
export const INTRO=6,ENCOUNTER=62,REST=15,CYCLE=INTRO+ENCOUNTER+REST;
export function makeStory(weather='violet'){
 const run=simulate({version:1,weather,seed:423});
 for(let i=1;i<run.frames.length;i++){
  const frame=run.frames[i],previous=run.frames[i-1],rise=frame.gate.pressure-previous.gate.pressure;
  if(rise>2&&!frame.gate.broken)frame.events.push({id:`gate-${i}`,at:i,kind:'gate-hit',side:2,source:'gate',from:{x:0,z:-2.8},to:{x:0,y:.9,z:-1.75},radius:1.3,strength:Math.min(1,rise/12)});
  for(const e of frame.events)if(e.kind==='shot'&&e.side===1){const nearest=frame.enemies.slice().sort((a,b)=>Math.hypot(a.x-e.to.x,a.z-e.to.z)-Math.hypot(b.x-e.to.x,b.z-e.to.z))[0];if(nearest&&Math.hypot(nearest.x-e.to.x,nearest.z-e.to.z)<1)e.targetId=nearest.id;}
 }
 run.timingOffset=(run.frames.find(f=>f.events.some(e=>e.kind==='flood'))?.second||102)-102;
 return run;
}
export function sampleStory(run,elapsed){
 const timingOffset=run.timingOffset||0,t=Math.max(0,elapsed%CYCLE),logical=logicalAtTime(Math.max(0,t-INTRO),timingOffset);
 const index=Math.floor(logical),a=run.frames[index],b=run.frames[Math.min(210,index+1)],blend=logical-index;
 const phase=t<INTRO?'prepare':t<INTRO+ENCOUNTER?'encounter':'rest';
 const crew=phase==='prepare'?CREW.map((c,i)=>({...c,x:c.x,z:c.z+.25*Math.sin(t*.6+i),action:'Keeping a little watch',contribution:0})):a.crew.map((c,i)=>({...c,x:c.x+(b.crew[i].x-c.x)*blend,z:c.z+(b.crew[i].z-c.z)*blend,vx:b.crew[i].x-c.x,vz:b.crew[i].z-c.z}));
 const enemies=phase==='encounter'?a.enemies.map(e=>{const n=b.enemies.find(v=>v.id===e.id);return n?{...e,x:e.x+(n.x-e.x)*blend,z:e.z+(n.z-e.z)*blend}:e;}):[];
 const effects=phase==='encounter'?run.frames.slice(Math.max(0,index-18),index+1).flatMap(f=>f.events):[];
 const gate=phase==='prepare'?{pressure:0,capacity:80,broken:false,repair:0,breaches:0,repairs:0}:a.gate;
 const turf=phase==='prepare'?preview():a.turf,nextTurf=phase==='prepare'?turf:b.turf;
 // Visual erasure starts with its cleaning event, rather than disappearing early.
 const paintFrom=phase==='encounter'?run.frames[Math.max(0,index-1)].turf:turf,paintTo=turf;
 const pressure=gate.pressure/gate.capacity;
 let chapter='A quiet little watch.',detail='Five souls. One rather important gate.';
 if(phase==='encounter'){
  if(gate.broken){chapter=gate.repair>10?'A little help goes a long way.':'Oh. That was quite a lot of paint.';detail=gate.repair>10?'One mends the gate. Two bring the square back.':'The gate gave way. Everyone knows their little job.';}
  else if(gate.repairs){chapter='Back on our feet.';detail='The gate is stronger. The last splashes are almost gone.';}
  else if(pressure>.6){chapter='Hold a little longer.';detail='Something is building up behind the gate.';}
  else {chapter='Here comes a little trouble.';detail='The gatekeepers push the ink visitors back.';}
 }
 if(phase==='rest'){chapter='All in a little day’s work.';detail='A clean square. A very well-earned rest.';}
 return {t,phase,logical,index,blend,timingOffset,crew,enemies,effects,gate,turf,nextTurf,paintFrom,paintTo,pressure,chapter,detail,result:run.result};
}
