import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {createSoulVolume,disposeSoulVolume} from './soul-volume.mjs';
import {SLOTS,pathPoint} from './grove-rules.mjs';
import {createGroveCreatures} from './grove-creatures.mjs';
import {createGrovePaint} from './grove-paint.mjs';
import {PALETTE} from './grove-turf.mjs';
import {ROOF,ROOF_CELLS,MARKET_SKIES,roofPreview} from './rooftop-surface.mjs';

// An original miniature rooftop, with an Art Deco skyline reference behind it.
export function createGrove(stage,originals){
  const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  stage.prepend(renderer.domElement);renderer.domElement.setAttribute('aria-label','A tiled Manhattan rooftop, two paint gates, and the Empire State Building skyline');
  const scene=new THREE.Scene();scene.fog=new THREE.FogExp2('#424866',.016);
  const camera=new THREE.OrthographicCamera(-11.5,11.5,8,-8,.1,100),target=new THREE.Vector3(0,1.7,-.8),offset=new THREE.Vector3(8.5,12,18);
  const hemi=new THREE.HemisphereLight('#d6ddf5','#655a68',2.0);scene.add(hemi);
  const sun=new THREE.DirectionalLight('#ffd5a8',3.0);sun.position.set(-6,13,9);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-12,right:12,top:13,bottom:-9,near:1,far:40});sun.shadow.normalBias=.025;scene.add(sun);
  const fill=new THREE.DirectionalLight('#a8bdff',1.2);fill.position.set(8,5,-8);scene.add(fill);
  const cube=new THREE.BoxGeometry(1,1,1),ball=new THREE.IcosahedronGeometry(1,1),cylinder=new THREE.CylinderGeometry(1,1,1,12),cache=new Map(),dummy=new THREE.Object3D();
  const material=(color,extra={})=>{const key=color+JSON.stringify(extra);if(!cache.has(key))cache.set(key,new THREE.MeshStandardMaterial({color,roughness:.82,flatShading:true,...extra}));return cache.get(key);};
  const unlit=color=>{const key='flat'+color;if(!cache.has(key))cache.set(key,new THREE.MeshBasicMaterial({color,toneMapped:false}));return cache.get(key);};
  function mesh(geometry,mat,parent=scene,pos=[0,0,0],scale=[1,1,1]){const m=new THREE.Mesh(geometry,mat);m.position.set(...pos);m.scale.set(...scale);m.castShadow=true;m.receiveShadow=true;m.userData.staticPart=true;parent.add(m);return m;}
  const box=(parent,pos,scale,color,extra)=>mesh(cube,material(color,extra),parent,pos,scale);
  const blob=(parent,pos,scale,color)=>mesh(ball,material(color),parent,pos,scale);
  function rod(parent,a,b,r,color){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),m=mesh(cylinder,material(color),parent,start.clone().add(end).multiplyScalar(.5).toArray(),[r,start.distanceTo(end),r]);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),end.sub(start).normalize());return m;}
  const windows=[];
  function windowAt(x,y,z,w,h,d,tint='#f2c887'){windows.push({x,y,z,w,h,d,tint});}
  function sign(text,parent,pos,width,height,color='#ecdfb8',ink='#304952'){
    const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle=color;ctx.fillRect(0,0,512,128);ctx.fillStyle=ink;ctx.font='600 45px Georgia';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,68);
    const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;const item=mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({map:tex,toneMapped:false,side:THREE.DoubleSide}),parent,pos);item.castShadow=false;return item;
  }
  // The main roof is a rectangular module; its two bridge sockets meet neighbours.
  const roof=new THREE.Group();roof.name='Manhattan_rooftop_module';scene.add(roof);
  box(roof,[0,-.95,.35],[14.15,1.85,9.6],'#59576b');box(roof,[0,-.15,.35],[14.42,.20,9.86],'#afa69c');
  box(roof,[0,-.015,.35],[14.15,.12,9.6],'#938c86');
  const tiles=new THREE.InstancedMesh(cube,material('#ffffff'),14*9);
  for(let row=0;row<9;row++)for(let col=0;col<14;col++){
    const i=row*14+col;dummy.position.set(-6.5+col,.035,-3.65+row);dummy.rotation.set(0,0,0);dummy.scale.set(.965,.05,.965);dummy.updateMatrix();tiles.setMatrixAt(i,dummy.matrix);tiles.setColorAt(i,new THREE.Color((row+col)%4===0?'#dfc9b2':(row+col)%2?'#f0e6d5':'#e9dcc7'));
  }tiles.receiveShadow=true;roof.add(tiles);
  // Terracotta borders and low parapets make the clean surface legible.
  for(const x of [-6.8,6.8])box(roof,[x,.045,.32],[.22,.035,8.85],'#bb7564');
  for(const z of [-4.13,4.83])box(roof,[0,.045,z],[13.8,.035,.20],'#bb7564');
  box(roof,[0,.33,-4.38],[14.2,.55,.18],'#cfc4b1');box(roof,[0,.34,5.07],[14.2,.40,.17],'#bda995');
  for(const x of [-7.04,7.04]){
    box(roof,[x,.3,2.45],[.18,.48,5.0],'#c7b69f');box(roof,[x,.3,-3.35],[.18,.48,2.1],'#c7b69f');
    for(const z of [-4.3,-2.25,0,2.4,4.9])rod(roof,[x,.42,z],[x,1.01,z],.035,'#657785');
    rod(roof,[x,1.01,.02],[x,1.01,4.95],.035,'#657785');rod(roof,[x,1.01,-4.3],[x,1.01,-2.25],.035,'#657785');
  }
  // Front facade, with a few warm occupied windows rather than a floating island.
  for(let i=0;i<13;i++){box(roof,[-6+i,-.97,5.165],[.57,.77,.055],'#354555');windowAt(-6+i,-.98,5.20,.42,.60,.025,i%3?'#d4b38a':'#526879');}
  for(const side of [-1,1]){
    const n=new THREE.Group();n.position.set(side*10.7,-.2,-1.0);scene.add(n);
    box(n,[0,-.65,0],[4.3,1.25,5.5],'#414e61');box(n,[0,.025,0],[4.45,.14,5.6],'#a3a89f');box(n,[0,.11,0],[4.2,.05,5.3],'#747f80');
    box(n,[side*.2,.7,-1.4],[1.8,1.2,1.1],'#7d7b7a');box(n,[side*.2,1.35,-1.4],[1.94,.1,1.2],'#a5a491');
    const bridge=box(scene,[side*7.82,.00,-1.42],[1.52,.12,1.26],'#a5a49c');
    for(const z of [-1.98,-.88]){rod(scene,[side*7.05,.22,z],[side*8.6,.22,z],.045,'#bbc3bc');rod(scene,[side*7.05,.65,z],[side*8.6,.65,z],.035,'#91a4a6');}
    for(let i=0;i<5;i++)box(scene,[side*(7.12+i*.29),.079,-1.42],[.11,.018,1.08],'#d6c09b');
    sign('NEXT ROOF',n,[0,.43,2.79],2.5,.42,'#647582','#c8d3cf');
  }
  // Utility room and a distinctly New York timber water tank.
  const hut=new THREE.Group();hut.position.set(0,0,-3.03);roof.add(hut);
  box(hut,[0,.78,0],[2.45,1.5,1.72],'#bc8a71');box(hut,[0,1.57,0],[2.65,.14,1.91],'#dec6a6');
  for(let row=0;row<6;row++)box(hut,[0,.17+row*.23,.871],[2.45,.023,.02],'#a97761');
  box(hut,[0,.65,.9],[.77,1.27,.055],'#416a70');box(hut,[.23,.7,.943],[.035,.19,.026],'#e7cc86');
  sign('SOULI',hut,[0,1.36,.951],1.33,.29,'#e8cf9b','#4a5660');
  for(const x of [-.86,.86]){box(hut,[x,.89,.90],[.39,.54,.055],'#55646b');mesh(cube,unlit('#f4d29d'),hut,[x,.9,.936],[.29,.43,.016]);}
  const tank=new THREE.Group();tank.position.set(-5.2,0,-3.17);roof.add(tank);
  for(const x of [-.51,.51])for(const z of [-.51,.51])rod(tank,[x,.08,z],[x,1.08,z],.055,'#606d70');
  mesh(cylinder,material('#af8361'),tank,[0,1.72,0],[.82,1.34,.82]);
  for(let i=0;i<16;i++){const a=i*Math.PI/8;rod(tank,[Math.cos(a)*.825,1.06,Math.sin(a)*.825],[Math.cos(a)*.825,2.36,Math.sin(a)*.825],.022,'#d2a983');}
  for(const y of [1.18,2.14])mesh(new THREE.TorusGeometry(.83,.035,5,20),material('#566771'),tank,[0,y,0]).rotation.x=Math.PI/2;
  mesh(new THREE.ConeGeometry(.94,.45,12),material('#55757c'),tank,[0,2.58,0]);
  const lounge=new THREE.Group();lounge.position.set(4.2,0,-3.1);roof.add(lounge);
  for(const x of [-1.05,1.05])rod(lounge,[x,0,-.25],[x,2.15,-.25],.043,'#8a7766');
  box(lounge,[0,2.17,-.25],[2.55,.09,1.4],'#d59478');box(lounge,[0,.33,.15],[2.3,.16,.58],'#8f6650');box(lounge,[0,.65,-.07],[2.3,.5,.10],'#ab7d60');
  for(const x of [-.87,.87])box(lounge,[x,.15,.15],[.12,.32,.50],'#5b6c73');
  for(const [x,z] of [[-5.7,3.9],[5.7,3.9],[-2.2,-3.4],[2.3,-3.4]]){
    box(roof,[x,.27,z],[1.1,.43,.63],'#d0aa86');box(roof,[x,.49,z],[.95,.035,.51],'#6d6257');
    for(let i=0;i<3;i++){rod(roof,[x-.30+i*.3,.47,z],[x-.30+i*.3,.91+i%2*.18,z],.018,'#506e57');blob(roof,[x-.3+i*.3,.90+i%2*.18,z],[.27,.21,.23],i%2?'#7f9f71':'#4b8472');}
  }
  // Skyline: simplified surrounding blocks and a recognisable stepped ESB crown.
  for(let i=0;i<18;i++){
    const x=-16+i*1.9,z=-11.8-(i%3)*1.3,h=2.2+(i*7%11)*.35,w=1.3+(i%3)*.18;
    box(scene,[x,h/2-2.4,z],[w,h,1.45],['#4e5b74','#53647a','#616a80'][i%3]);
    for(let row=0;row<Math.floor(h/.5);row++)for(let col=0;col<2;col++)if((i+row+col)%3!==0)windowAt(x-.28+col*.56,-2.1+row*.48,z+.739,.14,.22,.015,(i+row)%4?'#8397a7':'#e8bb84');
  }
  const empire=new THREE.Group();empire.name='Empire_State_skyline_study';empire.position.set(-1.7,-2.5,-6.6);scene.add(empire);
  const tiers=[{y:1.1,w:3.25,h:2.2,d:2.5},{y:3.65,w:2.30,h:3.1,d:1.95},{y:5.65,w:1.94,h:1.1,d:1.65},{y:6.48,w:1.58,h:.56,d:1.4},{y:7.05,w:1.13,h:.60,d:1.05},{y:7.55,w:.72,h:.42,d:.72},{y:8.12,w:.41,h:.75,d:.43}];
  for(const t of tiers){
    box(empire,[0,t.y,0],[t.w,t.h,t.d],'#bfc4c4');box(empire,[0,t.y+t.h/2+.035,0],[t.w+.13,.07,t.d+.13],'#d8d2c4');
    for(let col=-1;col<=1;col++)box(empire,[col*t.w*.31,t.y,t.d/2+.012],[.055,t.h,.032],'#e1d7c5');
    const columns=Math.max(1,Math.floor(t.w/.31)),rows=Math.max(1,Math.floor(t.h/.25));
    for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){
      const x=-t.w*.4+col*(t.w*.8/Math.max(1,columns-1)),y=t.y-t.h*.42+row*t.h*.84/Math.max(1,rows-1);
      windowAt(empire.position.x+x,empire.position.y+y,empire.position.z+t.d/2+.035,.10,.12,.02,(col+row)%4?'#5e7181':'#e6bc86');
      windowAt(empire.position.x+t.w/2+.025,empire.position.y+y,empire.position.z+x*.75,.018,.12,.09,'#6b8090');
    }
  }
  rod(empire,[0,8.45,0],[0,10.1,0],.045,'#d0d2d0');rod(empire,[0,9.16,0],[0,10.48,0],.018,'#e3dacc');
  const crown=mesh(cube,unlit('#ffe2a8'),empire,[0,8.08,.245],[.23,.68,.02]);
  const cityWindows=new THREE.InstancedMesh(cube,new THREE.MeshBasicMaterial({color:'#ffffff'}),windows.length);
  windows.forEach((w,i)=>{dummy.position.set(w.x,w.y,w.z);dummy.scale.set(w.w,w.h,w.d);dummy.rotation.set(0,0,0);dummy.updateMatrix();cityWindows.setMatrixAt(i,dummy.matrix);cityWindows.setColorAt(i,new THREE.Color(w.tint));});scene.add(cityWindows);
  // Festoon lights come back as clean tiles are uncovered.
  const bulbs=[];
  for(const x of [-6.5,6.5])rod(roof,[x,0,-.2],[x,2.7,-.2],.038,'#5e7180');
  let last=[-6.5,2.7,-.2];
  for(let i=1;i<=16;i++){const x=-6.5+i*13/16,y=2.7-Math.sin(i/16*Math.PI)*.52;rod(roof,last,[x,y,-.2],.013,'#576c7a');last=[x,y,-.2];const b=mesh(new THREE.SphereGeometry(.075,6,5),unlit('#65594b').clone(),roof,[x,y-.12,-.2]);b.castShadow=false;bulbs.push(b);}
  const lamp=new THREE.Group();lamp.position.set(0,.08,2);roof.add(lamp);
  mesh(cylinder,material('#b8a98e'),lamp,[0,.08,0],[.43,.15,.43]);rod(lamp,[0,.16,0],[0,1.08,0],.055,'#607c82');
  const lampGlow=mesh(new THREE.IcosahedronGeometry(.22,1),unlit('#ffe9b3').clone(),lamp,[0,1.25,0],[1,1.35,1]);
  mesh(new THREE.ConeGeometry(.32,.2,8),material('#527881'),lamp,[0,1.6,0]);
  // Two visible pressure gates: opaque shutters give way to an open arch.
  const gates=[0,1].map(lane=>{
    const p=pathPoint(lane,.18),g=new THREE.Group();g.position.set(p.x,.08,p.z);g.rotation.y=lane===0?-.55:.55;roof.add(g);
    for(const x of [-.83,.83]){box(g,[x,.55,0],[.13,1.08,.19],'#526f7a');mesh(cube,unlit('#dabd82'),g,[x,1.12,0],[.20,.10,.26]);}
    const shutter=new THREE.Group();shutter.position.set(0,.17,0);g.add(shutter);
    for(let i=0;i<4;i++)box(shutter,[0,.12+i*.19,0],[1.48,.15,.12],i%2?'#abc6bc':'#d8e0cd');
    const gauge=mesh(cube,unlit('#7de1c1').clone(),g,[0,1.02,.11],[1.4,.045,.025]);
    const pool=mesh(ball,unlit('#8e56d9').clone(),g,[0,.035,-.64],[.6,.08,.48]);pool.castShadow=false;
    return {group:g,shutter,gauge,pool};
  });
  const slots=SLOTS.map(slot=>{const g=new THREE.Group();g.position.set(slot.x,.085,slot.z);roof.add(g);const ring=mesh(new THREE.RingGeometry(.42,.46,24),unlit('#b8a989'),g,[0,.005,0]);ring.rotation.x=-Math.PI/2;ring.castShadow=false;return {g,ring};});
  let layoutKey='';
  function buildTool(type){
    const g=new THREE.Group();g.name='facility';
    if(type==='lantern'){
      mesh(cylinder,material('#89a39d'),g,[0,.12,0],[.27,.22,.27]);rod(g,[0,.22,0],[0,1.04,0],.045,'#607d82');
      mesh(ball,unlit('#b4ffe1'),g,[0,1.08,0],[.17,.19,.17]);mesh(new THREE.ConeGeometry(.3,.16,8),material('#c5a76e'),g,[0,1.30,0]);
    }else if(type==='chime'){
      box(g,[0,.09,0],[.66,.14,.45],'#b0bfb3');rod(g,[0,.13,0],[0,.81,0],.048,'#758d8e');
      mesh(new THREE.TorusGeometry(.28,.035,5,18),material('#718e94'),g,[0,1.0,0]);
      for(let i=0;i<3;i++){const a=i*Math.PI*2/3;blob(g,[Math.sin(a)*.12,1+Math.cos(a)*.12,.015],[.1,.15,.035],'#badacc');}
    }else if(type==='fence'){
      for(const x of [-.48,.48])box(g,[x,.30,0],[.13,.6,.25],'#819b98');box(g,[0,.35,0],[1.03,.24,.22],'#d8bd85');
      for(let i=0;i<9;i++)rod(g,[-.42+i*.105,.19,.08],[-.42+i*.105,.035,.13],.028,'#587e78');
    }else{
      mesh(cylinder,material('#d2c4a7'),g,[0,.18,0],[.37,.3,.37]);mesh(cylinder,unlit('#a4e8dc'),g,[0,.34,0],[.32,.014,.32]);
      mesh(ball,unlit('#eafbd8'),g,[0,.64,0],[.09,.12,.09]);
    }return g;
  }
  function setLayout(layout){const key=JSON.stringify(layout);if(key===layoutKey)return;layoutKey=key;renderer.shadowMap.needsUpdate=true;
    slots.forEach(({g},i)=>{const old=g.getObjectByName('facility');if(old){g.remove(old);old.traverse(o=>{if(o.geometry&&![cube,ball,cylinder].includes(o.geometry))o.geometry.dispose();});}if(layout[i])g.add(buildTool(layout[i]));});
  }
  const creatures=createGroveCreatures(scene),paint=createGrovePaint(scene,{cells:ROOF_CELLS,bounds:ROOF,restore:true});
  let figure=null,soulIndex=-1,close=false,weather='',width=1,height=1;
  const contact=mesh(new THREE.CircleGeometry(.42,20),new THREE.MeshBasicMaterial({color:'#504343',transparent:true,opacity:.17,depthWrite:false}),scene,[0,.09,0]);contact.rotation.x=-Math.PI/2;contact.castShadow=false;
  const nozzle=new THREE.Group();scene.add(nozzle);box(nozzle,[0,.06,0],[.13,.30,.13],'#a8d9c7');mesh(ball,unlit('#dbfff0'),nozzle,[0,.24,0],[.12,.08,.13]);nozzle.traverse(o=>o.castShadow=false);
  const key=mesh(new THREE.OctahedronGeometry(.15),unlit('#f8d999'),roof,[-4.9,.6,-2.25]);key.castShadow=false;
  for(const item of [...bulbs,crown,lampGlow,contact,key,nozzle,...gates.map(g=>g.group),...slots.map(s=>s.g)])item.traverse(o=>o.userData.staticPart=false);
  // Join static pieces by material once; windows and tiles are already instanced.
  scene.updateMatrixWorld(true);
  const batches=new Map();
  scene.traverse(o=>{if(!o.isMesh||o.isInstancedMesh||!o.userData.staticPart)return;const list=batches.get(o.material)||[];list.push(o);batches.set(o.material,list);});
  for(const [mat,parts] of batches){
    if(parts.length<2)continue;
    const geometries=parts.map(o=>o.geometry.clone().applyMatrix4(o.matrixWorld)),merged=mergeGeometries(geometries);
    if(merged){const m=new THREE.Mesh(merged,mat);m.castShadow=parts.some(o=>o.castShadow);m.receiveShadow=true;scene.add(m);parts.forEach(o=>o.removeFromParent());}
    geometries.forEach(g=>g.dispose());
  }
  function setSoul(index){if(index===soulIndex)return;soulIndex=index;if(figure){scene.remove(figure);disposeSoulVolume(figure);}figure=createSoulVolume(originals[index],{depth:4,roundness:.14,worldWidth:originals[index].dot?1.55:1.3});figure.rotation.y=.08;figure.traverse(o=>{o.castShadow=false;if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])m.fog=false;});scene.add(figure);}
  function resize(){width=stage.clientWidth;height=stage.clientHeight;const halfW=width<600?9.3:11.8,halfH=Math.max(7.0,halfW*height/width);camera.left=-halfH*width/height;camera.right=halfH*width/height;camera.top=halfH;camera.bottom=-halfH;camera.zoom=close?1.65:1;camera.updateProjectionMatrix();renderer.setSize(width,height,false);}
  function focusSoul(value){close=value;resize();}
  const observer=new ResizeObserver(resize);observer.observe(stage);resize();
  function project(x,y,z){const p=new THREE.Vector3(x,y,z).project(camera);return {x:(p.x*.5+.5)*width,y:(-p.y*.5+.5)*height,visible:Math.abs(p.x)<=1&&Math.abs(p.y)<=1};}
  function update({time,soulPosition,frame,territory,gates:gateStates,layout,index,weather:nextWeather,discovered,reducedMotion=false}){
    setSoul(index);setLayout(layout);const profile=MARKET_SKIES[nextWeather],palette={...PALETTE,wild:profile.ink,wildLight:profile.highlight};
    if(nextWeather!==weather){weather=nextWeather;stage.dataset.weather=weather;renderer.setClearColor(profile.sky);scene.fog.color.set(profile.sky);sun.color.set(weather==='fog'?'#ffddbe':'#ffd0ac');fill.color.set(weather==='fog'?'#9cbdff':'#dab8f3');}
    const soul=new THREE.Vector3(soulPosition.x,.11,soulPosition.z);figure.position.copy(soul);figure.position.y+=reducedMotion?0:Math.sin(time*3.5)*.035;figure.rotation.z=reducedMotion?0:Math.sin(time*2.2)*.02;
    contact.position.set(soul.x,.091,soul.z);nozzle.position.set(soul.x+.5,.42,soul.z);nozzle.visible=!!frame;
    const aim=close?soul.clone().add(new THREE.Vector3(0,.8,-.25)):target;camera.position.copy(aim).add(offset);camera.lookAt(aim);camera.updateMatrixWorld();
    key.visible=!discovered;key.position.y=.6+(reducedMotion?0:Math.sin(time*2)*.08);key.rotation.y=reducedMotion?0:time*.8;
    const area=territory||roofPreview(),clean=area.clean/100;
    const lit=Math.max(0,Math.min(1,(clean-.50)/.40));
    bulbs.forEach((b,i)=>b.material.color.set(i/bulbs.length<lit?'#ffe0a0':'#686564'));crown.material.color.set(clean>=.8?'#ffe9bc':'#9caabe');lampGlow.material.color.set(clean>=.8?'#fff0bb':'#b7c5bf');
    gates.forEach((g,i)=>{
      const data=gateStates?.[i],pressure=data?data.pressure/data.capacity:0;
      g.shutter.rotation.x=data?.broken?1.42:0;g.shutter.rotation.z=!reducedMotion&&pressure>.6&&!data?.broken?Math.sin(time*35)*.025*pressure:0;
      g.gauge.material.color.set(data?.broken?'#a08c84':pressure>.66?'#f0aa78':'#8cdfc3');g.gauge.scale.x=1.4*(data?.broken ? .04 : Math.max(.04,pressure));
      g.pool.visible=!!frame&&!data?.broken;g.pool.material.color.set(profile.ink);g.pool.scale.set(.55+pressure*.48,.07+pressure*.22,.42+pressure*.25);
    });
    slots.forEach(({g,ring},i)=>{ring.visible=!frame;const pulse=frame?.pulses.some(p=>p.slot===i),facility=g.getObjectByName('facility');if(facility)facility.rotation.z=!reducedMotion&&pulse?Math.sin(time*20)*.05:0;});
    const actorStats=creatures.update(frame?.enemies,time,reducedMotion,palette),effectStats=paint.update({turf:area,effects:frame?.effects,logical:frame?.logical||0,reducedMotion,palette});
    renderer.render(scene,camera);
    return {slots:SLOTS.map(s=>project(s.x,.22,s.z)),soul:project(soul.x,.7,soul.z),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,clean:area.clean,litBulbs:Math.ceil(lit*bulbs.length),landmark:'Empire State Building',landmarkTop:project(-1.7,7.98,-6.6),gates:gateStates?.map(g=>({pressure:g.pressure,capacity:g.capacity,broken:g.broken}))||[],...actorStats,...effectStats};
  }
  return {update,resize,focusSoul,renderer,scene,camera,dispose(){observer.disconnect();renderer.dispose();}};
}
