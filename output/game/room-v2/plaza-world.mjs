import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {buildPlaza} from './plaza-model.mjs';
import {createPlazaPaint} from './plaza-paint.mjs';
import {combatBeat} from './plaza-beats.mjs';
import {createPlazaActors} from './plaza-actors.mjs';

export function createPlazaWorld(stage,originals,{onStageClick,onHoverGround}={}){
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.04;
 renderer.setClearColor('#d8e4de');renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
 const canvas=renderer.domElement;canvas.setAttribute('aria-label','Five souls defending the porcelain gate, gathering sparks, and upgrading the square');stage.prepend(canvas);
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-15,15,9,-9,.1,120);
 const envScene=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer),environment=pmrem.fromScene(envScene,.035);scene.environment=environment.texture;scene.environmentIntensity=.35;envScene.dispose();pmrem.dispose();
 scene.add(new THREE.HemisphereLight('#f2f8ff','#7c887e',1.12));const sun=new THREE.DirectionalLight('#fff0d2',3.45);sun.position.set(-10,20,12);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-20,right:20,top:20,bottom:-17,near:1,far:60});sun.shadow.bias=-.00035;sun.shadow.normalBias=.055;sun.shadow.radius=2;scene.add(sun);
 const fill=new THREE.DirectionalLight('#bfe6f0',.74);fill.position.set(9,7,-8);scene.add(fill);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:'#bfd0ca',roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-1.32;floor.receiveShadow=true;scene.add(floor);
 const model=buildPlaza();scene.add(model.root);const paint=createPlazaPaint(scene),actors=createPlazaActors(scene,originals);
 let width=1,height=1,selected=-1,overview=false,latest=null,disposed=false,drag=null,downPoint=null,pan=new THREE.Vector3(),lastShadow=-1;
 const aim=new THREE.Vector3(0,.2,-.8),desired=new THREE.Vector3(),offset=new THREE.Vector3();
 const raycaster=new THREE.Raycaster(),pointerNdc=new THREE.Vector2(),groundPlane=new THREE.Plane(new THREE.Vector3(0,1,0),-.09),hitPoint=new THREE.Vector3();

 function screenToGround(clientX,clientY){
  const rect=canvas.getBoundingClientRect();
  if(!rect.width||!rect.height)return null;
  pointerNdc.x=((clientX-rect.left)/rect.width)*2-1;
  pointerNdc.y=-((clientY-rect.top)/rect.height)*2+1;
  raycaster.setFromCamera(pointerNdc,camera);
  return raycaster.ray.intersectPlane(groundPlane,hitPoint)?{x:hitPoint.x,z:hitPoint.z}:null;
 }

 function resize(){width=Math.max(1,stage.clientWidth);height=Math.max(1,stage.clientHeight);renderer.setSize(width,height,false);setCamera(0,true);if(latest)draw(...latest,true);}
 function setCamera(dt=1/30,immediate=false){
  desired.set(0,.28,-.6).add(pan);if(selected>=0&&latest){const a=latest[0].crew[selected];desired.set(a.x,.55,a.z).add(pan);}
  if(immediate)aim.copy(desired);else aim.lerp(desired,1-Math.exp(-dt*5));
  const mobile=width<650,halfH=selected>=0?(mobile?4.5*height/width:4.4):(mobile?6.7*height/width:overview?10.1:8.8);
  const beat=latest?combatBeat(latest[0],latest[2]):{burst:0,shake:0},t=latest?.[1]||0;
  camera.left=-halfH*width/height;camera.right=halfH*width/height;camera.top=halfH;camera.bottom=-halfH;camera.zoom=latest&&!latest[2]&&!overview&&selected<0?1+Math.min(.045,latest[0].pressure*.045)+beat.burst*.035:1;camera.updateProjectionMatrix();offset.set(mobile?1.5:7.5,18,26);camera.position.copy(aim).add(offset);camera.lookAt(aim);
  const shake=beat.shake*(mobile?.65:1);camera.position.x+=Math.sin(t*83)*shake;camera.position.y+=Math.cos(t*97)*shake*.5;camera.rotateZ(Math.sin(t*69)*shake*.018);camera.updateMatrixWorld();
 }
 function project(x,y,z){const p=new THREE.Vector3(x,y,z).project(camera);return {x:(p.x*.5+.5)*width,y:(-.5*p.y+.5)*height,visible:Math.abs(p.x)<1&&Math.abs(p.y)<1};}
 let stats={};
 function draw(data,time=0,reduced=false,weather='violet',immediate=false,idleState=null){
  if(disposed)return;
  const effectiveIdle=idleState||latest?.[4]||null;
  latest=[data,time,reduced,weather,effectiveIdle];
  setCamera(1/30,immediate);
  const changed=model.update(data,time,reduced,effectiveIdle);
  if(time<lastShadow||((changed||time-lastShadow>3)&&time-lastShadow>.18)){renderer.shadowMap.needsUpdate=true;lastShadow=time;}
  const people=actors.update(data,time,reduced,weather,effectiveIdle,selected);
  const pigment=paint.update(data,time,reduced,weather,effectiveIdle);
  renderer.render(scene,camera);
  stats={...people,...pigment,combat:combatBeat(data,reduced),gate:{...data.gate},phase:data.phase,logical:data.logical,homeClean:data.turf.homeClean,selected,overview,width,height,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,resources:{...renderer.info.memory},crew:data.crew.map((a,i)=>({id:a.id,job:a.job,action:a.action,contribution:a.contribution,screen:project(a.x,.8,a.z),pixels:actors.souls[i].figure.userData.visiblePixelCount}))};
  return stats;
 }
 const observer=new ResizeObserver(resize);observer.observe(stage);resize();
 const down=e=>{if(e.button!==0)return;drag={x:e.clientX,y:e.clientY};downPoint={x:e.clientX,y:e.clientY,moved:0};try{canvas.setPointerCapture(e.pointerId);}catch{}};
 const move=e=>{
  const pt=screenToGround(e.clientX,e.clientY);
  if(pt&&onHoverGround)onHoverGround(pt.x,pt.z);
  if(!drag)return;
  const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
  if(downPoint)downPoint.moved+=Math.hypot(dx,dy);
  const unit=(camera.right-camera.left)/width;
  pan.x=THREE.MathUtils.clamp(pan.x-dx*unit,-7,7);
  pan.z=THREE.MathUtils.clamp(pan.z-dy*unit*1.4,-6,7);
  drag={x:e.clientX,y:e.clientY};
 };
 const up=e=>{
  const wasTap=downPoint&&downPoint.moved<7;
  drag=null;downPoint=null;
  if(wasTap&&onStageClick&&latest){
   const pt=screenToGround(e.clientX,e.clientY);
   if(!pt)return;
   const crew=latest[0]?.crew||[];
   const hitSoul=crew.find(c=>Math.hypot(c.x-pt.x,c.z-pt.z)<1.35);
   if(hitSoul)onStageClick({kind:'soul',soulId:hitSoul.id,x:hitSoul.x,z:hitSoul.z});
   else if(Math.abs(pt.x)<11.2&&Math.abs(pt.z)<8.8)onStageClick({kind:'ground',x:pt.x,z:pt.z});
  }
 };
 const cancel=()=>{drag=null;downPoint=null;};
 canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',cancel);
 function dispose(){if(disposed)return;disposed=true;observer.disconnect();for(const [name,fn]of [['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',cancel]])canvas.removeEventListener(name,fn);paint.dispose();const gs=new Set(),ms=new Set(),ts=new Set();scene.traverse(o=>{o.shadow?.dispose();if(o.geometry)gs.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material]){ms.add(m);for(const v of Object.values(m))if(v?.isTexture)ts.add(v);}});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());ts.forEach(t=>t.dispose());environment.dispose();scene.clear();renderer.dispose();renderer.forceContextLoss();canvas.remove();}
 return {draw,renderer,model,getStats:()=>stats,follow(id){selected=id;pan.set(0,0,0);},toggleOverview(){overview=!overview;selected=-1;pan.set(0,0,0);},reset(){selected=-1;pan.set(0,0,0);},dispose};
}
