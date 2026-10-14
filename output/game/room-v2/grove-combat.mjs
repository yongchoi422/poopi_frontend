import {TURF_CELLS,paintTurf,ownerAt,summarizeTurf} from './grove-turf.mjs';

export function guardianPosition(second){return {x:Math.sin(second/10)*3.05,z:2.65+Math.cos(second/10)**2*.55};}
export function simulatePaintEncounter(round,{slots,pathPoint}){
  const tools=Object.entries(round.layout).map(([id,type])=>({...slots[+id],type}));
  const aurora=round.weather==='aurora',owners=new Array(TURF_CELLS.length).fill(0);
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z),enemies=[];
  let random=round.seed>>>0;
  const rand=()=>{random=(Math.imul(random,1664525)+1013904223)>>>0;return random/4294967296;};
  for(let wave=0;wave<3;wave++)for(let i=0;i<(wave===2?8:6);i++){
    const kind=i%3===0?'dust':aurora?'moth':'shadow';
    enemies.push({id:enemies.length,wave:wave+1,lane:i%2,spawn:wave*57+4+i*4,kind,hp:kind==='dust'?4:6,progress:0,pace:.024+rand()*.006,active:false,done:false,x:0,z:0,revealed:kind!=='shadow',lure:null});
  }
  paintTurf(owners,0,2,1.1,1);
  for(const tool of tools)paintTurf(owners,tool.x,tool.z,.6,1);
  let light=100,turned=0,arrived=0,absorbed=0,eventNumber=0;
  let shield=tools.some(t=>t.type==='bowl'&&Math.hypot(t.x,t.z-2)<2.6)?16:0;
  const frames=[];
  for(let second=0;second<=180;second++){
    const events=[],pulses=[],guardian=guardianPosition(second);
    const event=(kind,side,from,to,radius,source,targetId)=>events.push({id:eventNumber++,at:second,kind,side,from:{...from},to:{...to},radius,source,targetId});
    const splash=(where,radius,side,source)=>{paintTurf(owners,where.x,where.z,radius,side);event('splash',side,where,where,radius,source);};
    const shoot=(source,origin,target,damage,radius)=>{
      target.hp-=damage;paintTurf(owners,target.x,target.z,radius,1);
      event('shot',1,{...origin,x:origin.x+(source==='soul'?.5:0),y:source==='lantern'?1.2:.75},{x:target.x,z:target.z,y:.45},radius,source,target.id);
    };
    for(const enemy of enemies){
      if(enemy.done||second<enemy.spawn)continue;
      if(!enemy.active){
        enemy.active=true;Object.assign(enemy,pathPoint(enemy.lane,0));
        event('spawn',2,enemy,{x:enemy.x,z:enemy.z,y:.12},.8,enemy.kind,enemy.id);
      }
      const nearby=tools.filter(t=>distance(enemy,t)<(t.type==='lantern'?2.6:t.type==='bowl'?2.8:t.type==='chime'?2.1:1.3));
      if(enemy.kind==='shadow'&&(nearby.some(t=>t.type==='lantern')||distance(enemy,guardian)<2.4))enemy.revealed=true;
      if(enemy.kind==='moth'&&!enemy.lure){const bowl=nearby.find(t=>t.type==='bowl');if(bowl)enemy.lure={x:bowl.x,z:bowl.z};}
      if(enemy.lure){
        const d=distance(enemy,enemy.lure);
        if(d<.35){enemy.hp=0;absorbed++;}
        else{enemy.x+=(enemy.lure.x-enemy.x)/d*.22;enemy.z+=(enemy.lure.z-enemy.z)/d*.22;}
      }else{
        const owned=ownerAt(owners,enemy.x,enemy.z);
        const territorySpeed=owned===1?.72:owned===2?1.12:1;
        enemy.progress+=enemy.pace*(aurora?1.12:1)*territorySpeed*(nearby.some(t=>t.type==='fence')?.4:1);
        Object.assign(enemy,pathPoint(enemy.lane,enemy.progress));
      }
      // Every creature really repaints the ground it crosses.
      paintTurf(owners,enemy.x,enemy.z,enemy.kind==='shadow'?.62:.46,2);
      if(second%7===enemy.id%7&&enemy.hp>0){
        const angle=rand()*Math.PI*2,target={x:enemy.x+Math.cos(angle)*1.0,z:enemy.z+Math.sin(angle)*.8,y:.08};
        paintTurf(owners,target.x,target.z,.68,2);
        event('shot',2,{x:enemy.x,z:enemy.z,y:enemy.kind==='moth'?.9:.5},target,.68,enemy.kind,enemy.id);
      }
    }
    const active=()=>enemies.filter(e=>e.active&&!e.done&&e.hp>0);
    for(const tool of tools){
      const nearby=active().filter(e=>distance(e,tool)<(tool.type==='lantern'?3.3:tool.type==='chime'?2.2:tool.type==='bowl'?2.8:1.3));
      if(tool.type==='lantern'&&second%4===0&&nearby.length){
        const target=nearby.sort((a,b)=>b.progress-a.progress)[0];target.revealed=true;
        shoot('lantern',tool,target,aurora?1:2,.9);pulses.push({slot:tool.id,type:tool.type});
      }
      if(tool.type==='chime'&&second%9===0&&nearby.length){
        for(const enemy of nearby){enemy.progress=Math.max(0,enemy.progress-.085);if(enemy.revealed)enemy.hp--;}
        splash(tool,1.4,1,'chime');event('pulse',1,tool,tool,2.2,'chime');pulses.push({slot:tool.id,type:tool.type});
      }
      if(tool.type==='bowl'&&second%8===0&&nearby.length){splash(tool,1.15,1,'bowl');pulses.push({slot:tool.id,type:tool.type});}
    }
    // The soul wanders between the two fronts and fires at the nearest threat.
    paintTurf(owners,guardian.x,guardian.z,.47,1);
    if(second%4===0){
      const candidates=active().filter(e=>e.revealed&&distance(e,guardian)<4.0).sort((a,b)=>distance(a,guardian)-distance(b,guardian));
      if(candidates[0])shoot('soul',guardian,candidates[0],2,1.08);
    }
    for(const enemy of enemies){
      if(!enemy.active||enemy.done)continue;
      if(enemy.hp<=0){enemy.active=false;enemy.done=true;turned++;splash(enemy,.95,1,'cleared');continue;}
      if(enemy.progress>=1&&!enemy.lure){
        const damage=enemy.kind==='dust'?6:9,buffer=Math.min(shield,damage);shield-=buffer;light=Math.max(0,light-damage+buffer);
        event('beacon-hit',2,{x:enemy.x,z:enemy.z,y:.5},{x:0,z:2,y:1.8},1.25,enemy.kind,enemy.id);
        splash({x:0,z:2},1.15,2,'beacon');enemy.done=true;enemy.active=false;arrived++;
      }
    }
    frames.push({second,wave:Math.min(3,Math.floor(second/57)+1),light,turned,arrived,shield,pulses,events,guardian,turf:summarizeTurf(owners),enemies:enemies.filter(e=>e.active&&!e.done).map(e=>({id:e.id,kind:e.kind,x:e.x,z:e.z,lane:e.lane,revealed:e.revealed,lured:!!e.lure,hp:e.hp}))});
  }
  const wandered=enemies.filter(e=>!e.done).length,turf=frames.at(-1).turf;
  frames.at(-1).enemies=[];
  return {frames,result:{light,turned,arrived,absorbed,wandered,turf,outcome:light>0&&turf.winner==='soul'?'bloomed':'reseed'}};
}
