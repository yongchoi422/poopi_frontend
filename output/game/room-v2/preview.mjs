import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createRoom} from './model.mjs';
import {createSoulVolume,disposeSoulVolume} from './soul-volume.mjs';

const stage=document.querySelector('.stage'),soulEl=document.querySelector('.soul'),avatar=document.querySelector('.avatar'),status=document.querySelector('.status');
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.VSMShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
stage.prepend(renderer.domElement);renderer.domElement.setAttribute('aria-label','Actual 3D room render');
const scene=new THREE.Scene();scene.background=new THREE.Color('#c8b89e');
const {room,refs,materials}=createRoom();scene.add(room);
const camera=new THREE.OrthographicCamera(-5.4,5.4,3.04,-3.04,.1,70);camera.name='Game_Camera';
const gamePosition=new THREE.Vector3(0,4.65,13.7),gameTarget=new THREE.Vector3(0,2.6,.2);
camera.position.copy(gamePosition);camera.lookAt(gameTarget);camera.updateMatrixWorld();
const controls=new OrbitControls(camera,renderer.domElement);controls.target.copy(gameTarget);controls.enabled=false;controls.enableDamping=false;
controls.minPolarAngle=.15;controls.maxPolarAngle=Math.PI*.48;controls.minZoom=.65;controls.maxZoom=1.7;
controls.update();
const hemi=new THREE.HemisphereLight('#f8efd9','#73573f',1.45);hemi.name='Soft_room_fill';scene.add(hemi);
const sun=new THREE.DirectionalLight('#ffe4b2',3.2);sun.name='Afternoon_window_key';sun.position.set(-4.3,7,5);sun.target.position.set(.2,1.5,-1.2);sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-7;sun.shadow.camera.right=7;sun.shadow.camera.top=7;sun.shadow.camera.bottom=-6;sun.shadow.camera.near=.1;sun.shadow.camera.far=25;sun.shadow.normalBias=.035;sun.shadow.bias=-.0002;sun.shadow.radius=5;sun.shadow.blurSamples=10;scene.add(sun,sun.target);
const fill=new THREE.DirectionalLight('#d9e6ef',.75);fill.name='Cool_bounce';fill.position.set(5,4,6);scene.add(fill);
const pendant=new THREE.PointLight('#ffc989',8.5,7,2);pendant.name='Pendant_light';refs.Light_anchor.getWorldPosition(pendant.position);scene.add(pendant);

// A contact shadow belongs to the 2D soul layer, so it is excluded from room GLB.
const shadowCanvas=document.createElement('canvas');shadowCanvas.width=128;shadowCanvas.height=128;
const shadowContext=shadowCanvas.getContext('2d');const gradient=shadowContext.createRadialGradient(64,64,3,64,64,62);gradient.addColorStop(0,'rgba(34,24,16,.6)');gradient.addColorStop(.4,'rgba(34,24,16,.35)');gradient.addColorStop(1,'rgba(34,24,16,0)');shadowContext.fillStyle=gradient;shadowContext.fillRect(0,0,128,128);
const contact=new THREE.Mesh(new THREE.PlaneGeometry(1.5,.78),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false}));contact.rotation.x=-Math.PI/2;refs.Soul_on_table.getWorldPosition(contact.position);contact.position.y+=.003;scene.add(contact);

const originals=await (await fetch('./soul-samples.json')).json();
function art(item){
  const doc=new DOMParser().parseFromString(item.svg,'image/svg+xml'),svg=doc.documentElement,r=[...svg.children];
  const shape=(el,x,y,w,h)=>el?.localName==='rect'&&['x','y','width','height'].every((k,i)=>+el.getAttribute(k)===[x,y,w,h][i]);
  const one=shape(r[1],0,17,24,7),two=shape(r[1],0,17,24,8)&&shape(r[2],0,17,24,1)&&shape(r[3],0,18,24,1)&&r[1].getAttribute('fill')===r[2].getAttribute('fill')&&r[2].getAttribute('fill')===r[3].getAttribute('fill');
  if(shape(r[0],0,0,24,24)&&(one||two))r.slice(0,one?2:4).forEach(el=>el.remove());
  const rs=[...svg.children],x=Math.min(...rs.map(e=>+e.getAttribute('x'))),y=Math.min(...rs.map(e=>+e.getAttribute('y')));
  const w=Math.max(...rs.map(e=>+e.getAttribute('x') + +e.getAttribute('width')))-x,h=Math.max(...rs.map(e=>+e.getAttribute('y') + +e.getAttribute('height')))-y;
  svg.setAttribute('viewBox',item.dot?`${x+w/2-4} ${y+h-8} 8 8`:`${x-1} ${y-1} ${w+2} ${h+1}`);
  svg.setAttribute('shape-rendering','crispEdges');svg.setAttribute('preserveAspectRatio','xMidYMax meet');svg.setAttribute('role','img');svg.setAttribute('aria-label',item.name+' original SOULI');
  const rectangles=rs.map(el=>({x:+el.getAttribute('x'),y:+el.getAttribute('y'),width:+el.getAttribute('width'),height:+el.getAttribute('height'),fill:el.getAttribute('fill')}));
  return {...item,markup:new XMLSerializer().serializeToString(svg),aspect:item.dot?1:(w+2)/(h+1),foreground:rs.length,rectangles,frame:svg.getAttribute('viewBox').split(' ').map(Number)};
}
const souls=originals.map(art);let selected=0,inspect=false,evening=false,momentStart=0;
let soulFigure=null,close=false,characterVisible=true;
const appearance={mode:'volume',depth:4,roundness:.14,angle:-24};
try{const saved=JSON.parse(localStorage.getItem('souli-room-appearance-v1'));if(saved){if(['flat','volume'].includes(saved.mode))appearance.mode=saved.mode;for(const [key,min,max] of [['depth',.6,8],['roundness',0,.28],['angle',-180,180]])if(Number.isFinite(saved[key]))appearance[key]=THREE.MathUtils.clamp(saved[key],min,max)}}catch{}
function rememberAppearance(){try{localStorage.setItem('souli-room-appearance-v1',JSON.stringify(appearance))}catch{}}
function rebuildFigure(){
  if(soulFigure){scene.remove(soulFigure);disposeSoulVolume(soulFigure)}
  soulFigure=createSoulVolume(souls[selected],{...appearance,worldWidth:souls[selected].dot?.78:1.75});
  refs.Soul_on_table.getWorldPosition(soulFigure.position);soulFigure.rotation.y=THREE.MathUtils.degToRad(appearance.angle);scene.add(soulFigure);
}
function updateAppearanceControls(){
  const volume=appearance.mode==='volume';document.getElementById('flat-mode').setAttribute('aria-pressed',String(!volume));document.getElementById('volume-mode').setAttribute('aria-pressed',String(volume));
  document.querySelector('.shape-controls').disabled=!volume;document.getElementById('front-view').disabled=!volume;document.getElementById('export-soul').disabled=!volume;
  for(const [id,value] of [['soul-depth',appearance.depth],['soul-roundness',appearance.roundness*100],['soul-angle',appearance.angle]])document.getElementById(id).value=String(value);
  document.getElementById('depth-value').textContent=appearance.depth.toFixed(1);document.getElementById('roundness-value').textContent=`${Math.round(appearance.roundness*100)}%`;document.getElementById('angle-value').textContent=`${appearance.angle}°`;
}
function setAppearance(next){
  const dimensionsChanged=(next.depth!==undefined&&next.depth!==appearance.depth)||(next.roundness!==undefined&&next.roundness!==appearance.roundness);
  if(next.mode!==undefined&&['flat','volume'].includes(next.mode))appearance.mode=next.mode;
  for(const [key,min,max] of [['depth',.6,8],['roundness',0,.28],['angle',-180,180]])if(Number.isFinite(next[key]))appearance[key]=THREE.MathUtils.clamp(next[key],min,max);
  if(dimensionsChanged)rebuildFigure();
  soulFigure.rotation.y=THREE.MathUtils.degToRad(appearance.angle);updateAppearanceControls();rememberAppearance();draw();
}
const select=document.getElementById('soul-select');souls.forEach((s,i)=>{const o=document.createElement('option');o.value=i;o.textContent=s.name;select.append(o)});
function selectSoul(i){selected=i;select.value=String(i);soulEl.innerHTML=souls[i].markup;avatar.innerHTML=souls[i].markup;contact.scale.setScalar(souls[i].dot?.4:1);rebuildFigure();if(close)setClose(true);draw()}
function placeSoul(){
  soulEl.hidden=inspect||appearance.mode==='volume'||!characterVisible;contact.visible=!inspect&&appearance.mode==='flat'&&characterVisible;
  if(soulFigure)soulFigure.visible=appearance.mode==='volume'&&characterVisible;
  if(soulEl.hidden)return;
  const anchor=refs.Soul_on_table.getWorldPosition(new THREE.Vector3()).project(camera);
  const worldWidth=souls[selected].dot?.78:1.75;
  const w=worldWidth/(camera.right-camera.left)*camera.zoom*stage.clientWidth;
  soulEl.style.left=`${(anchor.x*.5+.5)*100}%`;soulEl.style.top=`${(-anchor.y*.5+.5)*100}%`;soulEl.style.width=`${w}px`;soulEl.style.height=`${w/souls[selected].aspect}px`;
}
function draw(){camera.updateMatrixWorld();placeSoul();renderer.render(scene,camera)}
function resize(){const w=stage.clientWidth,h=stage.clientHeight,halfHeight=3.02;camera.left=-halfHeight*w/h;camera.right=halfHeight*w/h;camera.top=halfHeight;camera.bottom=-halfHeight;camera.updateProjectionMatrix();renderer.setSize(w,h,false);draw()}
new ResizeObserver(resize).observe(stage);controls.addEventListener('change',draw);
select.addEventListener('change',()=>selectSoul(+select.value));
function setInspect(value){inspect=value;close=false;document.getElementById('close-view').setAttribute('aria-pressed','false');controls.enabled=value;camera.zoom=1;document.getElementById('game-view').setAttribute('aria-pressed',String(!value));document.getElementById('model-view').setAttribute('aria-pressed',String(value));if(value){camera.position.set(7.5,6.5,10);camera.lookAt(gameTarget)}else{camera.position.copy(gamePosition);camera.lookAt(gameTarget)}controls.target.copy(gameTarget);camera.updateProjectionMatrix();controls.update();draw()}
function setClose(value){
  close=value;inspect=false;controls.enabled=false;document.getElementById('close-view').setAttribute('aria-pressed',String(value));document.getElementById('game-view').setAttribute('aria-pressed','true');document.getElementById('model-view').setAttribute('aria-pressed','false');
  const target=value?refs.Soul_on_table.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0,souls[selected].dot?.18:.55,0)):gameTarget.clone();
  camera.position.copy(target).add(gamePosition.clone().sub(gameTarget));camera.zoom=value?2.9:1;camera.lookAt(target);controls.target.copy(target);camera.updateProjectionMatrix();controls.update();draw();
}
document.getElementById('game-view').onclick=()=>setInspect(false);document.getElementById('model-view').onclick=()=>setInspect(true);
document.getElementById('flat-mode').onclick=()=>setAppearance({mode:'flat'});document.getElementById('volume-mode').onclick=()=>setAppearance({mode:'volume'});
document.getElementById('soul-depth').oninput=e=>setAppearance({depth:+e.target.value});document.getElementById('soul-roundness').oninput=e=>setAppearance({roundness:+e.target.value/100});document.getElementById('soul-angle').oninput=e=>setAppearance({angle:+e.target.value});
document.getElementById('front-view').onclick=()=>setAppearance({angle:0});document.getElementById('close-view').onclick=()=>setClose(!close);
function setEvening(value){evening=value;sun.intensity=value?.42:3.2;sun.color.set(value?'#a6b9de':'#ffe4b2');hemi.intensity=value?.62:1.45;fill.intensity=value?.25:.75;pendant.intensity=value?22:8.5;scene.background.set(value?'#605d61':'#c8b89e');room.getObjectByName('Sky_backdrop').material.color.set(value?'#39485f':'#edd6a2');room.getObjectByName('Afternoon_sun').material.color.set(value?'#d8e1db':'#fff0b7');room.getObjectByName('Distant_hills').material.color.set(value?'#435562':'#aba37c');room.getObjectByName('Near_hills').material.color.set(value?'#344a51':'#748467');document.querySelector('.time').textContent=value?'Home, after dark':'A slow afternoon';document.getElementById('light-toggle').setAttribute('aria-pressed',String(value));draw()}
document.getElementById('light-toggle').onclick=()=>setEvening(!evening);
let labelTimer;
function say(text){status.textContent=text;clearTimeout(labelTimer);labelTimer=setTimeout(()=>status.textContent='Taking the coffee break very seriously.',3200)}
document.getElementById('keep').onclick=()=>{say('A little memory, kept in this preview.')};
document.getElementById('moment').onclick=()=>{
  if(momentStart)return;momentStart=performance.now();stage.classList.add('playing');say('Inspecting the coffee. Very carefully.');
  function tick(now){const t=(now-momentStart)/1000,bend=Math.sin(Math.min(t/2.8,1)*Math.PI);refs.lever.rotation.x=bend*.4;soulFigure.rotation.z=-bend*.08;draw();if(t<2.8)requestAnimationFrame(tick);else{momentStart=0;refs.lever.rotation.x=0;soulFigure.rotation.z=0;stage.classList.remove('playing');draw()}}
  requestAnimationFrame(tick);
};
async function exportRoom(){
  const output=new THREE.Scene();output.name='SOULI_Room_Model';output.add(room.clone(true));
  const exportCamera=camera.clone();exportCamera.position.copy(gamePosition);exportCamera.zoom=1;exportCamera.lookAt(gameTarget);exportCamera.updateProjectionMatrix();output.add(exportCamera);
  // Preserve a basic portable punctual-light rig. Hemisphere fill is preview-specific.
  const key=sun.clone();key.target=sun.target.clone();output.add(key,key.target,fill.clone(),pendant.clone());
  output.userData={source:'model.mjs',gameRendering:'fixed camera + original 2D SVG overlay',status:'first modeling draft',ambientFill:1.45};
  return new GLTFExporter().parseAsync(output,{binary:true,onlyVisible:true,trs:true,maxTextureSize:1024});
}
document.getElementById('export').onclick=async()=>{const button=document.getElementById('export');button.disabled=true;try{const bytes=await exportRoom();const url=URL.createObjectURL(new Blob([bytes],{type:'model/gltf-binary'}));const a=document.createElement('a');a.href=url;a.download='souli-walnut-room-v2.glb';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}finally{button.disabled=false}};
async function exportSoul(){const object=soulFigure.clone(true);object.position.set(0,0,0);object.rotation.set(0,0,0);object.visible=true;return new GLTFExporter().parseAsync(object,{binary:true,trs:true})}
document.getElementById('export-soul').onclick=async()=>{const button=document.getElementById('export-soul');button.disabled=true;try{const bytes=await exportSoul();const url=URL.createObjectURL(new Blob([bytes],{type:'model/gltf-binary'}));const a=document.createElement('a');a.href=url;a.download='souli-pixel-figure.glb';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}finally{button.disabled=appearance.mode!=='volume'}};
window.roomLab={scene,room,camera,renderer,refs,draw,setInspect,setEvening,selectSoul,exportRoom,souls,setAppearance,setClose,exportSoul,
  getFigure:()=>soulFigure,getAppearance:()=>({...appearance}),
  async validateGLB(bytes){const gltf=await new GLTFLoader().parseAsync(bytes,'');let meshes=0,triangles=0;const names=[];gltf.scene.traverse(o=>{if(o.name)names.push(o.name);if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3}});return {meshes,triangles,names,bounds:new THREE.Box3().setFromObject(gltf.scene).getSize(new THREE.Vector3()).toArray()}},
  setCharacterVisible(value){characterVisible=value;draw()},
};
selectSoul(0);updateAppearanceControls();resize();document.querySelector('.loading').hidden=true;window.roomReady=true;
