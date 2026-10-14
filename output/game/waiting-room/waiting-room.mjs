import {createEngine} from './engine.mjs';
import {parseArtwork,artworkImage} from './artwork.mjs';
import {behaviorAt,normalizeState,sourceLabel,photoLabel} from './behavior.mjs';

// No wallet, network reader, storage, or public samples belong to this module.
export function createWaitingRoom(container,options={}){
 if(!(container instanceof HTMLElement))throw TypeError('Provide a room container.');
 const root=document.createElement('section');root.className='wr-room';root.setAttribute('aria-label','My little room');
 // This is constant application markup. Input artwork is decoded as an image only.
 root.innerHTML=`<header class="wr-heading"><div><p class="wr-eyebrow">SOULI · LITTLE DAYLIGHT</p><h1>My little room</h1></div><span class="wr-source"></span></header>
 <div class="wr-stage"><div class="wr-placeholder" role="status"></div><span class="wr-fallback" hidden>Original 2D</span></div>
 <div class="wr-bottom"><p class="wr-caption" aria-live="off"></p><label class="wr-collection" hidden>My souls <select aria-label="Choose an inscription"></select></label>
 <div class="wr-actions"><button type="button" data-action="close" aria-pressed="false">Closer</button><button type="button" data-action="original">View original</button><button type="button" data-action="still" aria-pressed="false">Still</button><button type="button" class="wr-photo" data-action="photo">Take a photo <span aria-hidden="true">↗</span></button></div><p class="wr-notice" role="status"></p></div>
 <dialog class="wr-original"><div class="wr-original-heading"><strong>Original inscription</strong><button type="button" data-action="dismiss" aria-label="Close original">×</button></div><canvas width="480" height="480" aria-label="Original 2D inscription"></canvas><p class="wr-original-source"></p></dialog>`;
 container.append(root);
 const find=s=>root.querySelector(s),stage=find('.wr-stage'),placeholder=find('.wr-placeholder'),badge=find('.wr-source'),caption=find('.wr-caption'),collection=find('.wr-collection'),select=find('select'),dialog=find('dialog'),notice=find('.wr-notice');
 const buttons=Object.fromEntries([...root.querySelectorAll('[data-action]')].map(b=>[b.dataset.action,b]));
 const media=matchMedia('(prefers-reduced-motion: reduce)'),urls=new Map();
 let state=normalizeState({status:'disconnected'}),art=null,decoded=null,generation=0,disposed=false,paused=false,userStill=false,close=false,seconds=0,raf=0,last=null,lastDraw=0;
 let engine=createEngine(stage,{prefer2D:options.prefer2D,createFigure:options.createFigure,onContextLost:recover2D});
 const effectiveStill=()=>userStill||media.matches;
 const active=()=>!disposed&&!paused&&!document.hidden&&!effectiveStill()&&!!art;
 const pose=()=>behaviorAt(seconds,{still:effectiveStill()});
 function draw(){if(disposed)return;const p=pose();engine.draw(p,seconds,effectiveStill());caption.textContent=art?p.label:'A little space, ready for a soul.';}
 function stop(){cancelAnimationFrame(raf);raf=0;last=null;}
 function frame(now){raf=0;if(!active())return;if(last!==null)seconds+=Math.min((now-last)/1000,.1);last=now;if(now-lastDraw>=1000/30){draw();lastDraw=now;}raf=requestAnimationFrame(frame);}
 function syncLoop(){stop();if(active())raf=requestAnimationFrame(frame);}
 function updateUI(){
  badge.textContent=sourceLabel(state);badge.dataset.status=state.status;
  placeholder.hidden=!!art;placeholder.textContent=sourceLabel(state);
  root.dataset.status=state.status;root.dataset.mode=engine.details().mode;
  buttons.photo.disabled=buttons.original.disabled=buttons.close.disabled=!art;
  buttons.close.setAttribute('aria-pressed',String(close));buttons.close.textContent=close?'Room view':'Closer';
  buttons.still.setAttribute('aria-pressed',String(effectiveStill()));buttons.still.title=media.matches?'Reduced motion is enabled on this device.':'Pause ambient movement.';
  find('.wr-fallback').hidden=!art||engine.details().mode!=='original2d';
  collection.hidden=state.souls.length<2;select.replaceChildren();
  state.souls.forEach((s,i)=>{const o=document.createElement('option');o.value=i;o.textContent=`${s.dynamic?'Dynamic':'Stable'}${s.level===null?'':` · Level ${s.level}`} · ${i+1}`;select.append(o);});select.value=String(state.selectedIndex);
 }
 function emit(){options.onChange?.(getState());}
 function recover2D(){if(disposed)return;engine.dispose();engine=createEngine(stage,{prefer2D:true});engine.setClose(close);if(art)engine.setSoul(art,decoded);updateUI();draw();}
 function clearCurrent(){stop();engine.clear();art=decoded=null;seconds=0;close=false;engine.setClose(false);notice.textContent='';dialog.close();find('.wr-original canvas').getContext('2d').clearRect(0,0,480,480);find('.wr-original-source').textContent='';}
 async function setState(input){
  if(disposed)throw Error('This room has been disposed.');
  const token=++generation;clearCurrent();
  try{
   const next=normalizeState(input);
   state=next;
   if(!['sample','owned'].includes(next.status)){updateUI();draw();emit();return getState();}
   // A pending decode must never display the preceding owner's soul or controls.
   state=normalizeState({status:'loading'});updateUI();draw();emit();
   const selected=next.souls[next.selectedIndex],parsed=parseArtwork(selected.svg,{level:selected.level}),image=await artworkImage(parsed.original);
   if(disposed||token!==generation)return {superseded:true};
   engine.setSoul(parsed,image);art=parsed;decoded=image;state=next;updateUI();draw();syncLoop();emit();return getState();
  }catch(error){
   if(disposed||token!==generation)return {superseded:true};
   clearCurrent();state=normalizeState({status:'error'});updateUI();draw();emit();options.onError?.(error);return getState();
  }
 }
 function getState(){return {status:state.status,isFixture:state.isFixture,selectedIndex:state.selectedIndex,count:state.souls.length,total:state.total,source:sourceLabel(state),mode:engine.details().mode,still:effectiveStill(),paused,close,disposed};}
 function showOriginal(){if(!art)return;const canvas=find('.wr-original canvas'),ctx=canvas.getContext('2d');ctx.clearRect(0,0,480,480);ctx.imageSmoothingEnabled=false;ctx.drawImage(decoded,0,0,480,480);find('.wr-original-source').textContent=sourceLabel(state);dialog.showModal();}
 async function capture({width=1440,height=1000}={}){
  if(disposed||!art)throw Error('Select a soul before taking a photo.');
  if(![width,height].every(n=>Number.isInteger(n)&&n>=320&&n<=2048))throw RangeError('Photo dimensions must be between 320 and 2048.');
  const token=generation,c=document.createElement('canvas');c.width=width;c.height=height;const ctx=c.getContext('2d');
  draw();ctx.fillStyle='#eeeade';ctx.fillRect(0,0,width,height);const footer=Math.max(72,Math.round(height*.08)),scale=Math.min(width/engine.canvas.width,(height-footer)/engine.canvas.height),w=engine.canvas.width*scale,h=engine.canvas.height*scale;
  ctx.drawImage(engine.canvas,(width-w)/2,(height-footer-h)/2,w,h);
  ctx.fillStyle='#fcfaf5';ctx.fillRect(0,height-footer,width,footer);ctx.fillStyle='#223b4e';ctx.font=`600 ${Math.max(14,Math.round(width*.017))}px system-ui`;ctx.textBaseline='middle';ctx.fillText('SOULI',width*.04,height-footer/2);
  ctx.textAlign='right';ctx.font=`500 ${Math.max(10,Math.round(width*.010))}px system-ui`;ctx.fillText(`LITTLE DAYLIGHT · ${photoLabel(state)}`,width*.96,height-footer/2,width*.74);
  const blob=await new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(Error('Could not save this photo.')),'image/png'));
  if(disposed||token!==generation)throw new DOMException('The selected soul changed. Please take a new photo.','AbortError');
  return blob;
 }
 async function download(){try{const blob=await capture(),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='souli-little-daylight.png';a.click();const timer=setTimeout(()=>{URL.revokeObjectURL(url);urls.delete(url);},30000);urls.set(url,timer);notice.textContent='Your photo is ready.';}catch(error){if(!disposed)notice.textContent=error.message;}}
 const click=e=>{const b=e.target.closest('[data-action]');if(!b||!root.contains(b)||b.disabled)return;switch(b.dataset.action){case'close':api.setClose(!close);break;case'original':showOriginal();break;case'still':api.setStill(!userStill);break;case'photo':void download();break;case'dismiss':dialog.close();break;}};
 const change=()=>void api.selectSoul(Number(select.value));
 const visibility=()=>{syncLoop();};const motion=()=>{updateUI();draw();syncLoop();};
 root.addEventListener('click',click);select.addEventListener('change',change);document.addEventListener('visibilitychange',visibility);media.addEventListener('change',motion);
 const api={
  setState,setSoul(soul,{status='sample',isFixture=false}={}){return setState(status==='sample'?{status,soul,isFixture}:{status,souls:[soul],isFixture});},
  selectSoul(index){return setState(state.status==='sample'?{status:'sample',soul:state.souls[index]}:{...state,selectedIndex:index});},
  clear(){return setState({status:'disconnected'});},
  pause(){if(disposed)return;paused=true;syncLoop();},resume(){if(disposed)return;paused=false;syncLoop();},
  setStill(value){if(disposed)return;userStill=!!value;motion();},setClose(value){if(disposed)return;close=!!value;engine.setClose(close);updateUI();draw();},
  capture,getState,getOriginalBlob(){if(!art||disposed)throw Error('No original is selected.');return new Blob([art.original],{type:'image/svg+xml'});},
  getDiagnostics(){return {...getState(),...engine.details(),activeSeconds:seconds,behavior:pose().kind,hidden:document.hidden,downloadUrls:urls.size};},
  dispose(){if(disposed)return;disposed=true;++generation;stop();root.removeEventListener('click',click);select.removeEventListener('change',change);document.removeEventListener('visibilitychange',visibility);media.removeEventListener('change',motion);dialog.close();for(const[url,timer]of urls){clearTimeout(timer);URL.revokeObjectURL(url);}urls.clear();engine.dispose();art=decoded=null;state=normalizeState({status:'disconnected'});root.remove();},
 };
 updateUI();draw();api.ready=options.initialState?setState(options.initialState):Promise.resolve(getState());return api;
}
