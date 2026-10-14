import {prepareOriginal} from './grove-originals.mjs';
import {CREW} from './miniature-rules.mjs';
import {makeStory,sampleStory,CYCLE} from './plaza-timeline.mjs';
import {createPlazaWorld} from './plaza-world.mjs';
import {createPlazaAudio} from './plaza-audio.mjs';
import {
 IDLE_STORAGE_KEY,UPGRADES,EVOLUTION_TIERS,createIdleState,activeUpgrades,
 upgradeCount,passiveRatePerCycle,collectNearPosition,collectAllDrops,
 buyUpgrade,toggleMaxPreview,setEvolutionLevel,triggerSplash,cheerSoul,
 stepIdleWorld,serializeIdleState,restoreIdleState
} from './plaza-idle.mjs';

const $=s=>document.querySelector(s),set=(s,v)=>{const el=$(s);if(el&&el.textContent!==v)el.textContent=v;};
const samples=await fetch('./soul-samples.json').then(r=>r.json()),originals=samples.map(prepareOriginal);

const audio=createPlazaAudio(),media=matchMedia('(prefers-reduced-motion: reduce)');
let userStill=false,paused=false,elapsed=0,weather='violet',run=makeStory(weather),last=null,raf=0,lastDraw=0,lastSave=0,selected=-1,stats={},toastTimer,cycleNumber=0,disposed=false;

let idle=createIdleState();
try{
 const saved=restoreIdleState(localStorage.getItem(IDLE_STORAGE_KEY));
 if(saved)idle=saved;
}catch{}

function saveIdle(){
 try{localStorage.setItem(IDLE_STORAGE_KEY,serializeIdleState(idle));}catch{}
 lastSave=Date.now();
}

function toast(message){set('.toast',message);$('.toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('.toast').hidden=true,3200);}

let world;
try{
 world=createPlazaWorld($('.stage'),originals,{
  onStageClick(hit){
   if(hit.kind==='soul'){
    const bonus=cheerSoul(idle,hit.soulId,hit.x,hit.z,elapsed);
    audio.playEvolution(idle.evoLevel);
    toast(`${CREW[hit.soulId]?.name||'Soul'} cheered! +${bonus} ✦ Sparks popped.`);
    syncIdleUI();draw(true);saveIdle();
   }else{
    const res=triggerSplash(idle,hit.x,hit.z,elapsed);
    audio.playSplash();
    toast(res.swept?`Hydro Splash! Collected +${res.swept} ✦ & spawned fresh sparks.`:'Hydro Splash! Bonus sparks popped on the square.');
    syncIdleUI();draw(true);saveIdle();
   }
  },
  onHoverGround(x,z){
   const res=collectNearPosition(idle,x,z,2.1,elapsed);
   if(res.count>0){
    audio.playGem();
    syncIdleUI();draw(true);
   }
  }
 });
}catch(error){
 $('.loading strong').textContent='This little world needs WebGL.';
 $('.loading span').textContent='Try a browser with hardware acceleration enabled.';
 throw error;
}

const urls=new Set(),effectiveStill=()=>userStill||media.matches;

function renderIdleStateView(){
 return {
  ...idle,
  activeUpgrades:activeUpgrades(idle),
  builtCount:upgradeCount(idle),
  ratePerCycle:passiveRatePerCycle(idle)
 };
}

// Build Upgrade Cards DOM
const upgradeButtons=new Map();
UPGRADES.forEach(u=>{
 const b=document.createElement('button');
 b.type='button';b.className='upgrade-btn';b.dataset.upgrade=u.id;
 const top=document.createElement('div');top.className='up-top';
 const step=document.createElement('span');step.textContent=`${u.step} · +${u.rate}/cycle`;
 const cost=document.createElement('span');cost.className='up-cost';cost.textContent=`✦ ${u.cost}`;
 top.append(step,cost);
 const name=document.createElement('span');name.className='up-name';name.textContent=u.name;
 const desc=document.createElement('span');desc.className='up-desc';desc.textContent=u.summary;
 b.append(top,name,desc);
 b.onclick=()=>{
  if(idle.upgrades[u.id]){
   toast(`${u.name} is active in the square!`);
   return;
  }
  const built=buyUpgrade(idle,u.id,elapsed);
  if(built){
   audio.playUpgrade();
   toast(built.story);
   syncIdleUI();draw(true);saveIdle();
  }else{
   toast(`Need ✦ ${u.cost} Sparks (${Math.max(0,u.cost-idle.sparks)} more). Tap the square or collect gems!`);
  }
 };
 $('#upgrade-grid')?.append(b);
 upgradeButtons.set(u.id,{button:b,cost});
});

// Build Lv.1 - Lv.5 Evolution Showcase DOM
const evoButtons=new Map();
EVOLUTION_TIERS.forEach(tier=>{
 const b=document.createElement('button');
 b.type='button';b.className='evo-btn';b.dataset.evoLevel=String(tier.level);
 b.setAttribute('aria-pressed',String(idle.evoLevel===tier.level));
 const st=document.createElement('strong');st.textContent=tier.badge;
 const sm=document.createElement('small');sm.textContent=tier.tokens;
 b.append(st,sm);
 b.onclick=()=>{
  const chosen=setEvolutionLevel(idle,tier.level,elapsed);
  if(chosen){
   audio.playEvolution(chosen.level);
   toast(`3D Evolution Preview: ${chosen.badge} (${chosen.tokens})`);
   syncIdleUI();draw(true);saveIdle();
  }
 };
 $('#evo-tiers')?.append(b);
 evoButtons.set(tier.level,b);
});

function syncIdleUI(){
 const u=activeUpgrades(idle),builtCount=upgradeCount(idle),rate=passiveRatePerCycle(idle);
 const uncollected=idle.drops.filter(d=>d.collectedAt===null).length;
 set('#stage-sparks',`✦ ${idle.sparks} Sparks`);
 set('#stage-rate',`+${rate}/cycle · ${builtCount}/4 built`);
 set('#bank-sparks',`✦ ${idle.sparks} Sparks`);
 set('#collect-gems',uncollected>0?`Collect gems (${uncollected})`:'Collect gems');
 const maxBtn=$('#max-preview');
 if(maxBtn)maxBtn.setAttribute('aria-pressed',String(idle.maxPreview));
 UPGRADES.forEach(item=>{
  const entry=upgradeButtons.get(item.id);
  if(!entry)return;
  const isBuilt=!!u[item.id];
  entry.button.dataset.built=String(isBuilt);
  entry.button.dataset.affordable=String(!isBuilt&&idle.sparks>=item.cost);
  entry.cost.textContent=idle.upgrades[item.id]?'Built ✓':idle.maxPreview?'Preview ✓':`✦ ${item.cost}`;
 });
 const tier=EVOLUTION_TIERS.find(t=>t.level===idle.evoLevel)||EVOLUTION_TIERS[2];
 set('#evo-badge-label',`Previewing ${tier.badge}`);
 set('#evo-title',`${tier.badge} · ${tier.name} (${tier.tokens})`);
 set('#evo-desc',tier.tagline);
 evoButtons.forEach((btn,lvl)=>btn.setAttribute('aria-pressed',String(lvl===idle.evoLevel)));
}

$('#collect-gems')?.addEventListener('click',()=>{
 const res=collectAllDrops(idle,elapsed);
 if(res.count>0){
  audio.playGem();
  toast(`Collected +${res.gained} ✦ Sparks from ${res.count} crystal${res.count>1?'s':''}!`);
 }else{
  const bonus=triggerSplash(idle,0,1.6,elapsed);
  audio.playSplash();
  toast('Fresh crystal sparks splashed onto the square!');
 }
 syncIdleUI();draw(true);saveIdle();
});

$('#max-preview')?.addEventListener('click',()=>{
 const on=toggleMaxPreview(idle,elapsed);
 audio.playUpgrade();
 toast(on?'Full 3D Sanctuary Preview enabled! All 4 structures are now visible.':'Returned to your personal Sanctuary build progress.');
 syncIdleUI();draw(true);
});

function draw(force=false){
 const data=sampleStory(run,elapsed);
 stepIdleWorld(idle,data,elapsed);
 const idleView=renderIdleStateView();
 stats=world.draw(data,elapsed,effectiveStill(),weather,force,idleView);
 stats.sparks=idle.sparks;
 stats.evoLevel=idle.evoLevel;
 stats.builtUpgrades=idleView.builtCount;
 stats.activeUpgrades=idleView.activeUpgrades;
 audio.update(data);
 syncIdleUI();
 set('#story-title',selected>=0?CREW[selected].name:data.chapter);
 set('#story-detail',selected>=0?data.crew[selected].action:data.detail);
 set('#chapter',`${data.phase==='rest'?'A LITTLE PEACE':data.gate.broken?'ALL HANDS ON DECK':'A LITTLE DAY'} / ${String(cycleNumber+1).padStart(2,'0')}`);
 $('.story').dataset.broken=String(data.gate.broken);
 $('.timeline').style.transform=`scaleX(${(elapsed%CYCLE)/CYCLE})`;
 return data;
}

function frame(now){
 raf=0;if(disposed||document.hidden||paused)return;
 if(last!==null)elapsed+=Math.min((now-last)/1000,.25);
 last=now;
 const cycle=Math.floor(elapsed/CYCLE);
 if(cycle!==cycleNumber){
  cycleNumber=cycle;
  weather=weather==='violet'?'coral':'violet';
  run=makeStory(weather);
  const cycleBonus=passiveRatePerCycle(idle);
  idle.sparks+=cycleBonus;idle.totalEarned+=cycleBonus;
  updateWeather();saveIdle();
 }
 if(now-lastDraw>=1000/30){draw();lastDraw=now;}
 if(Date.now()-lastSave>4000)saveIdle();
 raf=requestAnimationFrame(frame);
}

function start(){last=null;if(!document.hidden&&!paused&&!disposed&&!raf)raf=requestAnimationFrame(frame);}
function stop(){cancelAnimationFrame(raf);raf=0;last=null;}
function updateWeather(){set('#weather-name',weather==='violet'?'Violet tide':'Coral shower');$('.weather-dot').style.background=weather==='violet'?'#8855bd':'#dd6c8c';}
function restart(next=weather){weather=next;run=makeStory(weather);elapsed=0;cycleNumber=0;last=null;updateWeather();draw(true);}

CREW.forEach(a=>{
 const b=document.createElement('button');b.type='button';b.className='resident';b.dataset.resident=a.id;b.setAttribute('aria-pressed','false');b.setAttribute('aria-label',`Follow ${a.name}, ${a.role}`);
 const img=new Image();img.className='portrait';img.alt='';
 img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(originals[a.sample].markup);
 const copy=document.createElement('span'),name=document.createElement('strong'),role=document.createElement('small');
 name.textContent=a.name;role.textContent=a.role;copy.append(name,role);b.append(img,copy);
 b.onclick=()=>{
  selected=selected===a.id?-1:a.id;
  world.follow(selected);
  if(selected>=0){
   cheerSoul(idle,selected,CREW[selected].x,CREW[selected].z,elapsed);
   audio.playGem();
  }
  document.querySelectorAll('.resident').forEach(btn=>btn.setAttribute('aria-pressed',String(+btn.dataset.resident===selected)));
  syncIdleUI();draw(true);
 };
 $('.crew').append(b);
});

$('#camera').onclick=()=>{world.toggleOverview();selected=-1;set('#camera',world.getStats().overview?'Whole square':'Gate view');document.querySelectorAll('.resident').forEach(b=>b.setAttribute('aria-pressed','false'));draw(true);};
$('#still').onclick=()=>{userStill=!userStill;$('#still').setAttribute('aria-pressed',String(effectiveStill()));draw(true);};
$('#sound').onclick=async()=>{try{const enabled=await audio.toggle();set('#sound',enabled?'Sound on':'Sound off');$('#sound').setAttribute('aria-pressed',String(enabled));}catch{toast('Sound is unavailable in this browser.');}};
$('#replay').onclick=()=>restart();
$('#weather').onclick=()=>{restart(weather==='violet'?'coral':'violet');toast('A new color, a new little story. Demo weather.');};

async function capture(){
 draw(true);
 const canvas=document.createElement('canvas'),source=world.renderer.domElement,scale=Math.min(1600/source.width,1528/source.height);
 canvas.width=Math.round(source.width*scale);canvas.height=Math.round(source.height*scale)+72;
 const ctx=canvas.getContext('2d');
 ctx.drawImage(source,0,0,canvas.width,canvas.height-72);
 ctx.fillStyle='#f3f3e9';ctx.fillRect(0,canvas.height-72,canvas.width,72);
 ctx.fillStyle='#244b50';ctx.font='30px Georgia';ctx.fillText('souli.',40,canvas.height-26);
 ctx.textAlign='right';ctx.font='12px system-ui';
 ctx.fillText(`THE PORCELAIN QUARTER · LV.${idle.evoLevel} SHOWCASE`,canvas.width-42,canvas.height-30);
 return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Could not capture this scene.')),'image/png'));
}

$('#photo').onclick=async()=>{try{const blob=await capture(),url=URL.createObjectURL(blob);urls.add(url);const a=document.createElement('a');a.href=url;a.download='souli-porcelain-quarter.png';a.click();setTimeout(()=>{URL.revokeObjectURL(url);urls.delete(url);},15000);toast('A little moment, saved.');}catch(e){toast(e.message);}};

const visibility=()=>{if(document.hidden){saveIdle();stop();}else start();void audio.hidden(document.hidden);};
document.addEventListener('visibilitychange',visibility);
const motion=()=>{$('#still').setAttribute('aria-pressed',String(effectiveStill()));draw(true);};
media.addEventListener('change',motion);
world.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();stop();$('.loading').hidden=false;$('.loading strong').textContent='The world needs a moment.';$('.loading span').textContent='Reload this preview to return to the square.';});

function dispose(){
 if(disposed)return;disposed=true;saveIdle();stop();clearTimeout(toastTimer);
 document.removeEventListener('visibilitychange',visibility);media.removeEventListener('change',motion);
 for(const url of urls)URL.revokeObjectURL(url);urls.clear();void audio.dispose();world.dispose();
}
window.addEventListener('pagehide',dispose,{once:true});

window.plazaLab={
 getStats:()=>structuredClone({...stats,elapsed,weather,reduced:effectiveStill(),paused,audio:audio.enabled}),
 getResult:()=>structuredClone(run.result),
 getIdleState:()=>structuredClone(renderIdleStateView()),
 seek(seconds){elapsed=Math.max(0,Math.min(CYCLE-.001,seconds));last=null;draw(true);},
 pause(){paused=true;stop();},
 resume(){paused=false;start();},
 buyUpgrade(id){const item=buyUpgrade(idle,id,elapsed);syncIdleUI();draw(true);return item;},
 setEvolutionLevel(lvl){const t=setEvolutionLevel(idle,lvl,elapsed);syncIdleUI();draw(true);return t;},
 toggleMaxPreview(){const on=toggleMaxPreview(idle,elapsed);syncIdleUI();draw(true);return on;},
 triggerSplash(x=0,z=1.5){const r=triggerSplash(idle,x,z,elapsed);syncIdleUI();draw(true);return r;},
 collectAll(){const r=collectAllDrops(idle,elapsed);syncIdleUI();draw(true);return r;},
 capture,restart,dispose,world
};

motion();syncIdleUI();$('.loading').hidden=true;draw(true);
if(idle.awayBonus>0)toast(`Welcome back! Your souls gathered +${idle.awayBonus} ✦ Sparks while you were away.`);
window.plazaReady=true;start();
