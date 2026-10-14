import {ROOF_CELLS,MARKET_SKIES,initialRoofPaint,roofPaint,roofOwner,roofSummary} from './rooftop-surface.mjs';
import {guardianPosition} from './grove-combat.mjs';

export function simulateRooftop(round,{slots,pathPoint}){
  const profile=MARKET_SKIES[round.weather],owners=initialRoofPaint();
  const tools=Object.entries(round.layout).map(([id,type])=>({...slots[+id],type}));
  const gates=[0,1].map(lane=>({lane,...pathPoint(lane,.18),pressure:0,capacity:tools.some(t=>t.type==='fence'&&(lane===0?t.x<0:t.x>0))?44:30,broken:false,brokenAt:null}));
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z),enemies=[];
  let random=round.seed>>>0;
  const rand=()=>{random=(Math.imul(random,1664525)+1013904223)>>>0;return random/4294967296;};
  for(let wave=0;wave<3;wave++)for(let i=0;i<(wave===2?8:6);i++){
    const kind=i%3===0?'dust':round.weather==='aurora'?'moth':'shadow';
    enemies.push({id:enemies.length,lane:i%2,spawn:wave*53+4+i*4,kind,hp:kind==='dust'?4:6,progress:0,pace:profile.pace+rand()*.005,active:false,done:false,x:0,z:0,lure:null,revealed:true});
  }
  let turned=0,arrived=0,absorbed=0,washed=0,eventId=0;
  const frames=[];
  for(let second=0;second<=180;second++){
    const guardian=guardianPosition(second),events=[],pulses=[];
    const emit=(kind,side,from,to,radius,source,extra={})=>events.push({id:eventId++,at:second,kind,side,from:{x:from.x,y:from.y??.55,z:from.z},to:{x:to.x,y:to.y??.08,z:to.z},radius,source,...extra});
    const wash=(where,radius,source)=>{washed+=roofPaint(owners,where.x,where.z,radius,1);emit('splash',1,where,where,radius,source);};
    for(const e of enemies){
      if(e.done||second<e.spawn)continue;
      if(!e.active){e.active=true;Object.assign(e,pathPoint(e.lane,0));emit('spawn',2,e,e,.7,e.kind);}
      const gate=gates[e.lane],nearby=tools.filter(t=>distance(e,t)<(t.type==='bowl'?2.8:1.35));
      if(e.kind==='moth'&&!e.lure){const bowl=nearby.find(t=>t.type==='bowl');if(bowl)e.lure={x:bowl.x,z:bowl.z};}
      if(e.lure){const d=distance(e,e.lure);if(d<.35){e.hp=0;absorbed++;}else{e.x+=(e.lure.x-e.x)/d*.22;e.z+=(e.lure.z-e.z)/d*.22;}}
      else{
        const speed=roofOwner(owners,e.x,e.z)===2?1.08:1;
        e.progress+=e.pace*speed*(nearby.some(t=>t.type==='fence')?.45:1);
        if(!gate.broken&&e.progress>=.18){
          e.progress=.18;gate.pressure=Math.min(gate.capacity,gate.pressure+2.2);
          roofPaint(owners,gate.x+(e.lane===0?-.35:.35),gate.z-.35,.45+gate.pressure/gate.capacity*.55,2);
          if(gate.pressure>=gate.capacity){
            gate.broken=true;gate.brokenAt=second;
            emit('flood',2,{x:gate.x,y:.3,z:gate.z},{x:e.lane===0?-1.25:1.25,y:.1,z:2.75},2.25,'gate',{lane:e.lane,duration:7});
          }
        }
        Object.assign(e,pathPoint(e.lane,e.progress));
      }
      roofPaint(owners,e.x,e.z,profile.trail,2);
      if(second%9===e.id%9&&e.hp>0){
        for(let drop=0;drop<profile.scatter;drop++){
          const angle=rand()*Math.PI*2,r=round.weather==='aurora'?1.2:.6,to={x:e.x+Math.cos(angle)*r,z:e.z+Math.sin(angle)*r,y:.08};
          roofPaint(owners,to.x,to.z,profile.spray,2);emit('shot',2,{...e,y:e.kind==='moth'?.9:.5},to,profile.spray,e.kind);
        }
      }
    }
    // A breached gate sends one advancing front across real, scored floor cells.
    for(const gate of gates)if(gate.broken&&second-gate.brokenAt<=7){
      const p=(second-gate.brokenAt)/7,to={x:gate.lane===0?-1.25:1.25,z:2.75};
      roofPaint(owners,gate.x+(to.x-gate.x)*p,gate.z+(to.z-gate.z)*p,1.15+p*.55,2);
    }
    const active=()=>enemies.filter(e=>e.active&&!e.done&&e.hp>0);
    for(const tool of tools){
      const near=active().filter(e=>distance(e,tool)<(tool.type==='lantern'?3.2:tool.type==='chime'?2.2:2.8));
      if(tool.type==='lantern'&&second%4===0&&near.length){
        const e=near.sort((a,b)=>b.progress-a.progress)[0];e.hp-=2;washed+=roofPaint(owners,e.x,e.z,1.1,1);emit('shot',1,{...tool,y:1.1},e,1.1,'lantern');pulses.push({slot:tool.id,type:tool.type});
      }
      if(tool.type==='chime'&&second%8===0){
        for(const e of near){e.progress=Math.max(0,e.progress-.06);e.hp--;}
        wash(tool,1.45,'chime');emit('pulse',1,tool,tool,1.7,'chime');pulses.push({slot:tool.id,type:tool.type});
      }
      if(tool.type==='bowl'&&second%7===0){wash(tool,1.1,'bowl');pulses.push({slot:tool.id,type:tool.type});}
    }
    washed+=roofPaint(owners,guardian.x,guardian.z,.6,1);
    if(second%3===0){
      const targets=active().filter(e=>distance(e,guardian)<4.2).sort((a,b)=>distance(a,guardian)-distance(b,guardian));
      const enemy=targets[0];
      const dirty=ROOF_CELLS.filter((c,i)=>owners[i]===2&&distance(c,guardian)<4.3).sort((a,b)=>distance(a,guardian)-distance(b,guardian));
      const target=enemy||dirty[Math.min(dirty.length-1,8)];
      if(target){if(enemy)enemy.hp-=2;washed+=roofPaint(owners,target.x,target.z,1.15,1);emit('shot',1,{...guardian,x:guardian.x+.5,y:.75},target,1.15,'soul');}
    }
    for(const e of enemies){
      if(!e.active||e.done)continue;
      if(e.hp<=0){e.active=false;e.done=true;turned++;wash(e,.95,'cleared');continue;}
      if(e.progress>=1&&!e.lure){roofPaint(owners,0,2,1.25,2);emit('splash',2,{x:0,z:2},{x:0,z:2},1.25,'arrival');e.active=false;e.done=true;arrived++;}
    }
    const turf=roofSummary(owners);
    frames.push({second,wave:Math.min(3,Math.floor(second/53)+1),light:Math.round(turf.clean),turned,arrived,shield:0,washed,pulses,events,guardian,turf,gates:gates.map(g=>({...g})),enemies:enemies.filter(e=>e.active&&!e.done).map(e=>({id:e.id,kind:e.kind,x:e.x,z:e.z,lane:e.lane,hp:e.hp,revealed:true,lured:!!e.lure}))});
  }
  frames.at(-1).enemies=[];
  const turf=frames.at(-1).turf,breaches=gates.filter(g=>g.broken).length;
  return {frames,result:{light:Math.round(turf.clean),turned,arrived,absorbed,wandered:enemies.filter(e=>!e.done).length,turf,washed,breaches,restoration:true,outcome:turf.clean>=80?'restored':'another-day'}};
}
