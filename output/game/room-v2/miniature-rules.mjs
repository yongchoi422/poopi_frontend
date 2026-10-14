export const WORLD={minX:-15,maxX:15,minZ:-10,maxZ:10,step:.5};
export const BUILDINGS=[{x:0,z:6.7,w:3.8,d:2.6,h:2.0,home:true},{x:-10,z:4.9,w:2.6,d:2.8,h:3.1},{x:-6.3,z:7.5,w:2.3,d:2.2,h:2},{x:9.5,z:5.5,w:3,d:2.6,h:3.7},{x:6.4,z:7.8,w:2.1,d:2,h:2.2},{x:-11,z:-6.8,w:2.5,d:2.4,h:3.8},{x:10.7,z:-6.9,w:2.7,d:2.8,h:4.4}];
export const CREW=[{id:0,sample:0,name:'Gm fren',role:'Gatekeeper',job:'guard',x:-2.3,z:-.65},{id:1,sample:1,name:'Sir HODL',role:'Gatekeeper',job:'guard',x:2.3,z:-.65},{id:2,sample:3,name:'Cozy degen',role:'Street washer',job:'wash',x:-5,z:2.4},{id:3,sample:5,name:'Lil moon',role:'Street washer',job:'wash',x:5,z:2.4},{id:4,sample:4,name:'Grass toucher',role:'Gate mender',job:'repair',x:0,z:1.7}];
export const SKIES={violet:{name:'Violet tide',ink:'#7939ec',highlight:'#dfbfff',change:-4.2},coral:{name:'Coral shower',ink:'#ec5078',highlight:'#ffe5bc',change:4.2}};
export const CELLS=[];
for(let row=0;row<40;row++)for(let col=0;col<60;col++){
 const x=WORLD.minX+(col+.5)*.5,z=WORLD.minZ+(row+.5)*.5;
 if(BUILDINGS.some(b=>Math.abs(x-b.x)<b.w/2&&Math.abs(z-b.z)<b.d/2))continue;
 if(Math.abs(z+2)<.4&&Math.abs(x)>1.65)continue;
 CELLS.push({x,z,row,col});
}
export function paint(cells,x,z,radius,side){let n=0;for(let i=0;i<CELLS.length;i++){const c=CELLS[i];if((c.x-x)**2+(c.z-z)**2>radius*radius)continue;if(side===1&&cells[i]!==2)continue;if(cells[i]!==side){cells[i]=side;n++;}}return n;}
export function summary(cells){let dirty=0,cleaned=0,inside=0,insideDirty=0;cells.forEach((v,i)=>{if(v===2)dirty++;if(v===1)cleaned++;if(CELLS[i].z>-1.6){inside++;if(v===2)insideDirty++;}});const percent=(n,d)=>Math.round(n/d*1000)/10;return {owners:cells.join(''),total:cells.length,dirtyCells:dirty,cleanedCells:cleaned,clean:percent(cells.length-dirty,cells.length),homeClean:percent(inside-insideDirty,inside),pollution:percent(dirty,cells.length),restoration:true};}
export const preview=()=>summary(new Array(CELLS.length).fill(0));
const GATE_P=.48;
function path(lane,p){const x=[-8,0,8][lane];if(p<GATE_P){const t=p/GATE_P;return {x:x*(1-t),z:-9+6.2*t};}const t=(p-GATE_P)/(1-GATE_P);return {x:Math.sin(t*Math.PI)*([-.6,.4,.8][lane]),z:-2.8+t*8.0};}
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
function move(a,b,speed){const d=distance(a,b),t=Math.min(1,speed/Math.max(.001,d));a.x+=(b.x-a.x)*t;a.z+=(b.z-a.z)*t;}

export function simulate(round,{guards=true,cleaners=true,mender=true}={}){
 if(round.version!==1||!SKIES[round.weather])throw Error('Unsupported miniature encounter');
 const cells=new Array(CELLS.length).fill(0),crew=CREW.map(a=>({...a,action:'On watch',contribution:0}));
 const gate={pressure:0,capacity:80,broken:false,repair:0,brokenAt:null,breaches:0,repairs:0},enemies=[],frames=[];
 let random=round.seed>>>0,eventId=0,turned=0,arrived=0,knockbacks=0;
 const rand=()=>{random=(Math.imul(random,1664525)+1013904223)>>>0;return random/4294967296;};
 for(let wave=0;wave<3;wave++)for(let n=0;n<[6,16,8][wave];n++)enemies.push({id:enemies.length,lane:n%3,spawn:[5,58,124][wave]+n*[5,1.15,2.5][wave],wave:wave+1,hp:wave===1?12:6,kind:n%3===0?'dust':round.weather==='coral'?'moth':'shadow',progress:0,pace:.014+rand()*.002+(round.weather==='coral'?.002:0),active:false,done:false,x:0,z:0,hit:0});
 for(let second=0;second<=210;second++){
  const events=[],emit=(kind,side,from,to,radius,source,extra={})=>events.push({id:eventId++,at:second,kind,side,from:{x:from.x,y:from.y??.85,z:from.z},to:{x:to.x,y:to.y??.1,z:to.z},radius,source,...extra});
  let crowd=0;
  for(const e of enemies){
   e.hit=0;if(e.done||second<e.spawn)continue;e.active=true;
   const before=e.progress;e.progress+=e.pace;let queued=false;
   if(!gate.broken&&before<=GATE_P+.001&&e.progress>=GATE_P){e.progress=GATE_P;crowd++;queued=true;}
   Object.assign(e,path(e.lane,e.progress));
   if(queued){e.x=(e.lane-1)*.75;e.z-=Math.floor((crowd-1)/3)*.48;}
   paint(cells,e.x,e.z,round.weather==='violet'?.66:.43,2);
   if(second%10===e.id%10){const a=rand()*Math.PI*2,r=round.weather==='coral'?1.5:.65,to={x:e.x+Math.cos(a)*r,z:e.z+Math.sin(a)*r};if(to.z<-2.5||gate.broken||e.progress>GATE_P+.02){paint(cells,to.x,to.z,.65,2);emit('shot',2,e,to,.65,e.kind);}}
  }
  if(!gate.broken){gate.pressure=Math.max(0,Math.min(gate.capacity,gate.pressure+crowd*3.2-.8));if(crowd)paint(cells,0,-3.3,.65+gate.pressure/gate.capacity*1.2,2);}
  if(!gate.broken&&gate.pressure>=gate.capacity){gate.broken=true;gate.brokenAt=second;gate.breaches++;gate.repair=0;emit('flood',2,{x:0,z:-2.4},{x:0,z:4.8},3,'gate',{duration:14});}
  if(gate.broken&&second-gate.brokenAt<=14){const p=(second-gate.brokenAt)/14;paint(cells,0,-2.4+7.2*p,1.45+p*1.75,2);}
  const active=()=>enemies.filter(e=>e.active&&!e.done&&e.hp>0);
  for(const a of crew){
   a.action='On watch';let target={x:CREW[a.id].x,z:CREW[a.id].z};
   if(a.job==='guard'&&guards){
    target.z=gate.broken?.8:-.65;move(a,target,.5);
    const targets=active().filter(e=>distance(e,a)<7.5).sort((u,v)=>v.progress-u.progress||u.hp-v.hp);
    if(targets.length&&second%4===a.id*2){const e=targets[a.id%Math.min(2,targets.length)];e.hp-=2.4;e.progress=Math.max(0,e.progress-.045);Object.assign(e,path(e.lane,e.progress));e.hit=1;knockbacks++;a.contribution++;a.action='Pushing the tide back';paint(cells,e.x,e.z,1.1,1);emit('shot',1,a,e,1.1,'guard',{actor:a.id});}
   }else if(a.job==='wash'&&cleaners){
    const dirty=CELLS.filter((c,i)=>cells[i]===2&&c.z>-1.6&&(a.id===2?c.x<.4:c.x>-.4)).sort((u,v)=>distance(u,a)-distance(v,a));
    if(dirty.length){target=dirty[0];a.action='Washing the street';}else{target={x:CREW[a.id].x+Math.sin(second/13+a.id)*1.1,z:CREW[a.id].z+Math.cos(second/17)*.7};a.action='Checking the neighborhood';}
    move(a,target,.42);const washed=paint(cells,a.x,a.z,1.2,1);a.contribution+=washed;
    if(washed&&second%2===0)emit('pulse',1,a,a,1.4,'washer',{actor:a.id});
    const e=active().filter(e=>e.z>-1.6&&distance(e,a)<4.5).sort((u,v)=>distance(u,a)-distance(v,a))[0];
    if(e&&second%4===a.id-2){e.hp-=2;e.hit=1;a.action='Rinsing a stray visitor';emit('shot',1,a,e,.9,'washer',{actor:a.id});paint(cells,e.x,e.z,.9,1);}
   }else if(a.job==='repair'&&mender){
    target={x:0,z:gate.pressure>5||gate.broken?-.65:1.8};move(a,target,.45);
    if(distance(a,{x:0,z:-.65})<.5){
     if(gate.broken){a.action='Mending the gate';if(second-gate.brokenAt>16){gate.repair=Math.min(100,gate.repair+3.3);a.contribution+=3.3;if(second%5===0)emit('pulse',1,a,{x:0,z:-2},1.3,'repair',{actor:a.id});if(gate.repair>=100){gate.broken=false;gate.pressure=0;gate.capacity=120;gate.repairs++;emit('pulse',1,a,{x:0,z:-2},2.5,'gate-repaired',{actor:a.id});}}}
     else if(gate.pressure>0){gate.pressure=Math.max(0,gate.pressure-1.5);a.contribution+=1.5;a.action='Relieving the pressure';if(second%6===0)emit('pulse',1,a,{x:0,z:-2},.8,'repair',{actor:a.id});}
    }
   }
  }
  for(const e of active()){if(e.progress>=1){e.done=true;arrived++;paint(cells,0,4.9,1.8,2);emit('splash',2,e,{x:0,z:4.9},1.8,'arrival');}}
  for(const e of enemies){if(e.active&&!e.done&&e.hp<=0){e.done=true;turned++;paint(cells,e.x,e.z,.8,1);emit('splash',1,e,e,.8,'cleared');}}
  frames.push({second,wave:second<55?1:second<120?2:3,crew:crew.map(a=>({...a})),gate:{...gate},enemies:active().map(e=>({...e})),events,turf:summary(cells),turned,arrived,knockbacks});
 }
 frames.at(-1).enemies=[];
 const last=frames.at(-1);return {frames,result:{homeClean:last.turf.homeClean,clean:last.turf.clean,breaches:gate.breaches,repairs:gate.repairs,turned,arrived,wandered:enemies.filter(e=>!e.done).length,knockbacks,crew:crew.map(a=>({id:a.id,contribution:Math.round(a.contribution)})),outcome:last.turf.homeClean>=92&&!gate.broken?'restored':'settling'}};
}

export const PREPARE_MS=8000,ENCOUNTER_MS=45000,REST_MS=16000;
export function createState(now=Date.now()){return {version:1,revision:0,createdAt:now,lastAt:now,phase:'prepare',phaseAt:now,weather:'violet',roundNumber:0,round:null,memories:[]};}
export function valid(s){return !!s&&s.version===1&&Number.isInteger(s.revision)&&s.revision>=0&&[s.createdAt,s.lastAt,s.phaseAt].every(Number.isFinite)&&['prepare','encounter','rest'].includes(s.phase)&&Object.hasOwn(SKIES,s.weather)&&Number.isInteger(s.roundNumber)&&s.roundNumber>=0&&Array.isArray(s.memories)&&s.memories.length<=24&&s.memories.every(m=>m&&typeof m.id==='string'&&Number.isFinite(m.at)&&m.result&&Number.isFinite(m.result.homeClean))&&(!s.round||(s.round.version===1&&typeof s.round.id==='string'&&Number.isFinite(s.round.startedAt)&&Number.isInteger(s.round.seed)&&Object.hasOwn(SKIES,s.round.weather)&&s.round.market?.source==='demo'&&s.round.market.change===SKIES[s.round.weather].change))&&(s.phase==='prepare'||!!s.round);}
export function advance(input,now=Date.now()){
 const s=structuredClone(input),time=Math.max(s.lastAt,now);s.lastAt=time;
 if(s.phase==='rest'&&time>=s.phaseAt+REST_MS){s.phase='prepare';s.phaseAt=time;s.weather=s.weather==='violet'?'coral':'violet';s.round=null;}
 if(s.phase==='prepare'&&time>=s.phaseAt+PREPARE_MS){s.roundNumber++;s.round={version:1,id:`mini-${s.createdAt}-${s.roundNumber}`,startedAt:s.phaseAt+PREPARE_MS,weather:s.weather,seed:422+s.roundNumber,market:{source:'demo',change:SKIES[s.weather].change}};s.phase='encounter';s.phaseAt=s.round.startedAt;}
 if(s.phase==='encounter'&&time>=s.phaseAt+ENCOUNTER_MS){const result=simulate(s.round).result;if(!s.memories.some(m=>m.id===s.round.id))s.memories=[{id:s.round.id,at:s.phaseAt+ENCOUNTER_MS,weather:s.round.weather,result},...s.memories].slice(0,24);s.phase='rest';s.phaseAt+=ENCOUNTER_MS;if(time>=s.phaseAt+REST_MS)s.phaseAt=time;}
 return s;
}
export const nextAt=s=>s.phaseAt+({prepare:PREPARE_MS,encounter:ENCOUNTER_MS,rest:REST_MS}[s.phase]);
