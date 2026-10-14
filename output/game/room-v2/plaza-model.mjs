import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {combatBeat} from './plaza-beats.mjs';

export function buildPlaza(){
 const root=new THREE.Group();root.name='Porcelain_Quarter';const staticRoot=new THREE.Group();root.add(staticRoot);const mats=new Map();
 const mat=(color,roughness=.78,metalness=0)=>{const key=[color,roughness,metalness].join();if(!mats.has(key))mats.set(key,new THREE.MeshStandardMaterial({color,roughness,metalness}));return mats.get(key);};
 const M={
  stone:mat('#eee7d7'),white:mat('#fff5e2'),shadow:mat('#c7c8bd'),edge:mat('#d6cdb9'),
  teal:mat('#326d73',.43),dark:mat('#224d58',.55),gold:mat('#c8a862',.28,.74),
  wood:mat('#bba484'),leaf:mat('#688f84'),leafLight:mat('#95b5a2'),roof:mat('#8caaa4'),
  glass:new THREE.MeshStandardMaterial({color:'#ffdca8',emissive:'#ffae52',emissiveIntensity:.28,roughness:.25,metalness:.15}),
  aqua:new THREE.MeshStandardMaterial({color:'#6ce6d4',emissive:'#38b8a8',emissiveIntensity:.42,roughness:.2,metalness:.1}),
  crystal:new THREE.MeshStandardMaterial({color:'#fff3b8',emissive:'#ffbe42',emissiveIntensity:.55,roughness:.18,metalness:.25}),
  coralCloth:mat('#e67385',.65)
 };
 const geos=new Map(),cube=new THREE.BoxGeometry(1,1,1);
 function mesh(geometry,material,pos=[0,0,0],scale=[1,1,1],parent=staticRoot){const o=new THREE.Mesh(geometry,material);o.position.set(...pos);o.scale.set(...scale);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
 function box(pos,size,material=M.stone,r=.045,parent=staticRoot){const key=size.join()+','+r;if(!geos.has(key))geos.set(key,new RoundedBoxGeometry(...size,Math.max(...size)>2?2:1,Math.min(r,...size.map(s=>s*.42))));return mesh(geos.get(key),material,pos,[1,1,1],parent);}
 function cyl(pos,rt,rb,h,material=M.stone,parent=staticRoot,n=24){const key=`c${rt},${rb},${h},${n}`;if(!geos.has(key))geos.set(key,new THREE.CylinderGeometry(rt,rb,h,n));return mesh(geos.get(key),material,pos,[1,1,1],parent);}
 function rod(a,b,r,material=M.gold,parent=staticRoot){const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),o=cyl(p.clone().add(q).multiplyScalar(.5).toArray(),r,r,p.distanceTo(q),material,parent,10);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),q.sub(p).normalize());return o;}
 function archShape(w,h,thickness,depth){const outer=new THREE.Shape(),r=w/2;outer.moveTo(-r,0);outer.lineTo(-r,h-r);outer.absarc(0,h-r,r,Math.PI,0,true);outer.lineTo(r,0);outer.lineTo(r-thickness,0);outer.lineTo(r-thickness,h-r);outer.absarc(0,h-r,r-thickness,0,Math.PI,false);outer.lineTo(-r+thickness,0);outer.closePath();return new THREE.ExtrudeGeometry(outer,{depth,bevelEnabled:true,bevelThickness:.035,bevelSize:.035,bevelSegments:2,steps:1,curveSegments:16});}
 function label(text,pos,w,color='#657f7e',parent=staticRoot){const c=document.createElement('canvas');c.width=1024;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='500 53px Georgia';ctx.fillText(text,512,64);const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;const m=mesh(new THREE.PlaneGeometry(w,w/8),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,toneMapped:false}),pos,[1,1,1],parent);m.castShadow=false;return m;}

 // A cutaway toy-box diorama base with stepped stone strata and golden corner clasps.
 box([0,-.70,-.35],[24.4,1.15,20.5],M.dark,.28);box([0,-1.18,-.35],[22.6,.45,18.8],M.teal,.22);
 box([0,-.13,-.35],[24.7,.24,20.8],M.edge,.14);box([0,.025,-.35],[24.45,.09,20.55],M.stone,.065);
 for(const x of [-12.16,12.16])box([x,.13,-.35],[.11,.12,20.2],M.gold,.02);
 for(const z of [-10.42,9.7])box([0,.13,z],[24.3,.12,.11],M.gold,.02);
 for(const sx of [-1,1])for(const sz of [-1,1])box([sx*12.1,-.08,sz*9.9-.35],[.46,.36,.46],M.gold,.06);

 // One texture gives small stone joints, grain, and the circular square inlay.
 const tile=document.createElement('canvas');tile.width=1536;tile.height=1280;const ctx=tile.getContext('2d'),sx=tile.width/24,sy=tile.height/20;
 ctx.fillStyle='#eae4d6';ctx.fillRect(0,0,tile.width,tile.height);let rand=73;const noise=()=>((rand=Math.imul(rand,1664525)+1013904223>>>0)/4294967296);
 for(let row=0;row<25;row++)for(let col=-1;col<27;col++){const x=(col+(row%2)*.5)*sx*.95,y=row*sy*.8;ctx.fillStyle=['#f4efe3','#eee8db','#e6e0d3','#f0eadf'][Math.floor(noise()*4)];ctx.fillRect(x+1.2,y+1.2,sx*.95-2.4,sy*.8-2.4);}
 for(let i=0;i<22000;i++){ctx.fillStyle=noise()>.5?'#ffffff13':'#756d6210';ctx.fillRect(noise()*1536,noise()*1280,1+noise()*2,1);}
 const cx=12*sx,cy=(3.1+10.35)*sy;for(const [r,color,w]of [[4.8,'#bbb59e',2],[4.67,'#c4ad74',2.5],[4.43,'#c7c5b4',1],[3.98,'#c3c2b3',1],[2.15,'#cbb885',1.5]]){ctx.strokeStyle=color;ctx.lineWidth=w;ctx.beginPath();ctx.ellipse(cx,cy,r*sx,r*sy,0,0,Math.PI*2);ctx.stroke();}
 for(let i=0;i<48;i++){const a=i/48*Math.PI*2;ctx.strokeStyle='#c3bfae';ctx.beginPath();ctx.moveTo(cx+Math.cos(a)*4.43*sx,cy+Math.sin(a)*4.43*sy);ctx.lineTo(cx+Math.cos(a)*4.67*sx,cy+Math.sin(a)*4.67*sy);ctx.stroke();}
 ctx.fillStyle='#d5c8a3';ctx.beginPath();ctx.moveTo(cx,cy-22);ctx.lineTo(cx+7,cy);ctx.lineTo(cx,cy+22);ctx.lineTo(cx-7,cy);ctx.closePath();ctx.fill();
 const floorTexture=new THREE.CanvasTexture(tile);floorTexture.colorSpace=THREE.SRGBColorSpace;floorTexture.anisotropy=4;
 const floor=mesh(new THREE.PlaneGeometry(24,20),new THREE.MeshStandardMaterial({map:floorTexture,roughness:.82}),[0,.079,-.35]);floor.rotation.x=-Math.PI/2;floor.castShadow=false;

 // Brass-lined drainage channels lead from the gate to the square.
 for(const x of [-2.15,2.15]){box([x,.084,1.2],[.16,.018,6.3],M.dark,.004);for(let i=0;i<24;i++)box([x,.101,-1.7+i*.25],[.18,.016,.06],M.gold,.004);}
 // Low parapets keep the approach visible. The gate is the dominant silhouette.
 for(const side of [-1,1]){
  box([side*7.25,.61,-2.1],[9.15,1.2,.66],M.shadow,.045);box([side*7.25,1.26,-2.1],[9.38,.16,.87],M.white,.045);
  box([side*7.25,.20,-1.73],[9.2,.17,.18],M.edge,.03);
  for(let j=0;j<6;j++){const x=side*(3.05+j*1.52);box([x,.7,-1.65],[.23,1.32,.23],M.stone,.025);box([x,1.43,-2.07],[.45,.16,.97],M.white,.035);}
 }
 for(const x of [-2.25,2.25]){
  box([x,1.4,-2.1],[.92,2.8,1.32],M.stone,.09);box([x,.24,-2.1],[1.18,.38,1.6],M.shadow,.06);box([x,.45,-2.1],[1.12,.10,1.55],M.white,.04);
  box([x,2.82,-2.1],[1.17,.20,1.6],M.white,.06);box([x,3.02,-2.1],[.83,.21,1.15],M.edge,.04);cyl([x,3.24,-2.1],.15,.3,.28,M.gold);
  for(let j=0;j<4;j++)box([x, .72+j*.5,-1.425],[.75,.035,.02],M.edge,.003);
  box([x,1.58,-1.38],[.44,.61,.08],M.dark,.04);box([x,1.58,-1.32],[.30,.46,.035],M.gold,.03);
 }
 const arch=mesh(archShape(3.65,3.75,.26,.69),M.white,[0,0,-2.47]);arch.name='Gate_arch';
 mesh(archShape(3.08,3.43,.06,.035),M.gold,[0,0,-1.72]);
 box([0,3.82,-2.08],[2.45,.26,.9],M.stone,.07);label('S O U L I',[0,3.84,-1.60],1.75);
 mesh(new THREE.TorusGeometry(.26,.045,8,32),M.gold,[0,4.2,-2.06]);mesh(new THREE.OctahedronGeometry(.12),M.teal,[0,4.2,-2.04]);

 // Hinged gate leaves are animated separately from merged static architecture.
 const leaves=[];for(const side of [-1,1]){const g=new THREE.Group();g.position.set(side*1.72,.12,-2.0);root.add(g);const mid=-side*.85;
  box([mid,.75,0],[1.7,1.5,.20],M.teal,.055,g);box([mid,.75,.118],[1.53,1.27,.055],M.dark,.035,g);
  for(let k=0;k<5;k++)box([mid-side*.6+side*k*.3,.76,.163],[.19,1.22,.06],M.teal,.025,g);
  for(const y of [.23,1.23]){box([mid,y,.205],[1.64,.065,.045],M.gold,.015,g);for(const dx of [-.66,.66])cyl([mid+dx,y,.24],.033,.033,.032,M.gold,g,10).rotation.x=Math.PI/2;}
  mesh(new THREE.TorusGeometry(.10,.028,7,20),M.gold,[-side*1.46,.77,.27],[1,1,1],g);leaves.push(g);
 }
 const pressureLights=[];for(let j=0;j<5;j++){const material=new THREE.MeshBasicMaterial({color:'#bce1bd',toneMapped:false});pressureLights.push(mesh(new THREE.SphereGeometry(.047,8,6),material,[-.32+j*.16,1.90,-1.72],[1,1,1],root));}

 // Flanking streets: bespoke buildings with warm lit windows, sills, roof ridges.
 function building(x,z,w,d,h,kind){
  box([x,h/2,z],[w,h,d],M.stone,.08);box([x,.2,z],[w+.15,.28,d+.16],M.shadow,.04);box([x,h-.10,z],[w+.2,.18,d+.20],M.white,.035);
  const f=z+d/2+.012;
  if(kind==='tower'){
   box([x,h+.23,z],[w*.85,.52,d*.85],M.white,.05);box([x,h+.54,z],[w+.25,.16,d+.25],M.edge,.045);
   const roof=mesh(new THREE.ConeGeometry(w*.81,.74,4),M.roof,[x,h+.98,z]);roof.rotation.y=Math.PI/4;rod([x,h+1.25,z],[x,h+1.62,z],.026);mesh(new THREE.SphereGeometry(.09,12,8),M.gold,[x,h+1.65,z]);
  }else{
   const slope=.36;for(const side of [-1,1]){const roof=box([x+side*w*.27,h+.32,z],[w*.64,.17,d+.4],M.roof,.05);roof.rotation.z=-side*slope;for(let j=0;j<7;j++){const seam=box([x+side*w*.27,h+.42,z-d*.48+j*d*.16],[w*.62,.025,.026],M.white,.006);seam.rotation.z=-side*slope;}}
   box([x,h+.55,z],[.15,.13,d+.51],M.gold,.03);box([x+w*.26,h+.76,z-.25],[.43,.62,.42],M.stone,.04);box([x+w*.26,h+1.10,z-.25],[.54,.13,.52],M.white,.035);
  }
  for(let row=0;row<Math.floor(h/1.25);row++)for(const dx of [-w*.27,w*.27]){
   const y=.87+row*1.17;box([x+dx,y,f],[.62,.8,.025],M.shadow,.045);box([x+dx,y+.015,f+.019],[.43,.59,.035],M.dark,.03);box([x+dx,y+.015,f+.044],[.34,.50,.008],M.glass,.015);
   box([x+dx,y-.43,f+.085],[.76,.1,.24],M.white,.025);box([x+dx,y+.42,f+.04],[.66,.075,.10],M.white,.018);rod([x+dx-.2,y,f+.07],[x+dx+.2,y,f+.07],.014,M.gold);rod([x+dx,y-.27,f+.07],[x+dx,y+.29,f+.07],.014,M.gold);
  }
  box([x,.61,f+.02],[.62,1.2,.07],M.dark,.07);box([x,.59,f+.066],[.49,1.03,.024],M.teal,.04);mesh(new THREE.SphereGeometry(.035,8,6),M.gold,[x+.15,.61,f+.10]);box([x,.10,f+.26],[.88,.15,.42],M.white,.03);
 }
 building(-8.3,-4.25,2.65,2.25,3.65,'tower');building(8.5,-4.65,3.15,2.55,4.5,'house');building(-9.2,3.55,2.55,2.45,2.5,'house');building(9.1,4.55,2.4,2.65,3.1,'house');
 const clock=cyl([-8.3,3.13,-3.08],.32,.32,.075,M.white,staticRoot,40);clock.rotation.x=Math.PI/2;
 mesh(new THREE.TorusGeometry(.30,.025,8,40),M.gold,[-8.3,3.13,-3.027]);rod([-8.3,3.13,-2.995],[-8.3,3.32,-2.995],.016,M.dark);rod([-8.3,3.13,-2.99],[-8.13,3.09,-2.99],.016,M.dark);
 for(const side of [-1,1])for(let n=0;n<3;n++){const x=side*(6.4+n*.95);mesh(archShape(.92,1.50,.12,.30),M.white,[x,0,-.30]);}
 for(const side of [-1,1]){box([side*7.35,1.54,-.15],[3.05,.17,.67],M.edge,.035);for(let j=0;j<3;j++)box([side*6.7,.07+j*.055,6.9+j*.28],[3.2,.1+j*.11,.34],M.white,.03);}

 const sphere=new THREE.IcosahedronGeometry(1,2);
 for(const [x,z,s]of [[-10,-.55,1],[-6.8,5.6,.86],[6.9,6.5,.94],[10.6,0,1],[-4.8,-6.8,.8],[5.6,-7,.85]]){
  cyl([x,.2,z],.60,.48,.38,M.edge);cyl([x,.43,z],.61,.61,.09,M.white);cyl([x,.44,z],.48,.48,.035,M.dark);rod([x,.42,z],[x,1.78*s,z],.065,M.wood);
  const clumps=[[0,1.75,0,.65],[-.38,1.5,.1,.40],[.32,1.61,.13,.48],[.08,2.05,-.06,.42]];for(const [dx,y,dz,r]of clumps)mesh(sphere,(dx<0?M.leaf:M.leafLight),[x+dx*s,y*s,z+dz*s],[r*s,r*s*.92,r*s]);
 }
 const lampM=new THREE.MeshStandardMaterial({color:'#ffedc1',emissive:'#ffcf80',emissiveIntensity:.45,roughness:.45});
 const lampPositions=[[-4.9,-1.2],[4.9,-1.2],[-5.6,6.9],[5.6,6.9]];
 for(const [x,z]of lampPositions){cyl([x,.10,z],.17,.23,.2,M.dark);rod([x,.2,z],[x,2.05,z],.044,M.dark);cyl([x,2.05,z],.18,.18,.08,M.gold);box([x,2.28,z],[.3,.43,.3],lampM,.045);for(const dx of [-.16,.16])for(const dz of [-.16,.16])rod([x+dx,2.06,z+dz],[x+dx,2.49,z+dz],.019,M.dark);const top=mesh(new THREE.ConeGeometry(.30,.20,4),M.dark,[x,2.59,z]);top.rotation.y=Math.PI/4;}
 for(const [x,z]of [[-5.55,3.2],[5.55,3.5]]){for(let j=0;j<4;j++)box([x,.49,z+j*.12],[1.65,.08,.09],M.wood,.025);for(const dx of [-.58,.58]){rod([x+dx,.1,z+.1],[x+dx,.45,z+.1],.055,M.dark);rod([x+dx,.1,z+.37],[x+dx,.45,z+.37],.055,M.dark);}for(let j=0;j<3;j++)box([x,.77+j*.12,z-.03],[1.65,.085,.08],M.teal,.025);}
 for(const side of [-1,1]){cyl([side*3.8,.16,7.7],.30,.38,.3,M.white);mesh(new THREE.SphereGeometry(.18,12,8),M.gold,[side*3.8,.43,7.7]);}
 const floorLabel=label('THE PORCELAIN QUARTER',[0,.087,8.3],5.4,'#89918b');floorLabel.rotation.x=-Math.PI/2;

 // Merge static base architecture by material and shadow policy.
 staticRoot.updateMatrixWorld(true);const batches=new Map();staticRoot.traverse(o=>{if(!o.isMesh)return;const key=o.material.uuid+'/'+o.castShadow;const list=batches.get(key)||[];list.push(o);batches.set(key,list);});
 const originalGeometries=new Set();for(const parts of batches.values()){
  for(const p of parts)originalGeometries.add(p.geometry);const copies=parts.map(p=>(p.geometry.index?p.geometry.toNonIndexed():p.geometry.clone()).applyMatrix4(p.matrixWorld));const merged=mergeGeometries(copies);copies.forEach(g=>g.dispose());if(!merged)continue;
  const m=new THREE.Mesh(merged,parts[0].material);m.castShadow=parts[0].castShadow;m.receiveShadow=true;m.name='Architecture_'+parts[0].material.uuid.slice(0,8);parts.forEach(p=>p.removeFromParent());staticRoot.add(m);
 }

 // ============================================================================
 // 3D IDLE DIORAMA UPGRADE STRUCTURES (Pre-allocated for zero memory churn)
 // ============================================================================
 const upgrades={};

 // 01: Twin Hydro Turrets on Gate Pillars
 const turretsGroup=new THREE.Group();turretsGroup.name='Upgrade_Hydro_Turrets';turretsGroup.visible=false;root.add(turretsGroup);
 const turretHeads=[];
 for(const side of [-1,1]){
  const base=new THREE.Group();base.position.set(side*2.25,3.38,-2.1);turretsGroup.add(base);
  cyl([0,0,0],.42,.48,.22,M.dark,base,18);
  cyl([0,.16,0],.34,.38,.14,M.gold,base,18);
  const head=new THREE.Group();head.position.set(0,.34,0);base.add(head);
  box([0,0,0],[.46,.36,.52],M.teal,.06,head);
  cyl([0,.04,-.36],.13,.16,.52,M.gold,head,16).rotation.x=Math.PI/2;
  cyl([0,.04,-.64],.16,.14,.12,M.dark,head,16).rotation.x=Math.PI/2;
  mesh(new THREE.SphereGeometry(.18,12,10),M.aqua,[0,.16,.12],[1,1,1],head);
  mesh(new THREE.TorusGeometry(.20,.035,8,20),M.gold,[0,.04,-.32],[1,1,1],head);
  turretHeads.push(head);
 }
 upgrades.turrets=turretsGroup;

 // 02: Starlight Fountain & Cozy Mint Cafe Parasols
 const fountainGroup=new THREE.Group();fountainGroup.name='Upgrade_Starlight_Fountain';fountainGroup.visible=false;root.add(fountainGroup);
 const fCenter=new THREE.Group();fCenter.position.set(0,.08,3.1);fountainGroup.add(fCenter);
 cyl([0,.14,0],1.55,1.68,.28,M.white,fCenter,32);
 cyl([0,.29,0],1.36,1.36,.06,M.aqua,fCenter,32);
 mesh(new THREE.TorusGeometry(1.52,.06,10,32),M.gold,[0,.28,0],[1,1,1],fCenter).rotation.x=Math.PI/2;
 cyl([0,.58,0],.32,.44,.65,M.stone,fCenter,20);
 cyl([0,.92,0],.82,.92,.18,M.white,fCenter,24);
 cyl([0,1.02,0],.70,.70,.05,M.aqua,fCenter,24);
 mesh(new THREE.TorusGeometry(.82,.045,8,24),M.gold,[0,1.01,0],[1,1,1],fCenter).rotation.x=Math.PI/2;
 cyl([0,1.28,0],.16,.22,.50,M.gold,fCenter,16);
 const fountainStar=mesh(new THREE.OctahedronGeometry(.34,0),M.crystal,[0,1.78,0],[1,1.35,1],fCenter);
 const fountainRing=mesh(new THREE.TorusGeometry(.48,.03,8,24),M.gold,[0,1.78,0],[1,1,1],fCenter);
 // Flanking cafe parasol tables
 for(const side of [-1,1]){
  const cafe=new THREE.Group();cafe.position.set(side*3.85,.08,4.85);fountainGroup.add(cafe);
  cyl([0,.35,0],.06,.09,.70,M.dark,cafe,12);
  cyl([0,.70,0],.58,.52,.08,M.white,cafe,20);
  rod([0,.72,0],[0,1.68,0],.035,M.gold,cafe);
  const umbrella=mesh(new THREE.ConeGeometry(.95,.42,8),side<0?M.teal:M.coralCloth,[0,1.82,0],[1,1,1],cafe);
  umbrella.rotation.y=Math.PI/8;
  mesh(new THREE.SphereGeometry(.07,8,6),M.gold,[0,2.06,0],[1,1,1],cafe);
 }
 upgrades.fountain=fountainGroup;

 // 03: Aurora Spire & Magic Lantern Halos
 const spireGroup=new THREE.Group();spireGroup.name='Upgrade_Aurora_Spire';spireGroup.visible=false;root.add(spireGroup);
 const astrolabe=new THREE.Group();astrolabe.position.set(-8.3,6.15,-4.25);spireGroup.add(astrolabe);
 const astroCore=mesh(new THREE.OctahedronGeometry(.36,0),M.aqua,[0,0,0],[1,1.4,1],astrolabe);
 const astroRingA=mesh(new THREE.TorusGeometry(.62,.04,8,28),M.gold,[0,0,0],[1,1,1],astrolabe);
 const astroRingB=mesh(new THREE.TorusGeometry(.82,.035,8,28),M.crystal,[0,0,0],[1,1,1],astrolabe);
 const lampHalos=[];
 for(const [x,z]of lampPositions){
  const h=mesh(new THREE.TorusGeometry(.36,.028,8,24),M.crystal,[x,2.28,z],[1,1,1],spireGroup);
  h.rotation.x=Math.PI/2;lampHalos.push(h);
 }
 upgrades.spire=spireGroup;

 // 04: Royal Festival Sky (Golden Arch Crest & Floating Miniature Airship)
 const festivalGroup=new THREE.Group();festivalGroup.name='Upgrade_Festival_Sky';festivalGroup.visible=false;root.add(festivalGroup);
 const crestGroup=new THREE.Group();crestGroup.position.set(0,4.35,-2.06);festivalGroup.add(crestGroup);
 mesh(new THREE.TorusGeometry(.52,.05,8,32),M.gold,[0,.15,0],[1,1,1],crestGroup);
 for(const a of [-.5,0,.5]){
  const spike=mesh(new THREE.ConeGeometry(.11,.38,6),M.crystal,[Math.sin(a)*.45,.42+Math.cos(a)*.12,0],[1,1,1],crestGroup);
  spike.rotation.z=-a*.6;
 }
 // Floating miniature airship
 const airship=new THREE.Group();airship.position.set(4.8,6.1,-2.6);festivalGroup.add(airship);
 const balloon=mesh(new THREE.SphereGeometry(.85,20,14),M.white,[0,0,0],[1.65,.92,.92],airship);
 mesh(new THREE.TorusGeometry(.84,.045,8,24),M.gold,[0,0,0],[1,.93,.93],airship).rotation.y=Math.PI/2;
 mesh(new THREE.TorusGeometry(.68,.04,8,24),M.teal,[.45,0,0],[1,.93,.93],airship).rotation.y=Math.PI/2;
 mesh(new THREE.TorusGeometry(.68,.04,8,24),M.coralCloth,[-.45,0,0],[1,.93,.93],airship).rotation.y=Math.PI/2;
 // Gondola cabin underneath
 box([0,-.98,0],[.78,.36,.44],M.dark,.06,airship);
 box([0,-.96,0],[.82,.12,.48],M.gold,.03,airship);
 mesh(new THREE.SphereGeometry(.11,8,6),M.crystal,[.22,-.96,.22],[1,1,1],airship);
 mesh(new THREE.SphereGeometry(.11,8,6),M.crystal,[-.22,-.96,.22],[1,1,1],airship);
 for(const dx of [-.28,.28])for(const dz of [-.15,.15])rod([dx,-.80,dz],[dx*1.2,-.35,dz*1.2],.018,M.gold,airship);
 const propeller=new THREE.Group();propeller.position.set(-1.44,0,0);airship.add(propeller);
 box([0,0,0],[.08,.52,.09],M.gold,.02,propeller);
 box([0,0,0],[.08,.09,.52],M.gold,.02,propeller);
 upgrades.festival=festivalGroup;

 // Dispose unused temporary geometries
 const live=new Set();root.traverse(o=>{if(o.geometry)live.add(o.geometry);});for(const g of new Set([...originalGeometries,...geos.values(),cube,sphere]))if(!live.has(g))g.dispose();

 let lastOpen=0,lastUpgradeMask=0;
 function springScale(age){
  if(age<0)return 1;
  if(age>=.65)return 1;
  const p=age/.65;
  return Math.max(.01,1-Math.exp(-p*6.5)*Math.cos(p*11));
 }

 return {root,leaves,upgrades,turretHeads,update(data,time,reduced,idleState){
  const beat=combatBeat(data,reduced),progress=data.gate.broken?Math.max(.04,1-data.gate.repair/100):0;
  const spring=beat.age<0?0:Math.max(0,Math.min(1.16,1-Math.exp(-beat.age*9)*Math.cos(beat.age*17)));
  const opening=progress*(reduced?1:spring),stress=reduced?0:beat.gate*.085+Math.max(0,data.pressure-.50)*.045;
  leaves.forEach((g,i)=>{const side=i===0?-1:1;g.rotation.y=side*(opening*1.44-stress);g.rotation.z=reduced?0:Math.sin(time*43+i)*stress*.35;g.position.z=-2+(reduced?0:beat.gate*.075);});
  pressureLights.forEach((p,i)=>{const lit=data.pressure>i*.2;p.material.color.set(data.gate.broken?(data.gate.repair>i*20?'#b9e9d1':'#ff9c78'):(lit?(data.pressure>.6?'#ffb66f':'#ffd79c'):'#638c83'));p.scale.setScalar(!reduced&&lit?1+beat.gate*.45:1);});

  // Update 3D Diorama Upgrades visibility & lively idle animations
  const u=idleState?.activeUpgrades||{turrets:false,fountain:false,spire:false,festival:false};
  const unlockedAt=idleState?.unlockedAt||{};
  let upgradeMask=0,animatingPopup=false;
  ['turrets','fountain','spire','festival'].forEach((id,bit)=>{
   const grp=upgrades[id],active=!!u[id];
   if(active)upgradeMask|=(1<<bit);
   grp.visible=active;
   if(active){
    const age=time-(unlockedAt[id]??-10);
    const s=reduced?1:springScale(age);
    if(age>=0&&age<.7)animatingPopup=true;
    grp.scale.setScalar(s);
   }
  });

  if(u.turrets&&!reduced){
   const target=data.enemies?.[0];
   turretHeads.forEach((h,i)=>{
    const tx=target?target.x-(i===0?-2.25:2.25):Math.sin(time*1.8+i)*2.5;
    const tz=target?target.z+2.1:-3.5;
    h.rotation.y=Math.atan2(tx,tz)+Math.PI;
    const recoil=data.phase==='encounter'?Math.max(0,Math.sin(time*14+i*3))*.06:0;
    h.position.z=recoil;
   });
  }
  if(u.fountain&&!reduced){
   fountainStar.rotation.y=time*1.6;
   fountainStar.position.y=1.78+Math.sin(time*2.8)*.08;
   fountainRing.rotation.x=Math.PI/3+Math.sin(time*1.4)*.35;
   fountainRing.rotation.y=time*1.1;
  }
  if(u.spire&&!reduced){
   astroCore.rotation.y=-time*2.0;
   astroRingA.rotation.x=time*1.5;
   astroRingA.rotation.y=time*.9;
   astroRingB.rotation.z=-time*1.3;
   astroRingB.rotation.x=Math.PI/4+Math.cos(time)*.3;
   lampHalos.forEach((h,i)=>{h.scale.setScalar(1+Math.sin(time*3+i)*.08);});
  }
  if(u.festival&&!reduced){
   airship.position.x=4.2+Math.sin(time*.55)*2.4;
   airship.position.y=6.1+Math.sin(time*1.7)*.22;
   airship.position.z=-2.6+Math.cos(time*.55)*1.2;
   airship.rotation.y=Math.cos(time*.55)*-.25+.3;
   airship.rotation.z=Math.sin(time*1.4)*.04;
   propeller.rotation.x=time*18;
  }

  const changed=Math.abs(opening-lastOpen)>.025||upgradeMask!==lastUpgradeMask||animatingPopup;
  if(changed){lastOpen=opening;lastUpgradeMask=upgradeMask;}
  return changed||beat.gate>.3;
 }};
}
