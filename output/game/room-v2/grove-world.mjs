import * as THREE from 'three';
import {createSoulVolume,disposeSoulVolume} from './soul-volume.mjs';
import {PATHS,SLOTS,TOOLS} from './grove-rules.mjs';
import {createGroveCreatures} from './grove-creatures.mjs';
import {createGrovePaint} from './grove-paint.mjs';
import {PALETTE} from './grove-turf.mjs';

export function createGrove(stage,originals){
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor('#18373b');
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
  stage.prepend(renderer.domElement);renderer.domElement.setAttribute('aria-label','A miniature forest, two paths, and a little lantern home');
  const scene=new THREE.Scene();scene.fog=new THREE.FogExp2('#18373b',.017);
  const camera=new THREE.OrthographicCamera(-8,8,6,-6,.1,80);
  const target=new THREE.Vector3(0,.3,0);camera.position.set(0,12,15);camera.lookAt(target);
  const hemi=new THREE.HemisphereLight('#c8e0cf','#27312d',2.25);scene.add(hemi);
  const sun=new THREE.DirectionalLight('#ffe5b7',3.4);sun.position.set(-6,12,8);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);
  Object.assign(sun.shadow.camera,{left:-9,right:9,top:9,bottom:-9,near:1,far:35});sun.shadow.normalBias=.035;sun.shadow.bias=-.0003;scene.add(sun);
  const fill=new THREE.DirectionalLight('#829aca',.85);fill.position.set(7,6,-3);scene.add(fill);
  const materials=new Map();
  const mat=(color,extra={})=>{const key=color+JSON.stringify(extra);if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial({color,roughness:.95,flatShading:true,...extra}));return materials.get(key);};
  const basic=color=>{const key=`basic:${color}`;if(!materials.has(key))materials.set(key,new THREE.MeshBasicMaterial({color,toneMapped:false}));return materials.get(key);};
  const cube=new THREE.BoxGeometry(1,1,1),sphere=new THREE.IcosahedronGeometry(1,1),cylinder=new THREE.CylinderGeometry(1,1,1,10);
  function mesh(geometry,material,parent=scene,pos=[0,0,0],scale=[1,1,1]){const item=new THREE.Mesh(geometry,material);item.position.set(...pos);item.scale.set(...scale);item.castShadow=true;item.receiveShadow=true;parent.add(item);return item;}
  function box(parent,pos,scale,color){return mesh(cube,mat(color),parent,pos,scale);}
  function blob(parent,pos,scale,color){return mesh(sphere,mat(color),parent,pos,scale);}
  function rod(parent,a,b,r,color){const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b),mid=va.clone().add(vb).multiplyScalar(.5);const item=mesh(cylinder,mat(color),parent,mid.toArray(),[r,va.distanceTo(vb),r]);item.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),vb.sub(va).normalize());return item;}
  const land=new THREE.Group();land.name='Lantern_Grove';scene.add(land);
  mesh(new THREE.CylinderGeometry(7.6,6.9,.75,15),mat('#394c3c'),land,[0,-.42,0],[1,1,.73]);
  mesh(new THREE.CylinderGeometry(7.15,5.8,1.0,15),mat('#283e36'),land,[0,-1.17,0],[1,1,.73]);
  mesh(new THREE.CylinderGeometry(7.55,7.6,.14,15),mat('#63805a'),land,[0,-.03,0],[1,1,.73]);
  const moss=new THREE.InstancedMesh(new THREE.CircleGeometry(1,12),mat('#739168'),28);const dummy=new THREE.Object3D();
  for(let i=0;i<28;i++){const angle=i*2.399,r=1+((i*11)%53)/10;dummy.position.set(Math.cos(angle)*r,.051,Math.sin(angle)*r*.66);dummy.rotation.set(-Math.PI/2,0,i);dummy.scale.set(.4+(i%5)*.18,.25+(i%4)*.16,1);dummy.updateMatrix();moss.setMatrixAt(i,dummy.matrix);}moss.receiveShadow=true;land.add(moss);
  function ribbon(points,width,color,y=.065){
    const curve=new THREE.CatmullRomCurve3(points.map(([x,z])=>new THREE.Vector3(x,y,z))),vertices=[],indices=[];
    for(let i=0;i<=70;i++){const p=curve.getPoint(i/70),t=curve.getTangent(i/70),n=new THREE.Vector3(-t.z,0,t.x).normalize().multiplyScalar(width/2);vertices.push(p.x+n.x,y,p.z+n.z,p.x-n.x,y,p.z-n.z);if(i<70){const a=i*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();const road=mesh(geo,mat(color,{side:THREE.DoubleSide}),land);road.castShadow=false;return road;
  }
  PATHS.forEach(points=>ribbon(points,.63,'#b3ac7a'));
  ribbon([[-6.8,-1.9],[-5.1,-3.2],[-2.4,-3.9],[1,-4.1],[4.5,-3.2],[6.7,-2.2]],.7,'#367d80',.06);
  ribbon([[-6.8,-1.9],[-5.1,-3.2],[-2.4,-3.9],[1,-4.1],[4.5,-3.2],[6.7,-2.2]],.3,'#6aada3',.068);
  // Batched foliage and stones keep repeated scenery inexpensive.
  const treePositions=[[-6.3,-.9],[-5.8,-3.1],[-4.25,-4],[-2.65,-4.8],[.6,-4.6],[2.2,-4.4],[4.3,-4.0],[5.6,-3.1],[6.35,-.75],[-6.0,2.3],[6.2,2.0]];
  const trunks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.15,.3,1,7),mat('#514a32'),treePositions.length);
  const crowns=new THREE.InstancedMesh(sphere,mat('#ffffff'),treePositions.length*3);
  treePositions.forEach(([x,z],i)=>{
    const h=1.9+(i%3)*.5;dummy.position.set(x,h/2,z);dummy.rotation.set(0,i,0);dummy.scale.set(1,h,1);dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);
    for(let n=0;n<3;n++){dummy.position.set(x+(n-1)*.47,h+.15+(n===1?.6:0),z+(n%2)*.25);dummy.scale.set(1.05,.9,1);dummy.updateMatrix();crowns.setMatrixAt(i*3+n,dummy.matrix);crowns.setColorAt(i*3+n,new THREE.Color(['#376b53','#4a7c59','#5c8a60'][(i+n)%3]));}
  });trunks.castShadow=true;crowns.castShadow=true;land.add(trunks,crowns);
  const rocks=new THREE.InstancedMesh(sphere,mat('#83937c'),30);
  for(let i=0;i<30;i++){const a=i*2.399,r=3.8+((i*7)%24)/10;dummy.position.set(Math.cos(a)*r,.15,Math.sin(a)*r*.64);dummy.rotation.set(i,i*.6,0);dummy.scale.set(.16+i%3*.1,.14+i%4*.04,.2);dummy.updateMatrix();rocks.setMatrixAt(i,dummy.matrix);}rocks.castShadow=true;land.add(rocks);
  const stems=new THREE.InstancedMesh(cylinder,mat('#ddd0a1'),18),caps=new THREE.InstancedMesh(new THREE.ConeGeometry(.22,.15,8),mat('#dba480'),18);
  for(let i=0;i<18;i++){const a=i*2.399,r=3.6+i%5*.3,x=Math.cos(a)*r,z=Math.sin(a)*r*.6;dummy.position.set(x,.19,z);dummy.rotation.set(0,0,0);dummy.scale.set(.045,.3,.045);dummy.updateMatrix();stems.setMatrixAt(i,dummy.matrix);dummy.position.y=.38;dummy.scale.set(1,1,1);dummy.updateMatrix();caps.setMatrixAt(i,dummy.matrix);}land.add(stems,caps);
  const grass=new THREE.InstancedMesh(new THREE.ConeGeometry(.08,.4,3),mat('#adc28b'),75);
  for(let i=0;i<75;i++){const a=i*2.399,r=2.4+((i*13)%39)/10;dummy.position.set(Math.cos(a)*r,.19,Math.sin(a)*r*.67);dummy.rotation.set(.1,i,0);dummy.scale.set(1,.7+i%3*.2,1);dummy.updateMatrix();grass.setMatrixAt(i,dummy.matrix);}land.add(grass);
  // A modest timber home. Its warm doorway remains a readable point of return.
  const home=new THREE.Group();home.position.set(.1,0,-1.95);land.add(home);
  box(home,[0,.68,0],[2.35,1.35,1.45],'#806443');
  for(let i=0;i<7;i++)box(home,[0,.12+i*.19,.741],[2.4,.075,.075],i%2?'#8e7550':'#9d8055');
  const roof=new THREE.ConeGeometry(1.9,1.15,4);const roofMesh=mesh(roof,mat('#35554d'),home,[0,1.94,0],[1.1,1,.75]);roofMesh.rotation.y=Math.PI/4;
  box(home,[0,.52,.79],[.65,1.02,.05],'#362f28');
  mesh(cube,basic('#edc174'),home,[0,.52,.825],[.42,.77,.025]);
  for(const x of [-.77,.77]){box(home,[x,.77,.79],[.42,.44,.07],'#4d4535');mesh(cube,basic('#d6b476'),home,[x,.77,.83],[.29,.29,.025]);}
  box(home,[0,.09,1.08],[1.0,.18,.45],'#b3a57b');
  rod(home,[-1.35,.05,-.5],[-1.35,1.5,-.5],.065,'#775d40');
  const banner=mesh(new THREE.PlaneGeometry(.58,.65),mat('#c49355',{side:THREE.DoubleSide}),home,[-1.05,1.11,-.5]);banner.rotation.y=.12;
  const beacon=new THREE.Group();beacon.position.set(0,.08,2);land.add(beacon);
  mesh(new THREE.CylinderGeometry(.62,.75,.26,10),mat('#939277'),beacon,[0,.1,0]);
  mesh(new THREE.CylinderGeometry(.4,.47,.18,10),mat('#c1b897'),beacon,[0,.3,0]);
  rod(beacon,[0,.38,0],[0,1.53,0],.1,'#886b44');
  mesh(cylinder,mat('#69553a'),beacon,[0,1.48,0],[.4,.1,.4]);
  const flame=mesh(new THREE.IcosahedronGeometry(.25,1),basic('#ffe1a1'),beacon,[0,1.85,0],[1,1.5,1]);
  mesh(new THREE.ConeGeometry(.42,.35,6),mat('#566550'),beacon,[0,2.3,0]);
  for(const x of [-.27,.27])for(const z of [-.27,.27])rod(beacon,[x,1.5,z],[x,2.14,z],.025,'#95754d');
  const light=new THREE.PointLight('#ffcc78',7,7,2);light.position.set(0,2.0,2);scene.add(light);
  const glowCanvas=document.createElement('canvas');glowCanvas.width=64;glowCanvas.height=64;
  const ctx=glowCanvas.getContext('2d'),gradient=ctx.createRadialGradient(32,32,0,32,32,32);gradient.addColorStop(0,'rgba(255,235,184,.8)');gradient.addColorStop(.3,'rgba(255,207,120,.25)');gradient.addColorStop(1,'rgba(255,207,120,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);
  const glowTex=new THREE.CanvasTexture(glowCanvas),glowMat=new THREE.SpriteMaterial({map:glowTex,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});
  const glow=new THREE.Sprite(glowMat);glow.position.set(0,1.9,2);glow.scale.set(2.5,2.5,1);scene.add(glow);
  const discovery=mesh(new THREE.OctahedronGeometry(.22),basic('#c8edac'),land,[-4.9,.6,-2.25]);
  const discoveryGlow=new THREE.Sprite(glowMat);discoveryGlow.position.copy(discovery.position);discoveryGlow.scale.set(1.7,1.7,1);land.add(discoveryGlow);
  const slotGroups=SLOTS.map(slot=>{const group=new THREE.Group();group.position.set(slot.x,.08,slot.z);land.add(group);mesh(new THREE.CylinderGeometry(.5,.56,.075,12),mat('#939471'),group,[0,0,0]);const ring=mesh(new THREE.RingGeometry(.49,.535,32),basic('#d5ca91').clone(),group,[0,.047,0]);ring.rotation.x=-Math.PI/2;return {group,ring,tool:null};});
  function buildTool(type){
    const g=new THREE.Group();g.name=type;
    if(type==='lantern'){
      rod(g,[0,0,0],[0,1.15,0],.075,'#766142');
      mesh(new THREE.IcosahedronGeometry(.18,1),basic('#f4dca3'),g,[0,1.12,0]);
      const cap=mesh(new THREE.ConeGeometry(.35,.23,6),mat('#73906b'),g,[0,1.4,0]);cap.rotation.z=.12;
      rod(g,[0,.7,0],[-.3,.9,0],.04,'#6d8051');blob(g,[-.31,.88,0],[.21,.09,.12],'#a6bb71');
    }else if(type==='chime'){
      for(const x of [-.33,.33])rod(g,[x,0,0],[x,1.18,0],.052,'#77623f');
      rod(g,[-.48,1.18,0],[.48,1.18,0],.065,'#c9bb89');
      for(let i=0;i<3;i++)rod(g,[-.24+i*.24,1.14,0],[-.24+i*.24,.55+(i%2)*.18,0],.037,'#a5d9c1');
    }else if(type==='fence'){
      for(const x of [-.45,0,.45])rod(g,[x,0,0],[x,.73+(x===0?.16:0),0],.09,'#9e8051');
      for(const y of [.28,.58])rod(g,[-.57,y,0],[.57,y,0],.06,'#af9160');
      blob(g,[.3,.55,.03],[.3,.1,.16],'#6f955f');
    }else{
      mesh(new THREE.CylinderGeometry(.35,.23,.32,12),mat('#b3adce'),g,[0,.22,0]);
      mesh(new THREE.CylinderGeometry(.31,.31,.018,20),basic('#beb6ff'),g,[0,.389,0]);
      mesh(new THREE.OctahedronGeometry(.095),basic('#e4d6ff'),g,[0,.64,0]);
    }
    return g;
  }
  let layoutKey='';
  function setLayout(layout){const key=JSON.stringify(layout);if(key===layoutKey)return;layoutKey=key;renderer.shadowMap.needsUpdate=true;slotGroups.forEach(({group},i)=>{const old=group.getObjectByName('facility');if(old){group.remove(old);old.traverse(o=>{if(o.geometry&&!([cube,sphere,cylinder].includes(o.geometry)))o.geometry.dispose();});}if(layout[i]){const tool=buildTool(layout[i]);tool.name='facility';group.add(tool);}});}
  const creatures=createGroveCreatures(scene),paint=createGrovePaint(scene);
  const seedCaster=new THREE.Group();scene.add(seedCaster);
  rod(seedCaster,[0,0,0],[0,.35,0],.045,'#8e6841');
  mesh(new THREE.OctahedronGeometry(.16),basic(PALETTE.soul),seedCaster,[0,.5,0]);
  blob(seedCaster,[-.13,.31,0],[.18,.06,.1],'#4ca67c');
  seedCaster.traverse(o=>{o.castShadow=false;});
  const motes=new THREE.InstancedMesh(new THREE.SphereGeometry(.025,5,4),basic('#d6e7b5'),36);motes.frustumCulled=false;scene.add(motes);
  const aurora=new THREE.Group();scene.add(aurora);
  for(let band=0;band<2;band++){
    const vertices=[],indices=[];
    for(let i=0;i<=48;i++){const x=-10+i*20/48,y=2.7+Math.sin(i*.11+band)*.45,z=-4.8+band*.3;vertices.push(x,y,z,x,y+.9,z);if(i<48){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}}
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);
    mesh(geometry,new THREE.MeshBasicMaterial({color:band?'#ac9be4':'#89c7b8',transparent:true,opacity:.35,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}),aurora).castShadow=false;
  }
  let weather='',figure=null,soulIndex=-1,close=false;
  const soulAnchor=new THREE.Vector3(-1,0,2.4);
  const contact=mesh(new THREE.CircleGeometry(.43,24),new THREE.MeshBasicMaterial({color:'#102921',transparent:true,opacity:.24,depthWrite:false}),scene,[0,.07,0],[1,.6,1]);contact.rotation.x=-Math.PI/2;contact.castShadow=false;
  function setSoul(index){if(index===soulIndex)return;soulIndex=index;if(figure){scene.remove(figure);disposeSoulVolume(figure);}figure=createSoulVolume(originals[index],{depth:4,roundness:.14,worldWidth:originals[index].dot?1.55:1.3});figure.rotation.y=.08;figure.traverse(o=>{o.castShadow=false;if(o.material)for(const material of Array.isArray(o.material)?o.material:[o.material])material.fog=false;});scene.add(figure);contact.scale.set(originals[index].dot?.45:1,.6,1);}
  function setWeather(value){if(value===weather)return;weather=value;stage.dataset.weather=value;const fog=value==='fog';aurora.visible=!fog;scene.fog.color.set(fog?'#24434a':'#29354d');scene.fog.density=fog?.039:.025;renderer.setClearColor(scene.fog.color);sun.color.set(fog?'#d5ded2':'#b2a9dc');sun.intensity=fog?2.6:1.8;fill.color.set(fog?'#789ca9':'#b4a2e2');fill.intensity=fog?.75:2.0;hemi.intensity=fog?1.9:1.4;}
  let width=1,height=1;
  function resize(){width=stage.clientWidth;height=stage.clientHeight;const halfWidth=width<600?8.25:8.25,halfHeight=Math.max(5.4,halfWidth*height/width);camera.left=-halfHeight*width/height;camera.right=halfHeight*width/height;camera.top=halfHeight;camera.bottom=-halfHeight;camera.zoom=close?1.65:1;camera.updateProjectionMatrix();renderer.setSize(width,height,false);}
  function focusSoul(value){close=value;resize();}
  function update({time,soulPosition,frame,territory,layout,index,weather:nextWeather,discovered,reducedMotion=false}){
    setLayout(layout);setSoul(index);setWeather(nextWeather);soulAnchor.set(soulPosition.x,.1,soulPosition.z);
    if(figure){figure.position.copy(soulAnchor);figure.position.y+=reducedMotion?0:Math.sin(time*3.5)*.045;figure.rotation.z=reducedMotion?0:Math.sin(time*2)*.025;}
    contact.position.set(soulAnchor.x,.07,soulAnchor.z);
    if(close){const t=soulAnchor.clone().add(new THREE.Vector3(0,.6,0));camera.position.copy(t).add(new THREE.Vector3(0,12,15));camera.lookAt(t);}else{camera.position.set(0,12,15);camera.lookAt(target);}
    camera.updateMatrixWorld();
    discovery.visible=!discovered;discoveryGlow.visible=!discovered;discovery.position.y=.6+(reducedMotion?0:Math.sin(time*2)*.12);discovery.rotation.y=reducedMotion?0:time*.6;
    const paintStats=paint.update({turf:territory,effects:frame?.effects,logical:frame?.logical||0,reducedMotion});
    const level=frame?Math.max(.15,frame.light/100):1;light.intensity=(6+(reducedMotion?0:Math.sin(time*4)*.5))*level;glow.material.opacity=.75*level;flame.scale.y=1.5+(reducedMotion?0:Math.sin(time*4)*.1);
    flame.material.color.set(paintStats.beaconHit>.1?PALETTE.wildLight:'#ffe1a1');
    const creatureStats=creatures.update(frame?.enemies,time,reducedMotion);
    seedCaster.visible=!!frame?.turf;seedCaster.position.set(soulAnchor.x+.5,.25,soulAnchor.z);seedCaster.rotation.z=reducedMotion?0:Math.sin(time*5)*.12;
    for(let i=0;i<36;i++){const a=i*2.399+(reducedMotion?0:time*.025),r=1+i%7;dummy.position.set(Math.cos(a)*r,.5+(i%5)*.43+(reducedMotion?0:Math.sin(time+i)*.12),Math.sin(a)*r*.68);dummy.scale.setScalar(.5+(i%3)*.3);dummy.rotation.set(0,0,0);dummy.updateMatrix();motes.setMatrixAt(i,dummy.matrix);}motes.instanceMatrix.needsUpdate=true;
    slotGroups.forEach(({ring,group},i)=>{const pulse=frame?.pulses.some(p=>p.slot===i);ring.material.color.set(pulse?PALETTE.soulLight:'#d5ca91');ring.scale.setScalar(pulse?1.3:1);const facility=group.getObjectByName('facility');if(facility)facility.rotation.z=pulse&&!reducedMotion?Math.sin(time*25)*.09:0;});
    renderer.render(scene,camera);
    return {slots:SLOTS.map(slot=>project(slot.x,.2,slot.z)),soul:project(soulAnchor.x,.8,soulAnchor.z),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,...creatureStats,...paintStats};
  }
  function project(x,y,z){const p=new THREE.Vector3(x,y,z).project(camera);return {x:(p.x*.5+.5)*width,y:(-p.y*.5+.5)*height,visible:Math.abs(p.x)<=1&&Math.abs(p.y)<=1};}
  const observer=new ResizeObserver(resize);observer.observe(stage);resize();
  return {update,focusSoul,resize,renderer,scene,camera,dispose(){observer.disconnect();renderer.dispose();}};
}
