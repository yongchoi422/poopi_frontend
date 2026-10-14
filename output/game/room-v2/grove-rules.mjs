// Private prototype rules. No token rewards or server-certified scores.
import {simulatePaintEncounter} from './grove-combat.mjs';
import {simulateRooftop} from './rooftop-combat.mjs';
import {MARKET_SKIES} from './rooftop-surface.mjs';
export const RULES_VERSION=3;
export const EXPLORE_MS=16_000;
export const ROUND_MS=30_000; // A clearly labelled 6x preview of 180 logical seconds.
export const RETURN_MS=5_000;
export const PREPARE_MS=9_000;
export const REST_MS=20_000;
const PREPARE_STEP_MS=PREPARE_MS/3;
export const SLOTS=[
  {id:0,name:'West gate',x:-4.2,z:-.9},{id:1,name:'West bend',x:-2.7,z:.25},
  {id:2,name:'East gate',x:4.2,z:-.9},{id:3,name:'East bend',x:2.7,z:.25},
  {id:4,name:'Inner west',x:-1.4,z:1.8},{id:5,name:'Inner east',x:1.4,z:1.8},
];
export const TOOLS={
  lantern:{name:'Sprout lantern',short:'Lantern',hint:'Reveals shadows. Guides them away.',color:'#e7c77d'},
  chime:{name:'Wind chime',short:'Chime',hint:'Pushes a nearby cluster back.',color:'#9acbbb'},
  fence:{name:'Root fence',short:'Fence',hint:'Slows a narrow stretch of the path.',color:'#cb9671'},
  bowl:{name:'Moon bowl',short:'Bowl',hint:'Lures light moths. Buffers the beacon.',color:'#b7abe8'},
};
export const PATHS=[
  [[-6,-2.8],[-4.35,-.7],[-3.5,.7],[-1.8,1.35],[0,2]],
  [[6,-2.8],[4.35,-.7],[3.5,.7],[1.8,1.35],[0,2]],
];
export const PRESETS={balanced:{0:'lantern',3:'chime',4:'fence'},fog:{1:'fence',3:'chime',4:'lantern'},aurora:{0:'chime',1:'fence',2:'bowl'}};
const copy=value=>JSON.parse(JSON.stringify(value));
export function pathPoint(lane,progress){
  const path=PATHS[lane],p=Math.max(0,Math.min(.999999,progress))*(path.length-1),i=Math.floor(p),t=p-i;
  return {x:path[i][0]+(path[i+1][0]-path[i][0])*t,z:path[i][1]+(path[i+1][1]-path[i][1])*t};
}
export function validLayout(value){
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  const entries=Object.entries(value);
  return entries.length<=3&&new Set(entries.map(([,v])=>v)).size===entries.length&&entries.every(([k,v])=>/^\d$/.test(k)&&SLOTS[+k]&&Object.hasOwn(TOOLS,v));
}
export function placeTool(layout,slot,type){
  if(!SLOTS[slot]||!Object.hasOwn(TOOLS,type))throw Error('Unknown clearing or tool');
  const next={...layout};
  for(const [key,value] of Object.entries(next))if(value===type)delete next[key];
  if(next[slot]===undefined&&Object.keys(next).length>=3)throw Error('Three tools fit here. Choose an occupied clearing to replace one.');
  next[slot]=type;
  return next;
}
export function createState(now=Date.now(),scene='grove'){
  return {schemaVersion:1,revision:0,scene,createdAt:now,lastAt:now,autoplay:true,phase:'explore',phaseAt:now,soulIndex:0,weather:'fog',layout:{},discovered:false,roundNumber:0,round:null,memories:[]};
}
export function validateState(s){
  return !!s&&s.schemaVersion===1&&Number.isInteger(s.revision)&&s.revision>=0&&Number.isFinite(s.createdAt)&&Number.isFinite(s.lastAt)&&Number.isFinite(s.phaseAt)&&
    (s.autoplay===undefined||typeof s.autoplay==='boolean')&&
    (s.scene===undefined||['grove','rooftop'].includes(s.scene))&&
    ['explore','arrange','defend','return','home'].includes(s.phase)&&['fog','aurora'].includes(s.weather)&&validLayout(s.layout)&&
    Number.isInteger(s.soulIndex)&&s.soulIndex>=0&&s.soulIndex<7&&Number.isInteger(s.roundNumber)&&s.roundNumber>=0&&typeof s.discovered==='boolean'&&
    Array.isArray(s.memories)&&s.memories.length<=24&&s.memories.every(m=>m&&typeof m.id==='string'&&typeof m.title==='string'&&typeof m.text==='string'&&Number.isFinite(m.at))&&
    (!s.round||([1,2,3].includes(s.round.rulesVersion)&&['fog','aurora'].includes(s.round.weather)&&validLayout(s.round.layout)&&Number.isFinite(s.round.startedAt)&&typeof s.round.id==='string'&&Number.isInteger(s.round.seed)&&
      (s.round.rulesVersion!==3||(s.round.scene==='rooftop'&&s.round.market?.source==='demo'&&s.round.market.change===MARKET_SKIES[s.round.weather].change))))&&
    (!['defend','return'].includes(s.phase)||!!s.round);
}
export function startRound(s,now=Date.now()){
  if(!['arrange','home'].includes(s.phase)||!s.discovered)return s;
  if(Object.keys(s.layout).length!==3)throw Error('Place three tools before the weather arrives.');
  const next=copy(s);next.roundNumber++;
  next.round={id:`round-${s.createdAt}-${next.roundNumber}`,rulesVersion:s.scene==='rooftop'?3:2,weather:s.weather,layout:{...s.layout},startedAt:Math.max(now,s.lastAt),seed:422};
  if(s.scene==='rooftop'){next.round.scene='rooftop';next.round.market={source:'demo',change:MARKET_SKIES[s.weather].change};}
  next.phase='defend';next.phaseAt=next.round.startedAt;next.lastAt=next.phaseAt;
  return next;
}
function addMemory(s,memory){if(!s.memories.some(m=>m.id===memory.id))s.memories=[memory,...s.memories].slice(0,24);}
export function completeRound(input,now=Date.now()){
  if(input.phase!=='defend')return copy(input);
  const s=copy(input),result=simulateDefense(s.round).result;
  s.phase='return';s.phaseAt=Math.max(s.round.startedAt,now);s.lastAt=Math.max(s.lastAt,s.phaseAt);
  addMemory(s,{id:s.round.id,kind:s.round.weather,title:result.restoration?(result.outcome==='restored'?'The rooftop lights came back.':'A little mess. A very small hero.'):result.turf?(result.outcome==='bloomed'?'A little more of our color.':'Wild colors. Another little try.'):result.light>=60?'The little light held.':result.light>0?'A flicker. Then a glow.':'A quiet moment to relight.',
    text:result.restoration?`${MARKET_SKIES[s.round.weather].name}. ${result.breaches} gates burst; your soul brought ${result.turf.clean}% of the rooftop back to its original colors. A little rest with the Manhattan skyline.`:result.turf?`${s.round.weather==='fog'?'The fog passed':'The sky shimmered'}. Mint ${result.turf.soul}% · violet ${result.turf.wild}%. ${result.turned} visitors guided away; ${result.light}/100 lantern light. Home is safe.`:`${s.round.weather==='fog'?'The fog passed':'The sky shimmered'}. ${result.turned} visitors guided away. ${result.light}/100 light remained. Home and discoveries are safe.`,at:s.phaseAt,result});
  return s;
}
export function advanceState(input,now=Date.now()){
  let s=copy(input);const time=Math.max(s.lastAt,Number.isFinite(now)?now:s.lastAt);
  // Add autonomy to older saves without discarding their soul or memories.
  if(s.autoplay===undefined){
    s.autoplay=true;
    if(s.phase==='arrange'){s.phaseAt=time;s.layout={};}
  }
  // A long absence settles the current outing once. A new outing starts on
  // return, never by simulating an unbounded backlog of unattended encounters.
  if(s.phase==='home'&&s.autoplay&&time>=s.phaseAt+REST_MS){
    s.phase='explore';s.phaseAt=time;s.weather=s.weather==='fog'?'aurora':'fog';s.round=null;
  }
  if(s.phase==='explore'&&time>=s.phaseAt+EXPLORE_MS){
    const firstDiscovery=!s.discovered;
    s.discovered=true;s.phase='arrange';s.phaseAt+=EXPLORE_MS;
    if(s.autoplay)s.layout={};
    if(firstDiscovery)addMemory(s,{id:'first-seed',kind:'discovery',title:s.scene==='rooftop'?'A key to a little rooftop.':'A very important seed.',text:s.scene==='rooftop'?'Found a quiet corner above Manhattan. The Empire State Building is keeping company.':'Found a little light in the moss. Carried it all the way home.',at:s.phaseAt});
  }
  if(s.phase==='arrange'&&s.autoplay){
    const count=Math.min(3,Math.floor(Math.max(0,time-s.phaseAt)/PREPARE_STEP_MS));
    s.layout=Object.fromEntries(Object.entries(PRESETS[s.weather]).slice(0,count));
    if(time>=s.phaseAt+PREPARE_MS)s=startRound(s,s.phaseAt+PREPARE_MS);
  }
  if(s.phase==='defend'&&time>=s.round.startedAt+ROUND_MS){
    s=completeRound(s,s.round.startedAt+ROUND_MS);
  }
  if(s.phase==='return'&&time>=s.phaseAt+RETURN_MS){
    s.phase='home';s.phaseAt+=RETURN_MS;
    if(s.autoplay&&time>=s.phaseAt+REST_MS)s.phaseAt=time;
  }
  // lastAt is advanced on a persisted transition or user action, never each frame.
  s.lastAt=time;return s;
}
export function setAutoplay(input,enabled,now=Date.now()){
  const s=copy(input),time=Math.max(s.lastAt,now);
  if(s.autoplay===enabled)return s;
  s.autoplay=enabled;s.lastAt=time;
  if(enabled&&s.phase==='arrange'){s.phaseAt=time;s.layout={};}
  if(enabled&&s.phase==='home')s.phaseAt=time;
  // An encounter already in progress keeps its exact frozen inputs.
  return s;
}
export function nextTransitionAt(s){
  if(s.phase==='explore')return s.phaseAt+EXPLORE_MS;
  if(s.phase==='arrange'&&s.autoplay)return s.phaseAt+Math.min(3,Object.keys(s.layout).length+1)*PREPARE_STEP_MS;
  if(s.phase==='defend')return s.round.startedAt+ROUND_MS;
  if(s.phase==='return')return s.phaseAt+RETURN_MS;
  if(s.phase==='home'&&s.autoplay)return s.phaseAt+REST_MS;
  return Infinity;
}
export function simulateDefense(round){
  if(![1,2,3].includes(round.rulesVersion)||!validLayout(round.layout))throw Error('Unsupported encounter');
  if(round.rulesVersion===3)return simulateRooftop(round,{slots:SLOTS,pathPoint});
  if(round.rulesVersion===2)return simulatePaintEncounter(round,{slots:SLOTS,pathPoint});
  const tools=Object.entries(round.layout).map(([slot,type])=>({...SLOTS[+slot],type}));
  const isAurora=round.weather==='aurora';
  const enemies=[];let n=0,random=round.seed>>>0;
  const rand=()=>{random=(Math.imul(random,1664525)+1013904223)>>>0;return random/4294967296;};
  for(let wave=0;wave<3;wave++)for(let i=0;i<(wave===2?8:6);i++){
    const kind=isAurora?(i%3===0?'dust':'moth'):(i%3===0?'dust':'shadow');
    enemies.push({id:n++,wave:wave+1,lane:i%2,spawn:wave*58+5+i*3,kind,hp:kind==='shadow'?6:kind==='moth'?5:3,progress:0,pace:.025+rand()*.005,active:false,done:false,x:0,z:0,revealed:kind!=='shadow',lure:null});
  }
  let light=100,turned=0,arrived=0,absorbed=0;
  let shield=tools.some(t=>t.type==='bowl'&&Math.hypot(t.x,t.z-2)<2.6)?16:0;
  const frames=[];
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
  for(let second=0;second<=180;second++){
    const pulses=[];let guardianUsed=false;
    for(const enemy of enemies){
      if(enemy.done||second<enemy.spawn)continue;
      enemy.active=true;
      const before=pathPoint(enemy.lane,enemy.progress);
      if(!enemy.lure){enemy.x=before.x;enemy.z=before.z;}
      const nearby=tools.filter(t=>distance(enemy,t)<(t.type==='bowl'?2.6:t.type==='lantern'?2.3:t.type==='chime'?1.75:1.25));
      if(enemy.kind==='shadow'&&nearby.some(t=>t.type==='lantern'))enemy.revealed=true;
      if(enemy.kind==='moth'&&!enemy.lure){const bowl=nearby.find(t=>t.type==='bowl');if(bowl)enemy.lure={x:bowl.x,z:bowl.z};}
      for(const t of nearby){
        if(t.type==='lantern'&&!isAurora&&second%3===0){enemy.hp--;pulses.push({slot:t.id,type:t.type});}
        if(t.type==='chime'&&second%5===0){enemy.progress=Math.max(0,enemy.progress-.075);if(enemy.revealed)enemy.hp--;pulses.push({slot:t.id,type:t.type});}
      }
      if(distance(enemy,{x:0,z:2})<1.5)enemy.revealed=true;
      if(distance(enemy,{x:0,z:2})<1.9&&enemy.revealed&&second%3===0&&!guardianUsed){enemy.hp--;guardianUsed=true;}
      if(enemy.lure){
        const d=distance(enemy,enemy.lure);
        if(d<.3){enemy.hp=0;absorbed++;}
        else {enemy.x+=(enemy.lure.x-enemy.x)/d*.29;enemy.z+=(enemy.lure.z-enemy.z)/d*.29;}
      }else{
        enemy.progress+=enemy.pace*(isAurora?1.28:1)*(nearby.some(t=>t.type==='fence')?.37:1);
        const point=pathPoint(enemy.lane,enemy.progress);enemy.x=point.x;enemy.z=point.z;
      }
      if(enemy.hp<=0){enemy.done=true;enemy.active=false;turned++;continue;}
      if(enemy.progress>=1&&!enemy.lure){
        const damage=enemy.kind==='dust'?6:9,buffer=Math.min(shield,damage);shield-=buffer;light=Math.max(0,light-damage+buffer);
        enemy.done=true;enemy.active=false;arrived++;
      }
    }
    frames.push({second,wave:Math.min(3,Math.floor(second/58)+1),light,turned,arrived,shield,pulses,enemies:enemies.filter(e=>e.active&&!e.done).map(e=>({id:e.id,kind:e.kind,x:e.x,z:e.z,revealed:e.revealed,lured:!!e.lure,hp:e.hp}))});
  }
  // Remaining visitors wander off when the weather clears, not as a player kill.
  const wandered=enemies.filter(e=>!e.done).length;
  frames.at(-1).enemies=[];
  return {frames,result:{light,turned,arrived,absorbed,wandered,outcome:light>=60?'held':light>0?'flickered':'relit'}};
}
