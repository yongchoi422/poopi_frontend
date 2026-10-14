import * as THREE from 'three';
import {createSoulVolume,visiblePixels,pixelComponents} from './soul-volume.mjs';
import {CREW} from './miniature-rules.mjs';
import {eventAge,impactAge,decay,combatBeat} from './plaza-beats.mjs';

export function createPlazaActors(scene,originals){
 const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=128;const ctx=shadowCanvas.getContext('2d'),grad=ctx.createRadialGradient(64,64,3,64,64,62);grad.addColorStop(0,'#183d4966');grad.addColorStop(.5,'#183d492a');grad.addColorStop(1,'#183d4900');ctx.fillStyle=grad;ctx.fillRect(0,0,128,128);const shadowTex=new THREE.CanvasTexture(shadowCanvas);
 const shade=new THREE.MeshBasicMaterial({map:shadowTex,transparent:true,depthWrite:false,toneMapped:false});
 const brass=new THREE.MeshStandardMaterial({color:'#c5aa72',roughness:.30,metalness:.65}),dark=new THREE.MeshStandardMaterial({color:'#285663',roughness:.45}),wood=new THREE.MeshStandardMaterial({color:'#baa07a',roughness:.7}),white=new THREE.MeshStandardMaterial({color:'#dcf8eb',roughness:.65});
 const goldGlow=new THREE.MeshStandardMaterial({color:'#ffe484',emissive:'#ffae38',emissiveIntensity:.65,roughness:.22,metalness:.55});
 const mintGlow=new THREE.MeshStandardMaterial({color:'#8dffea',emissive:'#2ad4b8',emissiveIntensity:.65,roughness:.2,metalness:.2});
 function part(group,geo,mat,pos,rot=[0,0,0]){const m=new THREE.Mesh(geo,mat);m.position.set(...pos);m.rotation.set(...rot);group.add(m);return m;}
 function shadow(w=1.5){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,w*.65),shade);m.rotation.x=-Math.PI/2;scene.add(m);return m;}
 const souls=CREW.map((a,i)=>{
  const original=originals[a.sample],body=pixelComponents(visiblePixels(original.rectangles))[0],bodyWidth=Math.max(...body.map(p=>p.x))-Math.min(...body.map(p=>p.x))+1;
  const displayWidth=Math.min(2.55,Math.max(1.70,1.15*original.frame[2]/bodyWidth));
  const figure=createSoulVolume(original,{worldWidth:displayWidth,depth:3.3,roundness:.13});figure.name='Soul_'+a.name;figure.traverse(o=>{o.castShadow=false;});scene.add(figure);
  const baseScale=figure.scale.x;
  const s=shadow(1.7),tool=new THREE.Group();tool.name=a.job+'_tool';scene.add(tool);
  if(a.job==='guard'){
   part(tool,new THREE.CylinderGeometry(.14,.19,.55,16),brass,[0,.08,0],[Math.PI/2,0,0]);part(tool,new THREE.CylinderGeometry(.095,.095,.032,16),dark,[0,.08,-.29],[Math.PI/2,0,0]);part(tool,new THREE.TorusGeometry(.15,.03,6,18),white,[0,.08,-.26]);part(tool,new THREE.SphereGeometry(.16,12,8),dark,[0,-.09,.20]);
  }else if(a.job==='wash'){
   part(tool,new THREE.CylinderGeometry(.025,.025,.72,10),wood,[0,.39,0],[0,0,-.20]);part(tool,new THREE.CylinderGeometry(.11,.11,.65,14),white,[-.09,.06,.05],[0,0,Math.PI/2]);part(tool,new THREE.CylinderGeometry(.125,.125,.08,12),brass,[-.4,.06,.05],[0,0,Math.PI/2]);part(tool,new THREE.CylinderGeometry(.125,.125,.08,12),brass,[.23,.06,.05],[0,0,Math.PI/2]);
  }else {part(tool,new THREE.CylinderGeometry(.035,.035,.60,12),wood,[0,.28,0]);part(tool,new THREE.BoxGeometry(.40,.18,.22),brass,[0,.57,0]);}
  return {figure,baseScale,shadow:s,tool,lastAction:'',recoil:0};
 });

 // ============================================================================
 // Pre-allocated Lv.1-Lv.5 3D Soul Evolution Showcase Attachment
 // ============================================================================
 const dotOriginal=originals[6]||originals[0];
 const dotPreview=new THREE.Group();dotPreview.name='Preview_Dot_Lv1';dotPreview.visible=false;scene.add(dotPreview);
 const dotVolume=createSoulVolume(dotOriginal,{worldWidth:1.85,depth:3.5,roundness:.15});
 dotVolume.name='Dot_Figure';dotVolume.traverse(o=>{o.castShadow=false;});dotPreview.add(dotVolume);
 part(dotPreview,new THREE.CylinderGeometry(.52,.62,.14,24),brass,[0,.07,0]);
 part(dotPreview,new THREE.TorusGeometry(.56,.035,8,24),goldGlow,[0,.14,0],[Math.PI/2,0,0]);

 const evoGroup=new THREE.Group();evoGroup.name='Evo_Showcase_Aura';scene.add(evoGroup);
 const auraInner=part(evoGroup,new THREE.RingGeometry(.78,.92,32),new THREE.MeshBasicMaterial({color:'#7df9e2',transparent:true,opacity:.72,side:THREE.DoubleSide,depthWrite:false,toneMapped:false}),[0,.02,0],[-Math.PI/2,0,0]);
 const auraOuter=part(evoGroup,new THREE.RingGeometry(1.08,1.22,36),new THREE.MeshBasicMaterial({color:'#ffe27a',transparent:true,opacity:.78,side:THREE.DoubleSide,depthWrite:false,toneMapped:false}),[0,.025,0],[-Math.PI/2,0,0]);
 const crownGroup=new THREE.Group();crownGroup.position.set(0,1.42,0);evoGroup.add(crownGroup);
 part(crownGroup,new THREE.BoxGeometry(.66,.12,.42),goldGlow,[0,0,0]);
 part(crownGroup,new THREE.BoxGeometry(.14,.22,.14),goldGlow,[-.24,.16,0]);
 part(crownGroup,new THREE.BoxGeometry(.16,.30,.16),goldGlow,[0,.20,0]);
 part(crownGroup,new THREE.BoxGeometry(.14,.22,.14),goldGlow,[.24,.16,0]);
 part(crownGroup,new THREE.OctahedronGeometry(.08,0),mintGlow,[0,.12,.22]);
 const orbitGroup=new THREE.Group();orbitGroup.position.set(0,.78,0);evoGroup.add(orbitGroup);
 const orbitStars=[];
 for(let k=0;k<6;k++){
  const star=part(orbitGroup,new THREE.OctahedronGeometry(.11,0),k%2===0?goldGlow:mintGlow,[0,0,0]);
  orbitStars.push(star);
 }
 const evoBeamMat=new THREE.MeshBasicMaterial({color:'#ffef9e',transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false,toneMapped:false});
 const evoBeam=part(evoGroup,new THREE.CylinderGeometry(.75,1.15,4.2,24,1,true),evoBeamMat,[0,2.1,0]);

 const dummy=new THREE.Object3D(),color=new THREE.Color(),pools={};
 function pool(name,geometry,material,cap){const mesh=new THREE.InstancedMesh(geometry,material,cap);mesh.count=0;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(mesh);pools[name]={mesh,n:0,cap};}
 const ink=new THREE.MeshPhysicalMaterial({color:'#ffffff',roughness:.26,clearcoat:1,clearcoatRoughness:.13,metalness:.02,envMapIntensity:1.1});
 pool('blob',new THREE.SphereGeometry(1,16,10),ink,160);pool('eye',new THREE.SphereGeometry(1,8,6),new THREE.MeshBasicMaterial({color:'#ffffff',toneMapped:false}),100);
 pool('rim',new THREE.TorusGeometry(1,.12,7,16),brass,25);pool('lid',new THREE.CylinderGeometry(1,1,1,14),dark,30);pool('shadow',new THREE.PlaneGeometry(1,1),shade,24);
 // 3D Collectible Spark Gems & Floor Rings
 pool('gem',new THREE.OctahedronGeometry(1,0),goldGlow,36);
 pool('gemRing',new THREE.RingGeometry(.76,1,20),new THREE.MeshBasicMaterial({color:'#ffe999',transparent:true,opacity:.65,side:THREE.DoubleSide,depthWrite:false,toneMapped:false}),36);

 function put(name,pos,scale,tint,rotation=[0,0,0]){const p=pools[name];if(p.n>=p.cap)return;dummy.position.set(...pos);dummy.scale.set(...scale);dummy.rotation.set(...rotation);dummy.updateMatrix();p.mesh.setMatrixAt(p.n,dummy.matrix);if(tint)p.mesh.setColorAt(p.n,color.set(tint));p.n++;}

 function update(data,time,reduced,weather,idleState,selectedSoul=-1){
  const inkColor=weather==='coral'?'#c4476d':'#8052b6',beat=combatBeat(data,reduced);let hitReactions=0;
  const evoLevel=idleState?.evoLevel??3;
  const evoTarget=selectedSoul>=0?selectedSoul:0;
  const cheers=idleState?.cheers||{};

  souls.forEach((r,i)=>{
   const a=data.crew[i],speed=Math.hypot(a.vx||0,a.vz||0),firing=data.effects.filter(e=>e.actor===i&&e.kind==='shot').at(-1),age=firing?eventAge(data,firing):10,recoil=reduced?0:decay(age,.28)*.26;
   const walk=!reduced?Math.sin(time*(speed>.1?9:2.1)+i)*Math.min(.055,.018+speed*.13):0;
   const rest=data.phase==='rest',restLean=rest&&!reduced?Math.sin(time*.7+i)*.06:0,dx=firing?firing.to.x-firing.from.x:0,dz=firing?firing.to.z-firing.from.z:-1,len=Math.hypot(dx,dz)||1;
   const cheerAge=cheers[i]!==undefined?time-cheers[i]:99;
   const cheerJump=!reduced&&cheerAge>=0&&cheerAge<.9?Math.sin(cheerAge/.9*Math.PI)*.65:0;
   const cheerSpin=!reduced&&cheerAge>=0&&cheerAge<.9?(cheerAge/.9)*Math.PI*2:0;
   const isEvoTarget=i===evoTarget;
   const tierScale=isEvoTarget?(evoLevel===4?1.12:evoLevel===5?1.22:1):1;

   r.figure.visible=!(isEvoTarget&&evoLevel===1);
   r.figure.position.set(a.x-dx/len*recoil,.14+Math.abs(walk)+cheerJump+(reduced?0:beat.burst*.035),a.z-dz/len*recoil);
   r.figure.rotation.set(reduced?0:recoil*.22,.20+cheerSpin+(!reduced?Math.max(-.20,Math.min(.20,(a.vx||0)*.5)):0),reduced?0:walk*.55+restLean);
   const s=r.baseScale*tierScale;
   r.figure.scale.set(s,s*(1-recoil*.30),s);

   r.shadow.position.set(a.x,.095,a.z+.02);
   r.tool.visible=data.phase==='encounter';
   r.tool.position.set(a.x+(i===1?-.65:.65)-dx/len*recoil,a.job==='guard'?.70:.11,a.z-.1-dz/len*recoil);
   const hammer=data.effects.filter(e=>e.actor===i&&e.source==='repair').at(-1),hammerAge=hammer?eventAge(data,hammer):10;
   r.tool.rotation.set(a.job==='repair'&&!reduced?-decay(hammerAge,.28)*.95:0,a.job==='guard'?Math.atan2(-dx,-dz):.15,a.job==='wash'&&!reduced&&a.action.includes('Wash')?Math.sin(time*12)*.24:0);

   if(isEvoTarget){
    const sx=r.figure.position.x,sy=r.figure.position.y,sz=r.figure.position.z;
    dotPreview.visible=evoLevel===1;
    if(evoLevel===1){
     dotPreview.position.set(sx,.09,sz);
     dotVolume.position.y=.18+(!reduced?Math.sin(time*4)*.08:0)+cheerJump;
     dotVolume.rotation.y=cheerSpin+(!reduced?Math.sin(time*1.5)*.25:0);
    }
    evoGroup.position.set(sx,.09,sz);
    auraInner.visible=evoLevel>=3||evoLevel===1;
    auraOuter.visible=evoLevel>=4;
    crownGroup.visible=evoLevel>=4;
    orbitGroup.visible=evoLevel>=5;
    if(!reduced){
     auraInner.scale.setScalar(1+Math.sin(time*3.5)*.06);
     auraOuter.rotation.z=time*1.2;
     auraOuter.scale.setScalar(1+Math.cos(time*2.8)*.05);
     crownGroup.position.y=(evoLevel===5?1.68:1.52)+(sy-.14)+Math.sin(time*3.2)*.05;
     crownGroup.rotation.y=Math.sin(time*1.5)*.2;
     orbitGroup.position.y=.85+(sy-.14);
     orbitGroup.rotation.y=time*2.2;
     orbitGroup.rotation.z=Math.sin(time*1.1)*.18;
     orbitStars.forEach((st,k)=>{
      const ang=k/orbitStars.length*Math.PI*2;
      st.position.set(Math.cos(ang)*1.25,Math.sin(time*4+k)*.14,Math.sin(ang)*1.25);
      st.rotation.y=time*3;st.rotation.x=time*2;
     });
    }else{
     crownGroup.position.y=evoLevel===5?1.68:1.52;
    }
    const pulseAge=time-(idleState?.evoPulseAt??-10);
    if(!reduced&&pulseAge>=0&&pulseAge<.85){
     evoBeam.visible=true;
     const fade=1-pulseAge/.85;
     evoBeamMat.opacity=fade*.55;
     evoBeam.scale.set(.65+pulseAge*1.1,1,.65+pulseAge*1.1);
    }else{
     evoBeam.visible=false;
    }
   }
  });

  for(const p of Object.values(pools))p.n=0;
  for(const e of data.enemies){const hit=data.effects.filter(f=>f.kind==='shot'&&f.side===1&&f.targetId===e.id&&impactAge(data,f)>=0).at(-1),age=hit?impactAge(data,hit):10,response=reduced?0:decay(age,.36),pot=e.kind==='dust',hop=reduced?0:Math.abs(Math.sin(time*(pot?5:8)+e.id))*(pot?.045:.13)*(1-response),squash=1-response*.38;
   const dx=hit?hit.to.x-hit.from.x:0,dz=hit?hit.to.z-hit.from.z:0,len=Math.hypot(dx,dz)||1,x=e.x+dx/len*response*.22,z=e.z+dz/len*response*.22,y=.10+hop+response*.08,tint=response>.60?'#e7f9cb':inkColor;if(response>0)hitReactions++;
   put('shadow',[x,.094,z],[1.13,.8,1],null,[-Math.PI/2,0,0]);
   if(pot){
    put('blob',[x,y+.36,z],[.43*(2-squash),.44*squash,.38],tint);put('blob',[x,y+.11,z+.10],[.51,.15,.38],tint);
    put('rim',[x,y+.68,z],[.25,.25,.25],null,[Math.PI/2,0,0]);put('lid',[x,y+.72,z],[.26,.065,.26]);
    for(const sign of [-1,1])put('blob',[x+sign*.37,y+.11,z+.18],[.18,.14,.24],weather==='coral'?'#983451':'#514176');
   }else{
    put('blob',[x,y+.39,z],[.35*(2-squash),.44*squash,.32],tint);put('blob',[x,y+.15,z+.07],[.46,.17,.34],tint);put('blob',[x-.06,y+.76,z-.02],[.17,.29,.14],weather==='coral'?'#e99b9b':'#b291d4',[0,0,-.38]);
    for(const sign of [-1,1])put('blob',[x+sign*.36,y+.16,z],[.18,.10,.23],inkColor,[0,sign*.4,0]);
   }
   for(const sign of [-1,1]){put('eye',[x+sign*.13,y+.44,z+.30],[.080,.09,.034],'#fff3d6');put('eye',[x+sign*.13+.013,y+.428,z+.331],[.034,.05,.017],'#243445');}
  }

  // Render collectible 3D Spark Gems
  const drops=idleState?.drops||[];
  for(const d of drops){
   const age=Math.max(0,time-d.bornAt);
   const collecting=d.collectedAt!==null;
   const cAge=collecting?Math.max(0,time-d.collectedAt):0;
   if(collecting&&cAge>=.5)continue;
   const pop=age<.35?Math.sin(age/.35*Math.PI)*.45:0;
   const flyY=collecting?cAge*5.2:0;
   const scale=collecting?Math.max(.02,1-cAge*1.9):Math.min(1,age*5);
   const bob=reduced?0:Math.sin(time*4.2+d.id)*.07;
   const y=.36+pop+bob+flyY;
   const gemTint=d.kind==='fountain'||d.kind==='splash'?'#7df9e2':'#ffe270';
   put('gem',[d.x,y,d.z],[.20*scale,.28*scale,.20*scale],gemTint,[0,reduced?0:time*2.6+d.id,0]);
   if(!collecting){
    const rScale=(.32+(!reduced?Math.sin(time*3.5+d.id)*.05:0))*scale;
    put('gemRing',[d.x,.102,d.z],[rScale,rScale,1],gemTint,[-Math.PI/2,0,0]);
   }
  }

  for(const p of Object.values(pools)){p.mesh.count=p.n;p.mesh.instanceMatrix.needsUpdate=true;if(p.mesh.instanceColor)p.mesh.instanceColor.needsUpdate=true;}
  return {residents:souls.length,visitors:data.enemies.length,hitReactions,visitorParts:Object.values(pools).reduce((n,p)=>n+p.n,0),activeGems:pools.gem.n};
 }
 return {update,souls};
}
