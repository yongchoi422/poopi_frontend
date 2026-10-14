import {prepareOriginal} from './grove-originals.mjs';
import {createMiniatureWorld} from './miniature-world.mjs';
import {openMiniatureStore} from './miniature-store.mjs';
import {CREW,SKIES,createState,advance,simulate,nextAt,ENCOUNTER_MS,preview} from './miniature-rules.mjs';
const $=s=>document.querySelector(s),text=(s,v)=>{const e=$(s);if(e.textContent!==v)e.textContent=v;};
let state,store,busy=false,run=null,runId='',selected=-1,zoom=innerWidth<600?1.7:1,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,raf=0,lastFrame=0,stats={},notice;
const originals=(await(await fetch('./soul-samples.json')).json()).map(prepareOriginal),channel=new BroadcastChannel('souli-white-neighborhood-v1');
function error(e){$('#save-error').hidden=false;$('#save-error').textContent=e.message||String(e);text('#save-status','Save needs attention');}
try{store=await openMiniatureStore();state=store.state;}catch(e){error(e);if(/recovery|replaced/.test(e.message)){$('.loading').textContent=e.message;throw e;}state=createState();$('#save-error').textContent='Browser storage is unavailable. This visit is not saved; export it before leaving.';}
const world=createMiniatureWorld($('.stage'),originals);
world.setZoom(zoom);
async function commit(transform=s=>s){if(busy)return;busy=true;try{const fn=s=>transform(advance(s,Math.max(s.lastAt,Date.now())));state=store?await store.update(fn,state.revision):fn(structuredClone(state));if(store){text('#save-status','Saved on this device · 5 sample souls');channel.postMessage({revision:state.revision});}else text('#save-status','This visit is not saved');}catch(e){if(/Another tab/.test(e.message)&&store){state=await store.read();}else error(e);}finally{busy=false;refresh();}}
function toast(message){clearTimeout(notice);text('.toast',message);$('.toast').hidden=false;notice=setTimeout(()=>$('.toast').hidden=true,3000);}
CREW.forEach(a=>{const b=document.createElement('button');b.className='resident';b.type='button';b.dataset.resident=a.id;b.setAttribute('aria-pressed','false');b.setAttribute('aria-label',`${a.name}, ${a.role}. Follow this soul.`);const face=document.createElement('span');face.className='portrait';face.innerHTML=originals[a.sample].markup;const copy=document.createElement('span'),name=document.createElement('strong'),role=document.createElement('small'),action=document.createElement('small');name.textContent=a.name;role.textContent=a.role;action.className='action';action.textContent='Finding a little place';copy.append(name,role,action);b.append(face,copy);b.onclick=()=>{selected=selected===a.id?-1:a.id;world.follow(selected);refresh();};$('.crew').append(b);});
$('#overview').onclick=()=>{selected=-1;zoom=1;world.reset();refresh();};
function changeZoom(step){zoom=Math.max(1,Math.min(2.3,zoom+step));world.setZoom(zoom);refresh();}
$('#zoom-in').onclick=()=>changeZoom(.25);$('#zoom-out').onclick=()=>changeZoom(-.25);
$('#still').onclick=()=>{reduced=!reduced;refresh();};
$('#weather-open').onclick=()=>{refresh();$('#weather-dialog').showModal();};
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>document.getElementById(b.dataset.close).close());
document.querySelectorAll('[data-weather]').forEach(b=>b.onclick=async()=>{if(state.phase==='encounter')return;await commit(s=>{if(s.phase==='encounter')return s;s.weather=b.dataset.weather;s.phase='prepare';s.phaseAt=s.lastAt;s.round=null;return s;});$('#weather-dialog').close();});
$('#memories-open').onclick=()=>{const list=$('#memory-list');list.replaceChildren();if(!state.memories.length){const li=document.createElement('li');li.textContent='The first little story is still unfolding.';list.append(li);}for(const m of state.memories){const li=document.createElement('li'),title=document.createElement('strong'),detail=document.createElement('small');title.textContent=m.result.outcome==='restored'?'The neighborhood is quiet again.':'A little more cleaning tomorrow.';detail.textContent=`${m.result.homeClean}% clean inside · ${m.result.turned} visitors turned away · ${m.result.repairs} gate repairs. ${new Date(m.at).toLocaleString()}`;li.append(title,detail);list.append(li);}$('#memories-dialog').showModal();};
$('#export-save').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({kind:'souli-white-neighborhood-prototype',state},null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='souli-neighborhood.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('This neighborhood has been exported.');};
channel.onmessage=async e=>{if(e.data.revision>state.revision&&!busy&&store){try{state=await store.read();refresh();}catch(err){error(err);}}};
function refresh(){
 if(!state)return;document.querySelectorAll('[data-resident]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.resident===selected)));
 $('#still').setAttribute('aria-pressed',String(reduced));$('#zoom-out').disabled=zoom<=1;$('#zoom-in').disabled=zoom>=2.3;
 $('#weather-open').firstChild.textContent=SKIES[state.weather].name+' ';text('#memory-count',String(state.memories.length));
 document.querySelectorAll('[data-weather]').forEach(b=>{b.disabled=busy||state.phase==='encounter';b.setAttribute('aria-pressed',String(b.dataset.weather===state.weather));});
 text('#weather-detail',state.phase==='encounter'?'This visit keeps its sky. Try another weather after the crew has finished. Demo samples, no live prices.':'Demo samples, no live prices. Both skies give the crew a different kind of mess.');
}
function tick(timestamp){raf=requestAnimationFrame(tick);if(document.hidden||timestamp-lastFrame<1000/30)return;lastFrame=timestamp;const now=Math.max(state.lastAt,Date.now());if(now>=nextAt(state)&&!busy)commit();
 if(state.round&&runId!==state.round.id){run=simulate(state.round);runId=state.round.id;}
 let frame=null,logical=0,area=preview();
 if(state.phase==='encounter'&&run){logical=Math.min(210,Math.max(0,(now-state.round.startedAt)/ENCOUNTER_MS*210));const i=Math.floor(logical),a=run.frames[i],b=run.frames[Math.min(210,i+1)],t=logical-i;frame={...a,effects:run.frames.slice(Math.max(0,i-18),i+1).flatMap(f=>f.events),crew:a.crew.map((c,j)=>({...c,x:c.x+(b.crew[j].x-c.x)*t,z:c.z+(b.crew[j].z-c.z)*t})),enemies:a.enemies.map(e=>{const n=b.enemies.find(v=>v.id===e.id);return n?{...e,x:e.x+(n.x-e.x)*t,z:e.z+(n.z-e.z)*t}:e;})};area=a.turf;}
 if(state.phase==='rest'&&run){frame={...run.frames.at(-1),effects:[],enemies:[]};area=frame.turf;}
 const gate=frame?.gate||{pressure:0,capacity:80,broken:false,repair:0};const level=Math.round(gate.broken?gate.repair:gate.pressure/gate.capacity*100);
 text('#home-clean',`${area.homeClean}%`);text('#gate-name',gate.broken?'Repairing the gate':gate.repairs?'Reinforced gate':'Gate pressure');text('#gate-value',`${level}%`);$('#gate-fill').style.width=level+'%';$('#gate-fill').style.background=gate.broken?'#c4a768':level>70?'#da927c':'#73bba0';$('.track').setAttribute('aria-valuenow',String(level));$('.track').setAttribute('aria-label',gate.broken?'Gate repair':'Gate pressure');
 text('#wave-label',state.phase==='encounter'?`Wave ${frame.wave} / 3 · ${Math.ceil((nextAt(state)-now)/1000)}s`:state.phase==='prepare'?`Getting ready · ${Math.max(0,Math.ceil((nextAt(state)-now)/1000))}s`:`Resting · next visit in ${Math.max(0,Math.ceil((nextAt(state)-now)/1000))}s`);
 let title='Five little souls. One place to call home.',detail='Two hold the gate. Two wash the streets. One keeps it standing.';
 if(innerWidth<600)detail='Drag to explore. Tap a neighbor to follow.';
 if(state.phase==='rest'){title='A little peace, together.';detail='The crew can rest. Another sky, another small story.';}
 if(state.phase==='encounter'){title=gate.broken?'A breach! Everyone has a little job.':gate.repairs?'Back on our feet. The gate is stronger.':frame.wave===1?'Hold the line, little souls.':'Something bigger is gathering.';detail=gate.broken?'The washers clear the spill while the mender rebuilds the gate.':'Watch their droplets push the visitors back from the wall.';}
 if(selected>=0){title=`${CREW[selected].name} · ${CREW[selected].role}`;detail=state.phase==='encounter'?frame.crew[selected].action:'A little time to wander. The others are close by.';}
 text('#story-title',title);text('#story-detail',detail);$('.story').dataset.urgent=String(gate.broken&&selected<0);
 stats=world.update({frame,territory:area,time:timestamp/1000,logical,weather:state.round?.weather||state.weather,phase:state.phase,reduced});
 document.querySelectorAll('[data-resident]').forEach(b=>{const c=stats.crew[+b.dataset.resident];b.querySelector('.action').textContent=state.phase==='encounter'?c.action:'A little time to wander';});
}
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;}else{lastFrame=0;if(!raf)raf=requestAnimationFrame(tick);commit();}});
world.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();cancelAnimationFrame(raf);raf=0;$('.loading').hidden=false;$('.loading').textContent='The little world needs a moment. Your saved neighborhood is safe.';});world.renderer.domElement.addEventListener('webglcontextrestored',()=>location.reload());
await commit();refresh();$('.loading').hidden=true;window.miniatureLab={getState:()=>structuredClone(state),getStats:()=>structuredClone(stats),getResult:()=>run?structuredClone(run.result):null};window.miniatureReady=true;raf=requestAnimationFrame(tick);
