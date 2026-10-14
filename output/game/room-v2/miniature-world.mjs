import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {createSoulVolume} from './soul-volume.mjs';
import {createGrovePaint} from './grove-paint.mjs';
import {createGroveCreatures} from './grove-creatures.mjs';
import {WORLD,CELLS,BUILDINGS,CREW,SKIES,preview} from './miniature-rules.mjs';

export function createMiniatureWorld(stage,originals){
 const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor('#dce0d8');
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;stage.prepend(renderer.domElement);
 renderer.domElement.setAttribute('aria-label','A large white miniature neighborhood with five pixel souls, a long wall and a central paint gate');
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-22,22,14,-14,.1,150),offset=new THREE.Vector3(5,21,27),target=new THREE.Vector3(0,.2,.1),pan=new THREE.Vector3();
 scene.add(new THREE.HemisphereLight('#ffffff','#b4bcb4',2.2));
 const sun=new THREE.DirectionalLight('#fff8e6',3);sun.position.set(-12,25,15);sun.castShadow=true;sun.shadow.mapSize.set(1536,1536);Object.assign(sun.shadow.camera,{left:-22,right:22,top:22,bottom:-22,near:1,far:65});sun.shadow.normalBias=.035;scene.add(sun);
 const fill=new THREE.DirectionalLight('#e7edf3',.65);fill.position.set(12,7,-12);scene.add(fill);
 const cube=new THREE.BoxGeometry(1,1,1),sphere=new THREE.IcosahedronGeometry(1,1),cylinder=new THREE.CylinderGeometry(1,1,1,12),cache=new Map(),dummy=new THREE.Object3D();
 function material(color){if(!cache.has(color))cache.set(color,new THREE.MeshStandardMaterial({color,roughness:.9}));return cache.get(color);}
 function mesh(geo,mat,pos=[0,0,0],scale=[1,1,1],parent=scene,staticPart=true){const m=new THREE.Mesh(geo,mat);m.position.set(...pos);m.scale.set(...scale);m.castShadow=true;m.receiveShadow=true;m.userData.staticPart=staticPart;parent.add(m);return m;}
 const box=(pos,size,color='#f4f4eb',parent=scene,staticPart=true)=>mesh(cube,material(color),pos,size,parent,staticPart);
 const blob=(pos,size,color='#eef0e5')=>mesh(sphere,material(color),pos,size);
 function rod(a,b,r,color='#b7c5bb',parent=scene){const x=new THREE.Vector3(...a),y=new THREE.Vector3(...b),m=mesh(cylinder,material(color),x.clone().add(y).multiplyScalar(.5).toArray(),[r,x.distanceTo(y),r],parent);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),y.sub(x).normalize());return m;}
 function label(value,x,z,width=4){const c=document.createElement('canvas');c.width=512;c.height=96;const ctx=c.getContext('2d');ctx.fillStyle='#8a9c95';ctx.font='500 32px Arial';ctx.textAlign='center';ctx.fillText(value,256,57);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;const m=mesh(new THREE.PlaneGeometry(width,width*96/512),new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,toneMapped:false}),[x,.085,z]);m.rotation.x=-Math.PI/2;m.castShadow=false;}
 // A broad, pale architectural model. Ink and the original souls carry the color.
 box([0,-.8,0],[31.7,1.5,21.7],'#c2cec5');box([0,-.16,0],[32,.20,22],'#fbfcf2');box([0,-.045,0],[31.4,.12,21.4],'#d5ddd3');
 const tiles=new THREE.InstancedMesh(cube,material('#ffffff'),32*22);
 for(let z=0;z<22;z++)for(let x=0;x<32;x++){const i=z*32+x;dummy.position.set(-15.5+x,.022,-10.5+z);dummy.scale.set(.97,.04,.97);dummy.rotation.set(0,0,0);dummy.updateMatrix();tiles.setMatrixAt(i,dummy.matrix);tiles.setColorAt(i,new THREE.Color((x+z)%5===0?'#ebeee4':'#fafbf1'));}tiles.receiveShadow=true;scene.add(tiles);
 for(const x of [-15.8,15.8])box([x,.15,0],[.24,.35,21.8]);for(const z of [-10.8,10.8])box([0,.15,z],[31.8,.35,.24]);
 // Long wall: all three approaches converge at a single, unmistakable opening.
 for(const side of [-1,1]){
  box([side*8.7,.5,-2],[13.8,.96,.72],'#e5ebde');box([side*8.7,1.03,-2],[14,.12,.94],'#fcfdf2');
  for(let i=0;i<7;i++){const x=side*(2.2+i*2.05);box([x,.66,-1.59],[.17,1.23,.28],'#d8e2d2');box([x,1.34,-2],[.38,.12,1.02]);}
 }
 const gate=new THREE.Group();gate.position.set(0,.08,-2);scene.add(gate);
 for(const x of [-1.7,1.7]){box([x,.88,0],[.3,1.7,.85],'#bacdc0',gate);box([x,1.81,0],[.53,.15,1.07],'#fbfbed',gate);}
 const shutter=new THREE.Group();shutter.position.set(0,0,-.08);gate.add(shutter);
 for(let i=0;i<5;i++)box([0,.18+i*.25,0],[3.15,.21,.25],i%2?'#dae7d7':'#ecf4e4',shutter,false);
 shutter.traverse(o=>o.castShadow=false);
 const gauge=mesh(cube,new THREE.MeshBasicMaterial({color:'#57bda5'}),[0,1.64,.26],[3.0,.075,.05],gate,false);
 const pool=mesh(sphere,new THREE.MeshBasicMaterial({color:SKIES.violet.ink}),[0,.09,-1.1],[.4,.12,.4],gate,false);pool.castShadow=false;
 const lights=[];
 for(const b of BUILDINGS){
  box([b.x,b.h/2,b.z],[b.w,b.h,b.d]);box([b.x,b.h+.06,b.z],[b.w+.18,.16,b.d+.2],'#ffffff');
  if(!b.home){box([b.x,b.h+.4,b.z],[b.w*.68,.62,b.d*.64],'#e9eee4');box([b.x,b.h+.76,b.z],[b.w*.76,.12,b.d*.73]);}
  const front=b.z+b.d/2+.045;
  for(let row=0;row<(b.home?1:Math.floor(b.h/.75));row++)for(let col=0;col<3;col++){
   const x=b.x-b.w*.28+col*b.w*.28,y=.65+row*.72;box([x,y,front],[.26,.39,.045],'#acbeb5');
   if(b.home){const l=mesh(cube,new THREE.MeshBasicMaterial({color:'#ffe6aa',toneMapped:false}),[x,y,front+.03],[.19,.30,.025],scene,false);lights.push(l);}
  }
  box([b.x,.5,front+.015],[.52,.99,.06],'#83a399');box([b.x+.14,.53,front+.06],[.03,.13,.028],'#e3c477');
  if(b.home){box([b.x,2.15,b.z+.1],[4.25,.15,3.0],'#d7c5a2');for(const x of [-1.92,1.92])rod([x,0,b.z+1.45],[x,2.13,b.z+1.45],.04,'#b6bba8');}
 }
 // A white clock tower, colonnade, stepped terraces and a little sculpture garden.
 box([-11.8,1.9,.5],[1.55,3.8,1.55]);box([-11.8,4.07,.5],[1.84,.3,1.84]);mesh(new THREE.ConeGeometry(1.23,.7,4),material('#dce6dc'),[-11.8,4.57,.5]).rotation.y=Math.PI/4;
 const clock=mesh(new THREE.CircleGeometry(.38,24),material('#c4d1c7'),[-11.8,3.15,1.29]);clock.castShadow=false;rod([-11.8,3.15,1.31],[-11.8,3.42,1.31],.018,'#718e84');rod([-11.8,3.15,1.32],[-11.58,3.08,1.32],.018,'#718e84');
 for(let i=0;i<5;i++){box([7.7+i*1.35,1.03,.6],[.3,2.06,.45]);box([7.7+i*1.35,2.1,.6],[.55,.12,.74]);}box([10.4,2.29,.6],[6.1,.24,1.05]);
 for(let i=0;i<4;i++)box([-10.5+i*.44,.12+i*.09,8.1],[.55,.20+i*.17,1.9],'#edf1e5');
 for(const [x,z] of [[-13,7.8],[-5.5,4.6],[5.6,5.7],[13,8.4],[-13,-4.5],[13,-4.8]]){
  mesh(cylinder,material('#d5dfd1'),[x,.2,z],[.75,.38,.75]);rod([x,.3,z],[x,1.8,z],.09,'#bdcbbd');blob([x,1.9,z],[.9,.83,.85]);blob([x-.35,1.7,z+.22],[.6,.6,.6]);
 }
 for(const [x,z]of [[-6.6,1.8],[6.8,3.0],[-4.6,8.6],[4.5,9.1]]){box([x,.43,z],[1.9,.15,.65],'#d4ddcd');box([x,.7,z-.28],[1.9,.47,.1],'#edf2e5');for(const dx of [-.66,.66])box([x+dx,.2,z],[.13,.38,.45],'#b8c9bc');}
 for(let i=0;i<9;i++){const x=-6+i*1.5;mesh(cylinder,material('#d5decf'),[x,.075,9.4],[.20,.025,.20]);}
 label('THE LITTLE NEIGHBORHOOD',0,9.35,7);label('NORTH GATE',0,-4.8,3.8);label('HOME',0,4.65,2.1);
 // No invisible mesh detail: static architecture is merged by material.
 gate.traverse(o=>o.userData.staticPart=false);scene.updateMatrixWorld(true);const batches=new Map();
 scene.traverse(o=>{if(!o.isMesh||o.isInstancedMesh||!o.userData.staticPart)return;const list=batches.get(o.material)||[];list.push(o);batches.set(o.material,list);});
 for(const [mat,parts]of batches){if(parts.length<2)continue;const gs=parts.map(o=>o.geometry.clone().applyMatrix4(o.matrixWorld)),g=mergeGeometries(gs);if(g){const m=new THREE.Mesh(g,mat);m.castShadow=true;m.receiveShadow=true;scene.add(m);parts.forEach(o=>o.removeFromParent());}gs.forEach(g=>g.dispose());}
 const residents=CREW.map(a=>{
  const figure=createSoulVolume(originals[a.sample],{worldWidth:1.75,depth:4});figure.traverse(o=>{o.castShadow=false;if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])m.fog=false;});scene.add(figure);
  const shadow=mesh(new THREE.CircleGeometry(.52,20),new THREE.MeshBasicMaterial({color:'#64786d',transparent:true,opacity:.18,depthWrite:false}),[a.x,.086,a.z],undefined,scene,false);shadow.rotation.x=-Math.PI/2;shadow.castShadow=false;
  const ring=mesh(new THREE.RingGeometry(.67,.72,32),new THREE.MeshBasicMaterial({color:'#c8ab70',transparent:true,opacity:.7,side:THREE.DoubleSide}),[a.x,.095,a.z],undefined,scene,false);ring.rotation.x=-Math.PI/2;ring.castShadow=false;
  const tool=new THREE.Group();scene.add(tool);box([0,.25,0],[.12,.43,.12],a.job==='repair'?'#d0b884':'#9dcbb8',tool,false);mesh(sphere,material(a.job==='repair'?'#efcd87':'#c7ffdf'),[0,.5,0],[.17,.12,.12],tool,false);tool.traverse(o=>o.castShadow=false);
  return {figure,shadow,ring,tool};
 });
 const creatures=createGroveCreatures(scene),paint=createGrovePaint(scene,{cells:CELLS,bounds:WORLD,restore:true});
 let width=1,height=1,zoom=1,selected=-1,latest=null,drag=null;
 function resize(){width=stage.clientWidth;height=stage.clientHeight;const halfH=Math.max(width<700?13:11.8,18.8*height/width);camera.left=-halfH*width/height;camera.right=halfH*width/height;camera.top=halfH;camera.bottom=-halfH;camera.zoom=zoom*(selected>=0?1.7:1);camera.updateProjectionMatrix();renderer.setSize(width,height,false);}
 const observer=new ResizeObserver(resize);observer.observe(stage);resize();
 const canvas=renderer.domElement;
 canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;drag={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);canvas.style.cursor='grabbing';});
 canvas.addEventListener('pointermove',e=>{if(!drag)return;const unit=(camera.right-camera.left)/width/camera.zoom,dx=e.clientX-drag.x,dy=e.clientY-drag.y;pan.x=THREE.MathUtils.clamp(pan.x-dx*unit,-12,12);pan.z=THREE.MathUtils.clamp(pan.z-dy*unit*1.5,-9,9);drag={x:e.clientX,y:e.clientY};});
 const endDrag=()=>{drag=null;canvas.style.cursor='grab';};canvas.addEventListener('pointerup',endDrag);canvas.addEventListener('pointercancel',endDrag);canvas.style.cursor='grab';canvas.style.touchAction='none';
 function setZoom(value){zoom=THREE.MathUtils.clamp(value,1,2.3);resize();}
 function follow(id){selected=id;pan.set(0,0,0);resize();}
 function reset(){selected=-1;pan.set(0,0,0);zoom=1;resize();}
 function project(x,y,z){const p=new THREE.Vector3(x,y,z).project(camera);return {x:(p.x*.5+.5)*width,y:(-p.y*.5+.5)*height,visible:Math.abs(p.x)<=1&&Math.abs(p.y)<=1};}
 function update({frame,territory,time,logical,weather='violet',phase='prepare',reduced=false}){
  const sky=SKIES[weather],data=phase==='encounter'&&frame?.crew?frame.crew:CREW.map((a,i)=>({...a,x:a.x+Math.sin(time*.33+i)*1.1,z:a.z+(phase==='rest'?3:0)+Math.cos(time*.4+i)*.35}));latest=data;
  const aim=selected>=0?new THREE.Vector3(data[selected].x,.35,data[selected].z):target;camera.position.copy(aim).add(pan).add(offset);camera.lookAt(aim.clone().add(pan));camera.updateMatrixWorld();
  residents.forEach((r,i)=>{const a=data[i],walking=frame&&a.job!=='guard';r.figure.position.set(a.x,.08+(reduced?0:Math.sin(time*(walking?7:3)+i)*.04),a.z);r.figure.rotation.set(0,.12,reduced?0:Math.sin(time*3+i)*.025);r.shadow.position.set(a.x,.086,a.z);r.ring.position.set(a.x,.095,a.z);r.ring.visible=selected===i;r.tool.position.set(a.x+.55,.12,a.z+.03);r.tool.visible=phase==='encounter';});
  const state=frame?.gate||{pressure:0,capacity:80,broken:false,repair:0};const p=state.pressure/state.capacity;
  shutter.rotation.x=state.broken?1.4*(1-state.repair/100):0;shutter.rotation.z=!reduced&&!state.broken&&p>.65?Math.sin(time*34)*.025:0;
  gauge.scale.x=3*(state.broken?Math.max(.03,state.repair/100):Math.max(.03,p));gauge.material.color.set(state.broken?'#d3b673':p>.7?'#eb947a':'#72bfa8');
  pool.visible=phase==='encounter'&&!state.broken&&p>.02;pool.scale.set(.65+p*1.2,.08+p*.42,.45+p*.7);pool.material.color.set(sky.ink);
  const area=territory||preview();lights.forEach(l=>l.material.color.set(area.homeClean>97?'#ffe4a3':'#c1cabc'));
  const palette={soul:'#36c89c',soulLight:'#baffd9',wild:sky.ink,wildLight:sky.highlight};
  const actor=creatures.update(frame?.enemies||[],time,reduced,palette),effects=paint.update({turf:area,effects:frame?.effects||[],logical:logical||0,reducedMotion:reduced,palette});
  renderer.render(scene,camera);
  return {...actor,...effects,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,crew:data.map(a=>({id:a.id,x:a.x,z:a.z,action:a.action||'At home',screen:project(a.x,1.1,a.z)})),gate:state,homeClean:area.homeClean,selected,zoom,pan:{x:pan.x,z:pan.z},worldArea:600};
 }
 return {update,setZoom,follow,reset,renderer,dispose(){observer.disconnect();renderer.dispose();}};
}
