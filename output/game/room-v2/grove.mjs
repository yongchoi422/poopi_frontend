import {prepareOriginal} from './grove-originals.mjs';
import {openGroveStore} from './grove-store.mjs';
import {createState,advanceState,startRound,completeRound,simulateDefense,placeTool,setAutoplay,nextTransitionAt,TOOLS as GROVE_TOOLS,SLOTS,PRESETS,EXPLORE_MS,ROUND_MS,RETURN_MS,PREPARE_MS} from './grove-rules.mjs';
import {MARKET_SKIES,roofPreview} from './rooftop-surface.mjs';

const rooftop=document.body.dataset.scene==='rooftop',sceneName=rooftop?'rooftop':'grove';
const {createGrove}=await import(rooftop?'./rooftop-world.mjs':'./grove-world.mjs');
const TOOLS=rooftop?{lantern:{...GROVE_TOOLS.lantern,short:'Rinse lamp',hint:'Sends cleaning droplets toward the visitors.'},chime:{...GROVE_TOOLS.chime,short:'Bubble fan',hint:'Washes a circle of tiles with each ripple.'},fence:{...GROVE_TOOLS.fence,short:'Brush rail',hint:'Slows visitors and reinforces its side’s gate.'},bowl:{...GROVE_TOOLS.bowl,short:'Moon basin',hint:'Lures fluttering visitors and rinses nearby tiles.'}}:GROVE_TOOLS;

const $=selector=>document.querySelector(selector),stage=$('.stage'),loading=$('.loading');
const text=(selector,value)=>{const el=$(selector);if(el.textContent!==value)el.textContent=value;};
let state,store,world,busy=false,blocked=false,selectedTool='lantern',selectedSlot=-1,focused=false,toastTimer,simulation=null,simulationId='',lastFrame=0,raf=0;
let reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
function toast(message){text('.toast',message);$('.toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('.toast').hidden=true,4500);}
function storageError(error){$('#save-error').hidden=false;$('#save-error').textContent=error.message||String(error);text('#save-status','Save needs attention');}
const channel=typeof BroadcastChannel==='function'?new BroadcastChannel(`souli-${sceneName}-prototype`):null;
const originals=(await (await fetch('./soul-samples.json')).json()).map(prepareOriginal);
try{store=await openGroveStore({scene:sceneName});state=store.state;}catch(error){
  storageError(error);
  if(/recovery|replaced/.test(error.message)){loading.textContent=error.message;throw error;}
  state=createState(Date.now(),sceneName);text('#save-status','This visit is not saved');
  $('#save-error').textContent='Browser storage is unavailable. This visit runs in memory; export the grove before leaving.';
}
async function commit(transform,{automatic=false}={}){
  if(busy||blocked)return false;
  busy=true;refreshUI();
  try{
    const fn=old=>{const now=Math.max(Date.now(),old.lastAt);return transform(advanceState(old,now),now);};
    state=store?await store.update(fn,state.revision):fn(structuredClone(state));
    if(store){text('#save-status','Saved on this device');channel?.postMessage({revision:state.revision});}
    return true;
  }catch(error){
    if(automatic&&store&&/Another tab/.test(error.message)){
      try{state=await store.read();return false;}catch(readError){storageError(readError);return false;}
    }
    if(/Another tab/.test(error.message))blocked=true;
    if(/Three tools|three tools/.test(error.message))toast(error.message);else storageError(error);
    return false;
  }finally{busy=false;refreshUI();}
}
world=createGrove(stage,originals);
const markers=SLOTS.map(slot=>{
  const button=document.createElement('button');button.className='slot-marker';button.type='button';button.textContent=String(slot.id+1);button.dataset.slot=String(slot.id);button.setAttribute('aria-pressed','false');
  button.onclick=async()=>{selectedSlot=slot.id;const placed=await commit(s=>{if(s.autoplay||!['arrange','home'].includes(s.phase))return s;s.layout=placeTool(s.layout,slot.id,selectedTool);if(s.phase==='home')s.phase='arrange';return s;});if(placed)toast(`${TOOLS[selectedTool].short} · ${slot.name}`);};
  $('#slot-markers').append(button);return button;
});
const touchSlots=document.createElement('div');touchSlots.className='touch-slots';touchSlots.setAttribute('role','group');touchSlots.setAttribute('aria-label','Choose a clearing');
const touchButtons=SLOTS.map(slot=>{const button=document.createElement('button');button.type='button';button.className='touch-slot';button.textContent=`${slot.id+1} · ${slot.name}`;button.onclick=()=>markers[slot.id].click();touchSlots.append(button);return button;});
$('#tool-hint').after(touchSlots);
originals.forEach((s,index)=>{const option=document.createElement('option');option.value=index;option.textContent=s.name;$('#soul-select').append(option);});
$('#soul-select').onchange=event=>{const index=+event.target.value;commit(s=>{s.soulIndex=index;return s;});};
document.querySelectorAll('[data-tool]').forEach(button=>button.onclick=()=>{selectedTool=button.dataset.tool;if(focused)$('#focus-soul').click();refreshUI();});
document.querySelectorAll('[data-weather]').forEach(button=>button.onclick=()=>commit(s=>{if(!s.autoplay&&['arrange','home'].includes(s.phase)){s.weather=button.dataset.weather;s.phase='arrange';}return s;}));
document.querySelectorAll('[data-sky]').forEach(button=>button.onclick=()=>commit((s,now)=>{
  if(['defend','return'].includes(s.phase))return s;
  s.weather=button.dataset.sky;
  if(['arrange','home'].includes(s.phase)){s.phase='arrange';s.phaseAt=now;if(s.autoplay)s.layout={};}
  return s;
}));
$('#autoplay-toggle').onclick=async()=>{
  const enabled=!state.autoplay;
  if(await commit((s,now)=>setAutoplay(s,enabled,now))){selectedSlot=-1;toast(enabled?'Your soul will take it from here.':`Your turn to arrange ${rooftop?'the rooftop':'the grove'}. Any encounter already started will finish first.`);}
};
$('#focus-soul').onclick=()=>{focused=!focused;world.focusSoul(focused);$('#focus-soul').setAttribute('aria-pressed',String(focused));refreshUI();};
$('#motion-toggle').setAttribute('aria-pressed',String(reduced));
$('#motion-toggle').onclick=()=>{reduced=!reduced;$('#motion-toggle').setAttribute('aria-pressed',String(reduced));};
$('#primary-action').onclick=()=>{
  if(state.autoplay){$('#focus-soul').click();return;}
  if(['arrange','home'].includes(state.phase))commit((s,now)=>startRound(s,now));
  else if(state.phase==='defend')commit((s,now)=>completeRound(s,now));
};
$('#secondary-action').onclick=()=>{
  if(state.autoplay){openMemories();return;}
  if(state.phase==='explore'){if(!focused)$('#focus-soul').click();return;}
  if(['arrange','home'].includes(state.phase))commit(s=>{s.weather=s.weather==='fog'?'aurora':'fog';s.phase='arrange';return s;});
  else if(state.phase==='return')openMemories();
};
function openMemories(){
  const list=$('#memory-list');list.replaceChildren();
  if(!state.memories.length){const item=document.createElement('li');item.textContent='The first little memory is on its way.';list.append(item);}
  state.memories.forEach(memory=>{const item=document.createElement('li'),title=document.createElement('strong'),copy=document.createElement('p'),time=document.createElement('time');title.textContent=memory.title;copy.textContent=memory.text;time.textContent=new Date(memory.at).toLocaleString(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});item.append(title,copy,time);list.append(item);});
  $('#memories-dialog').showModal();
}
$('#memories-open').onclick=openMemories;$('#memories-close').onclick=()=>$('#memories-dialog').close();
$('#export-save').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({kind:`souli-private-${sceneName}-prototype`,exportedAt:new Date().toISOString(),state},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`souli-${sceneName}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Your little place has been exported.');};
channel?.addEventListener('message',async event=>{
  if(event.data?.revision>state.revision&&!busy){try{const latest=await store.read();if(latest){state=latest;refreshUI();}}catch(error){storageError(error);}}
});
function refreshUI(){
  if(!state)return;
  const phase=state.phase,automatic=state.autoplay!==false,editable=!automatic&&['arrange','home'].includes(phase)&&!busy&&!blocked,locked=phase==='defend'||phase==='return';
  const copy={
    explore:['01 / A little discovery','Into the moss.',"Your soul is following a small glow. Let's see what comes home.",'Taking the moss trail very seriously.','There is a little light between the roots.'],
    arrange:['02 / Make a little place','A clearing of your own.','Three tools. Two paths. A little preparation for whatever the sky brings.','Deciding where everything belongs.','Pick a tool, then a numbered clearing.'],
    defend:['03 / Keep the light',state.weather==='fog'?'A little courage.':'Follow the other light.','Your soul is keeping watch. Each tool follows the plan you left behind.','Taking the night watch very seriously.','The same little soul. A different kind of sky.'],
    return:['04 / Come home','A story to bring home.','The weather is passing. Your soul is bringing one more little memory home.','Coming home, entirely unhurried.','The grove and all its discoveries are safe.'],
    home:['04 / Come home','A little wiser.','Move a tool, change the sky, and see what your little soul does differently.','Inspecting a very ordinary pebble.','A serious responsibility. Apparently.'],
  }[phase];
  if(phase==='defend'&&state.round?.rulesVersion===2){copy[1]='A little color clash.';copy[2]='Wild visitors leave violet trails. Your soul splashes them mint again. Hold more ground and keep the lantern glowing.';copy[3]='Painting a very serious little masterpiece.';copy[4]='Mint is ours. Violet belongs to the wild visitors.';}
  if(automatic){
    if(phase==='explore'&&state.discovered)copy.splice(0,5,'01 / Out for a wander','Back into the moss.','A familiar path. Possibly a very different pebble. Your soul will be back soon.','Checking on a very important patch of moss.','The grove takes care of itself.');
    if(phase==='arrange')copy.splice(0,5,'02 / A little preparation','It has a plan.',state.weather==='fog'?'Fog is coming. Your soul brings a lantern, a chime and a root fence.':'Moths follow the aurora. Your soul sets out a moon bowl, a chime and a fence.','Finding just the right place.','Three tools. All by itself.');
    if(phase==='home')copy.splice(0,5,'04 / Time for a little rest','Nothing urgent.','The lantern is safe. A little rest, then another wander. No commands needed.','Inspecting a very ordinary pebble.','Apparently this counts as a well-earned rest.');
  }
  if(rooftop){
    const roofCopy={
      explore:['01 / A rooftop of its own','Hello, Manhattan.','A quiet terrace above the city. Your soul is checking every little corner.','Inspecting the skyline. Very seriously.','An ordinary rooftop. A rather extraordinary neighbour.'],
      arrange:['02 / Before the splashes','A little preparation.',automatic?'Your soul is setting out its tools and checking the two paint gates. No commands needed.':'Choose three tools. The gates will hold the first visitors back.','Checking the gates. Finding the mop.','Pressure builds when visitors crowd a gate.'],
      defend:['03 / A very small caretaker','A little mess. A little hero.','Visitors leave paint. Your soul washes it away to uncover the original tiles. If a gate bursts, the mess gets a little bigger.','One tiny soul. One very big cleanup.','The mint sparkle is a rinse. The tiles underneath are home.'],
      return:['04 / A familiar kind of quiet','The colors underneath.','A few splashes later, the rooftop starts looking like itself again. Your soul has earned a rest.','Putting everything back in its little place.','The city is still here. So is your soul.'],
      home:['04 / Above the city','A well-earned view.','A little rest beneath the skyline. Another strange sky, another small story.','Watching the lights. Pretending not to be tired.','A good place to come back to.'],
    }[phase];copy.splice(0,5,...roofCopy);
  }
  ['#phase-label','#phase-title','#phase-copy','#activity-text','#activity-detail'].forEach((selector,i)=>text(selector,copy[i]));
  text('#scene-weather',state.weather==='fog'?'A little fog is gathering.':'A ribbon of light above the trees.');
  text('#discovery-title',state.discovered?'A luminous seed.':'Something is glowing.');
  text('#discovery-copy',state.discovered?'A small light to bring home.':'A first discovery, just ahead.');
  text('#tool-count',`${Object.keys(state.layout).length} / 3 tools`);
  $('.side').dataset.autoplay=String(automatic);
  $('#manual-controls').hidden=automatic;$('#auto-plan').hidden=!automatic;$('#auto-sky').hidden=!automatic;
  text('#auto-badge',automatic?'AUTO ON':'YOUR PLAN');
  text('#autonomy-copy',automatic?'Explores, prepares, protects and rests. You can just watch.':locked?'This encounter will finish on its own. The next one will wait for you.':'Automatic life is paused. Choose the tools and when the next encounter begins.');
  text('#autoplay-toggle',automatic?'Arrange it myself':'Let soul decide');
  $('#autoplay-toggle').disabled=busy||blocked;$('#autoplay-toggle').setAttribute('aria-pressed',String(automatic));
  text('#auto-plan-weather',state.weather==='fog'?'Lantern seeds and chime ripples spread mint through the fog.':'A moon bowl lures the fluttering painters away from home.');
  text('#tool-hint',locked?'This encounter keeps the layout it started with.':`${TOOLS[selectedTool].hint} Choose a numbered clearing.`);
  document.querySelectorAll('[data-tool]').forEach(button=>{button.disabled=!editable;button.setAttribute('aria-pressed',String(button.dataset.tool===selectedTool));});
  document.querySelectorAll('[data-weather]').forEach(button=>{button.disabled=!editable;button.setAttribute('aria-pressed',String(button.dataset.weather===state.weather));});
  text('#weather-note',`${state.weather==='fog'?'ETH −4% or lower':'ETH +4% or higher'} scenario · sample weather, not a live price feed.`);
  markers?.forEach((button,i)=>{button.disabled=!editable;button.hidden=!editable||focused;button.setAttribute('aria-pressed',String(selectedSlot===i));button.setAttribute('aria-label',`${i+1}. ${SLOTS[i].name}. ${state.layout[i]?TOOLS[state.layout[i]].short:'Empty'}. Place ${TOOLS[selectedTool].short}.`);touchButtons[i].disabled=!editable;touchButtons[i].setAttribute('aria-pressed',String(selectedSlot===i));touchButtons[i].setAttribute('aria-label',button.getAttribute('aria-label'));});
  touchSlots.hidden=!editable;
  const primary=$('#primary-action');primary.disabled=busy||blocked||(!automatic&&(['explore','return'].includes(phase)||(['arrange','home'].includes(phase)&&Object.keys(state.layout).length<3)));
  primary.querySelector('span').textContent=automatic?(focused?'Watch from above':'Follow your soul'):phase==='explore'?'Following the little glow…':phase==='defend'?'See how it went':phase==='return'?'Bringing a memory home…':Object.keys(state.layout).length<3?'Choose three tools to begin':state.weather==='fog'?'Let the fog arrive':'Watch the aurora arrive';
  $('#secondary-action').hidden=!automatic&&phase==='defend';
  text('#secondary-action',automatic?'Open little memories':phase==='explore'?'Follow your soul':phase==='return'?'Keep this memory':state.weather==='fog'?'Try an aurora instead':'Try a little fog instead');
  text('#memory-count',String(state.memories.length));
  const last=state.memories.find(m=>m.result),showResult=!!last&&['home','return','arrange'].includes(phase);
  $('#result-note').hidden=!showResult;if(showResult)text('#result-note',last.result.turf?`${last.result.outcome==='bloomed'?'Our color held.':'A little more color next time.'} Mint ${last.result.turf.soul}% · violet ${last.result.turf.wild}%. ${last.result.light}/100 lantern light.`:`${last.kind==='fog'?'Fog':'Aurora'} · ${last.result.light}/100 light. ${last.result.turned} visitors guided away. A little lesson for next time.`);
  $('.round-hud').hidden=phase!=='defend';
  document.querySelectorAll('[data-phase]').forEach(item=>item.classList.toggle('active',item.dataset.phase===(phase==='return'?'home':phase)));
  $('#soul-select').value=String(state.soulIndex);$('#soul-select').disabled=locked||busy||blocked;
  $('.soul-avatar').innerHTML=originals[state.soulIndex].markup;
  if(rooftop){
    const sky=MARKET_SKIES[state.weather];
    text('#scene-weather',`${sky.name} · market weather demo`);
    text('#discovery-title',state.discovered?'A rooftop key.':'A quiet corner above the city.');text('#discovery-copy',state.discovered?'One little place to look after.':'Your soul is finding its way around.');
    text('#market-name',sky.name);text('#market-detail',sky.detail);text('#market-source',locked?'Sample changes · no live prices. This encounter keeps its sky.':'Sample changes · no live prices. Try either sky.');
    document.querySelectorAll('[data-sky]').forEach(button=>{button.disabled=locked||busy||blocked;button.setAttribute('aria-pressed',String(button.dataset.sky===state.weather));});
    text('#autonomy-copy',automatic?'Explores, prepares, washes and rests. A little life of its own.':locked?'This cleanup will finish. The next one will wait for you.':'Arrange the tools, then let the visitors arrive.');
    text('#auto-plan-weather',state.weather==='fog'?'Violet drizzle makes broad pools behind the gates.':'Coral confetti makes smaller splashes scatter farther.');
    text('#weather-note','Demo scenarios. Price direction changes the kind of mess, not token rewards.');
    if(!automatic&&['arrange','home'].includes(phase)&&Object.keys(state.layout).length===3)primary.querySelector('span').textContent='Let the visitors arrive';
    if(showResult)text('#result-note',`${last.result.outcome==='restored'?'The rooftop lights came back.':'Another little try tomorrow.'} ${last.result.turf.clean}% clean · ${last.result.breaches} gates burst. The original tiles are showing again.`);
  }
}
function positionAt(now){
  const elapsed=Math.max(0,now-state.phaseAt);
  if(state.phase==='explore'){
    const p=Math.min(1,elapsed/EXPLORE_MS),points=[[-1,2.6],[-2.8,.7],[-4.9,-2.25],[-4.9,-2.25],[-2.8,.7],[-1,2.6]],part=Math.min(4,Math.floor(p*5)),t=p*5-part;
    return {x:points[part][0]+(points[part+1][0]-points[part][0])*t,z:points[part][1]+(points[part+1][1]-points[part][1])*t};
  }
  if(state.phase==='defend'){const p=elapsed/2500;return {x:Math.sin(p)*1.1,z:2.65+Math.cos(p)*.3};}
  if(state.phase==='arrange'&&state.autoplay){
    const plan=Object.keys(PRESETS[state.weather]).map(id=>SLOTS[+id]),step=Math.min(2,Math.floor(elapsed/(PREPARE_MS/3))),t=Math.min(1,(elapsed%(PREPARE_MS/3))/(PREPARE_MS/3)*1.2),from=step?plan[step-1]:{x:-1,z:2.6},to=plan[step];
    return {x:from.x+(to.x-from.x)*t,z:from.z+(to.z-from.z)*t+.45};
  }
  if(state.phase==='return'){const p=Math.min(1,elapsed/RETURN_MS),from=simulation?.frames.at(-1)?.guardian||{x:1.1,z:2.5};return {x:from.x+(-1.25-from.x)*p,z:from.z+(3-from.z)*p};}
  if(state.phase==='home')return {x:-1.25+Math.sin(elapsed/5000)*.18,z:3.0};
  return {x:-.85,z:2.9};
}
let stats={};
function tick(timestamp){
  raf=requestAnimationFrame(tick);
  if(document.hidden||timestamp-lastFrame<1000/30)return;
  lastFrame=timestamp;
  const now=Math.max(Date.now(),state.lastAt);
  const phaseDone=now>=nextTransitionAt(state);
  if(phaseDone&&!busy&&!blocked)commit(s=>s,{automatic:true});
  if(state.autoplay){
    const remaining=Math.max(0,Math.ceil((nextTransitionAt(state)-now)/1000));
    const status={explore:`Out exploring · back in ${remaining}s`,arrange:`Preparing ${rooftop?'the rooftop':'the grove'} · ${Object.keys(state.layout).length} of 3 tools placed`,defend:`${rooftop?'Washing the tiles':'Keeping watch'} · ${remaining}s until the sky clears`,return:'Carrying a little memory home.',home:`A well-earned rest · out again in ${remaining}s`}[state.phase];
    text('#autonomy-status',status);
  }else text('#autonomy-status',['explore','defend','return'].includes(state.phase)?'Finishing this little moment. The next encounter will wait.':'Nothing starts until you are ready.');
  let frame=null,territory=null;
  if(state.round&&['defend','return','home'].includes(state.phase)&&simulationId!==state.round.id){simulation=simulateDefense(state.round);simulationId=state.round.id;}
  if(state.phase==='defend'){
    const logical=Math.max(0,Math.min(180,(now-state.round.startedAt)/ROUND_MS*180)),index=Math.floor(logical),a=simulation.frames[index],b=simulation.frames[Math.min(180,index+1)],t=logical-index;
    frame={...a,logical,effects:simulation.frames.slice(Math.max(0,index-(rooftop?18:4)),index+1).flatMap(f=>f.events||[]),guardian:a.guardian?{x:a.guardian.x+(b.guardian.x-a.guardian.x)*t,z:a.guardian.z+(b.guardian.z-a.guardian.z)*t}:null,enemies:a.enemies.map(e=>{const other=b.enemies.find(n=>n.id===e.id);return other?{...e,x:e.x+(other.x-e.x)*t,z:e.z+(other.z-e.z)*t}:e;})};
    territory=frame.turf;
    text('#wave-label',`Wave ${frame.wave} / 3`);text('#light-value',`${frame.light} light`);$('.light-fill').style.width=`${frame.light}%`;$('.light-track').setAttribute('aria-valuenow',String(frame.light));
  }
  if(state.round&&['return','home'].includes(state.phase))territory=simulation?.frames.at(-1)?.turf;
  if(rooftop&&!territory)territory=roofPreview();
  $('.turf-hud').hidden=!territory;
  if(territory){
    text('#turf-soul',`${territory.soul}%`);text('#turf-wild',`${territory.wild}%`);
    $('#turf-soul-fill').style.width=`${territory.soul}%`;$('#turf-wild-fill').style.width=`${territory.wild}%`;
    text('#turf-leader',rooftop?(territory.clean>=80?'Lights coming back':'Tiles to uncover'):territory.winner==='soul'?'Mint is spreading':territory.winner==='wild'?'Violet is spreading':'Even ground');
    text('#turf-objective',rooftop?'Uncover 80% of the tiles by the time the sky clears.':state.phase==='defend'?'Keep more mint ground when the sky clears.':simulation.result.outcome==='bloomed'?'Our color held. Time for a little rest.':'The grove is safe. A fresh canvas next time.');
  }
  const gateState=frame?.gates||(rooftop&&state.round&&['return','home'].includes(state.phase)?simulation?.frames.at(-1)?.gates:null);
  if(rooftop){
    $('#turf-wild-fill').style.background=MARKET_SKIES[state.weather].ink;$('.violet-dot').style.background=MARKET_SKIES[state.weather].ink;
    $('#gate-notice').hidden=!frame;
    if(frame){
      text('#light-value',`${frame.light}% lit`);const burst=frame.effects.findLast(e=>e.kind==='flood'&&frame.logical-e.at<18),broken=frame.gates.filter(g=>g.broken).length;
      $('#gate-notice').dataset.burst=String(!!burst);
      text('#gate-title',burst?`${burst.lane===0?'West':'East'} gate burst!`:broken===2?'A big mess. Still our little rooftop.':'The gates are holding the paint.');
      text('#gate-detail',burst?'A whole wave of paint. Your soul is already on its way.':broken===2?'The gates are open. Your soul keeps rinsing the tiles.':frame.gates.map(g=>`${g.lane===0?'West':'East'} ${g.broken?'open':Math.round(g.pressure/g.capacity*100)+'% pressure'}`).join(' · '));
    }
  }
  stats=world.update({time:timestamp/1000,soulPosition:frame?.guardian||positionAt(now),frame,territory,gates:gateState,layout:state.phase==='defend'?state.round.layout:state.layout,index:state.soulIndex,weather:state.phase==='defend'?state.round.weather:state.weather,discovered:state.discovered,reducedMotion:reduced});
  stats.slots.forEach((position,i)=>{markers[i].style.left=`${position.x}px`;markers[i].style.top=`${position.y}px`;markers[i].style.visibility=position.visible?'visible':'hidden';});
}
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){cancelAnimationFrame(raf);raf=0;}
  else{lastFrame=0;if(!raf)raf=requestAnimationFrame(tick);if(!busy&&!blocked)commit(s=>s,{automatic:true});}
});
rendererEvents();
function rendererEvents(){
  world.renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();cancelAnimationFrame(raf);raf=0;loading.hidden=false;loading.textContent='The little world needs a moment. Your saved grove is safe.';});
  world.renderer.domElement.addEventListener('webglcontextrestored',()=>location.reload());
}
refreshUI();
await commit(s=>s,{automatic:true});
loading.hidden=true;window.groveReady=true;
window.groveLab={getState:()=>structuredClone(state),getStats:()=>({...stats}),getEncounter:()=>simulation?structuredClone(simulation.result):null};
if(rooftop)window.rooftopLab=window.groveLab;
raf=requestAnimationFrame(tick);
