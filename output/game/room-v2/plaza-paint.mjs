import * as THREE from 'three';
import {CELLS} from './miniature-rules.mjs';
import {eventAge,impactAge,SHOT_TRAVEL,decay} from './plaza-beats.mjs';

export function createPlazaPaint(scene){
 const size=768;
 function mask(){const canvas=document.createElement('canvas');canvas.width=size;canvas.height=size;const texture=new THREE.CanvasTexture(canvas);texture.minFilter=texture.magFilter=THREE.LinearFilter;texture.generateMipmaps=false;return {canvas,ctx:canvas.getContext('2d'),texture,key:''};}
 const masks=[mask(),mask()],blendUniform={value:0},timeUniform={value:0},floodUniform={value:new THREE.Vector4(0,-20,0,0)};
 const uniforms={uPaintA:{value:masks[0].texture},uPaintB:{value:masks[1].texture},uPaintBlend:blendUniform,uPaintTime:timeUniform,uFlood:floodUniform};
 const mat=new THREE.MeshPhysicalMaterial({color:'#7130ba',roughness:.14,metalness:.09,clearcoat:1,clearcoatRoughness:.10,alphaMap:masks[0].texture,alphaTest:.45,envMapIntensity:1.65,side:THREE.DoubleSide});
 mat.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,uniforms);
  const declarations='uniform sampler2D uPaintA; uniform sampler2D uPaintB; uniform float uPaintBlend; uniform float uPaintTime; uniform vec4 uFlood;';
  shader.vertexShader=declarations+'\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   float inkHeight=mix(texture2D(uPaintA,uv).g,texture2D(uPaintB,uv).g,uPaintBlend);
   vec2 inkWorld=vec2(position.x,-position.y);
   float roll=exp(-pow((inkWorld.y-uFlood.y)/.7,2.0))*exp(-pow(inkWorld.x/max(.1,uFlood.z),4.0))*uFlood.w;
   transformed.z+=smoothstep(.30,.88,inkHeight)*(.065+roll*.14);`);
  shader.fragmentShader=declarations+'\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <alphamap_fragment>',`
   float paintA=texture2D(uPaintA,vAlphaMapUv).g;
   float paintB=texture2D(uPaintB,vAlphaMapUv).g;
   float paintCoverage=mix(paintA,paintB,uPaintBlend);
   diffuseColor.a*=smoothstep(.25,.66,paintCoverage);
   vec2 liquidWorld=vAlphaMapUv*vec2(30.0,-20.0)+vec2(-15.0,10.0);
   float depth=smoothstep(.32,.96,paintCoverage);
   float flowing=sin(liquidWorld.x*1.7+liquidWorld.y*.9-uPaintTime*1.4)+sin(liquidWorld.y*2.2-uPaintTime*1.8)*.4;
   diffuseColor.rgb*=.67+.33*depth;
   float sheen=pow(max(0.0,sin(liquidWorld.x*.85+liquidWorld.y*.72-uPaintTime*.6+flowing*.24)),22.0)*.16;
   diffuseColor.rgb+=vec3(.45,.54,.65)*sheen;
   float washEdge=max(0.0,paintA-paintB)*sin(uPaintBlend*3.14159)*(1.0-smoothstep(.52,.87,paintCoverage));
   diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.72,.94,.87),washEdge*.85);`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
   float ripA=sin(liquidWorld.x*2.0+liquidWorld.y*.8-uPaintTime*1.3);
   float ripB=cos(liquidWorld.y*2.4-liquidWorld.x*.6-uPaintTime*1.5);
   normal=normalize(normal+vec3(ripA*.15-dFdx(paintCoverage)*4.0,ripB*.12-dFdy(paintCoverage)*4.0,0.0));`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <clearcoat_normal_fragment_begin>',`#include <clearcoat_normal_fragment_begin>
   #ifdef USE_CLEARCOAT
    clearcoatNormal=normal;
   #endif`);
 };
 mat.customProgramCacheKey=()=> 'souli-liquid-mask-v2';
 const surface=new THREE.Mesh(new THREE.PlaneGeometry(30,20,100,68),mat);surface.name='Wet_pigment_from_simulation_cells';surface.rotation.x=-Math.PI/2;surface.position.y=.092;surface.receiveShadow=true;surface.frustumCulled=false;scene.add(surface);
 function drawMask(m,owners){if(m.key===owners)return;m.key=owners;const ctx=m.ctx;ctx.fillStyle='#000';ctx.fillRect(0,0,size,size);ctx.save();ctx.filter='blur(3px)';ctx.fillStyle='#fff';const sx=size/30,sz=size/20;for(let i=0;i<CELLS.length;i++)if(owners[i]==='2'){const c=CELLS[i];ctx.beginPath();ctx.ellipse((c.x+15)*sx,(c.z+10)*sz,.39*sx,.39*sz,0,0,Math.PI*2);ctx.fill();}ctx.restore();m.texture.needsUpdate=true;}

 // A connected curved lip follows the same expanding circle as the rules.
 const wet=new THREE.MeshPhysicalMaterial({color:'#7130ba',roughness:.13,metalness:.08,clearcoat:1,clearcoatRoughness:.09,envMapIntensity:1.8,side:THREE.DoubleSide});
 const front=new THREE.Mesh(new THREE.PlaneGeometry(1,1,48,8),wet);front.name='Liquid_flood_front';front.visible=false;front.frustumCulled=false;scene.add(front);
 const frontPositions=front.geometry.attributes.position;
 function floodFront(z,r,progress){for(let row=0;row<=8;row++)for(let col=0;col<=48;col++){
  const across=col/48*2-1,back=row/8,side=Math.sqrt(Math.max(0,1-across*across)),ripple=Math.sin(across*15+progress*17)*.025;
  const settle=Math.min(1,(1-progress)*8);
  frontPositions.setXYZ(row*49+col,across*r,.105+(Math.sin(back*Math.PI)*(.14+.24*(1-progress))*(.3+side*.7)+ripple*side)*settle,z+side*r*.92-back*(.50+.38*progress));
 }frontPositions.needsUpdate=true;front.geometry.computeVertexNormals();front.visible=true;}

 const dummy=new THREE.Object3D(),color=new THREE.Color(),axis=new THREE.Vector3(0,0,1),vector=new THREE.Vector3(),pools={};
 function pool(name,geometry,material,cap){const mesh=new THREE.InstancedMesh(geometry,material,cap);mesh.name='FX_'+name;mesh.count=0;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(mesh);pools[name]={mesh,n:0,cap};return mesh;}
 const water=new THREE.MeshPhysicalMaterial({color:'#ffffff',roughness:.15,clearcoat:1,clearcoatRoughness:.1,envMapIntensity:1.5});
 pool('drops',new THREE.SphereGeometry(1,9,6),water,540);
 pool('foam',new THREE.SphereGeometry(1,7,5),new THREE.MeshStandardMaterial({color:'#f3fff3',roughness:.35}),300);
 pool('rings',new THREE.RingGeometry(.91,1,48),new THREE.MeshBasicMaterial({color:'#d2fff0',transparent:true,opacity:.58,side:THREE.DoubleSide,depthWrite:false,toneMapped:false}),72);
 pool('wash',new THREE.CircleGeometry(1,40,0,Math.PI*1.55),new THREE.MeshBasicMaterial({color:'#c8fcec',transparent:true,opacity:.13,side:THREE.DoubleSide,depthWrite:false}),24);
 pool('spark',new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({color:'#f8ffdb',side:THREE.DoubleSide,toneMapped:false}),128);
 pool('debris',new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:'#bda772',roughness:.35,metalness:.55}),28);
 pool('reservoir',new THREE.SphereGeometry(1,24,10),wet,3);
 pool('splats',new THREE.SphereGeometry(1,10,6),wet,24);
 function put(name,x,y,z,sx,sy,sz,tint,rx=0,ry=0,rz=0){const p=pools[name];if(p.n>=p.cap)return;dummy.position.set(x,y,z);dummy.scale.set(Math.max(.001,sx),Math.max(.001,sy),Math.max(.001,sz));dummy.rotation.set(rx,ry,rz);dummy.updateMatrix();p.mesh.setMatrixAt(p.n,dummy.matrix);if(tint)p.mesh.setColorAt(p.n,color.set(tint));p.n++;}
 function streak(x,y,z,dx,dy,dz,r,tint){const p=pools.drops;if(p.n>=p.cap)return;const length=Math.hypot(dx,dy,dz);dummy.position.set(x,y,z);dummy.scale.set(r,r,Math.max(r,length));dummy.quaternion.setFromUnitVectors(axis,vector.set(dx,dy,dz).normalize());dummy.updateMatrix();p.mesh.setMatrixAt(p.n,dummy.matrix);p.mesh.setColorAt(p.n++,color.set(tint));}
 function ring(x,z,r){put('rings',x,.19,z,r,r,1,null,-Math.PI/2);}
 function flash(x,y,z,age,power=1){const fade=decay(age,.24);if(!fade)return;for(let i=0;i<7;i++){const angle=i*Math.PI*2/7+.12,r=(.19+age*2.7)*power;put('spark',x+Math.sin(angle)*r,y+Math.cos(angle)*r,z,.045*fade,.40*fade*power,1,null,0,.22,-angle);}}

 function update(data,time,reduced,weather,idleState){
  const paintA=data.paintFrom||data.turf,paintB=data.paintTo||data.nextTurf;
  drawMask(masks[0],paintA.owners);drawMask(masks[1],paintB.owners);blendUniform.value=data.phase==='rest'?1:data.blend;timeUniform.value=reduced?0:time;floodUniform.value.set(0,-20,0,0);front.visible=false;
  const ink=weather==='coral'?'#d33a62':'#6d2caf',light=weather==='coral'?'#ffa591':'#bd87ed';mat.color.set(ink);wet.color.set(ink);for(const p of Object.values(pools))p.n=0;
  let shots=0,impacts=0,floods=0,hitBursts=0,washSweeps=0;
  for(const e of data.effects){const age=eventAge(data,e);if(age<0)continue;
   if(e.kind==='gate-hit'){
    if(!reduced&&age<.28){flash(Math.sin(e.at)*.7,.95,-1.58,age,.6);for(let j=0;j<7;j++){const a=j*2.4;put('drops',Math.sin(a)*age*2,.8+Math.cos(a)*age*1.7,-1.8+age*.6,.06*(1-age*2),.04,.09,'#dfd6ae');}}
    continue;
   }
   if(e.kind==='flood'){
    const p=(data.logical-e.at)/e.duration;
    if(p>=1)continue;floods++;const z=e.from.z+(e.to.z-e.from.z)*p,r=1.45+p*1.75;
    floodUniform.value.set(0,z+r*.6,r,reduced?0:Math.sin(p*Math.PI));
    if(reduced){ring(0,z,r);continue;}
    floodFront(z,r,p);
    for(let j=0;j<19;j++){const a=j/18*Math.PI+Math.sin(j*13)*.05,dx=Math.cos(a)*r*(.9+j%3*.07),dz=Math.sin(a)*r*.93,life=Math.sin(p*Math.PI),h=(.11+j%4*.17)*life;streak(dx,.17+h,z+dz,.035*Math.cos(a),.09*life,.06,.02+(.025+j%3*.013)*life,j%5?ink:light);}
    if(age<.9){const fade=decay(age,.9);ring(0,-1.8,.4+age*4.2);for(let j=0;j<22;j++){const a=j*2.399,x=Math.cos(a)*(.4+age*2.5),y=Math.max(.13,.75+Math.sin(j)*.3+age*(1.2+j%3)-5*age*age),z=-1.7+age*(.8+j%5*.4);put('debris',x,y,z,.06*fade,.16*fade,.05*fade,null,age*7+j,age*9,age*5+j);}
     flash(0,1,-1.5,age,2.5);
     for(let j=0;j<25;j++){const a=j*2.399,h=Math.max(.12,.2+age*(3+j%4*.5)-4.8*age*age);put('drops',Math.cos(a)*age*2,h,-1.7+Math.sin(a)*age+age*1.8,.09*fade,.16*fade,.07*fade,j%4?ink:light);}}
    continue;
   }
   if(age>1.2)continue;
   const clean=e.side===1,tint=clean?'#7fdaca':ink,bright=clean?'#f1ffdf':light;
   if(e.kind==='pulse'){
    if(e.source==='repair'||e.source==='gate-repaired'){
     if(!reduced){flash(e.to.x,.8,e.to.z,age,e.source==='gate-repaired'?1.7:.65);for(let j=0;j<7;j++){const a=j*2.4,s=.06*decay(age,.65);put('drops',e.to.x+Math.cos(a)*age,.7+Math.sin(age*Math.PI)*.7,e.to.z+Math.sin(a)*age*.5,s,s*2,s,'#ffe0a0');}}
     if(e.source==='gate-repaired'&&age<.8)ring(e.to.x,e.to.z,.8+age*2);continue;
    }
    if(e.source==='washer'){
     washSweeps++;const p=Math.min(1,age/.55),r=.25+1.3*p;
     if(reduced){ring(e.to.x,e.to.z,1.3);continue;}
     if(age<.65){put('wash',e.to.x,.112,e.to.z,r,r,1,null,-Math.PI/2,0,e.id*.73);ring(e.to.x,e.to.z,r);
      for(let n=0;n<23;n++){const a=n/23*Math.PI*2+e.id*.3,s=.065*decay(age,.7)*(1+n%3*.25);put('foam',e.to.x+Math.cos(a)*r,.15+Math.sin(a*3+p*8)*.025,e.to.z+Math.sin(a)*r,s,s*.65,s*1.5);}
      for(let n=0;n<5;n++){const a=n*2.399;streak(e.to.x+Math.cos(a)*r*.8,.14,e.to.z+Math.sin(a)*r*.8,Math.cos(a)*.13,.008,Math.sin(a)*.13,.025*decay(age,.65),'#efffdf');}}
    }
    continue;
   }
   const flight=e.kind==='shot',f=age/SHOT_TRAVEL;
   if(flight&&f<1){shots++;if(reduced){ring(e.to.x,e.to.z,.3);continue;}const startY=clean?1.03:.63,p=f,x=e.from.x+(e.to.x-e.from.x)*p,z=e.from.z+(e.to.z-e.from.z)*p,y=startY*(1-p)+.48*p+Math.sin(p*Math.PI)*.22;
    const dx=e.to.x-e.from.x,dz=e.to.z-e.from.z,len=Math.hypot(dx,dz)||1;streak(x,y,z,dx/len*.32,-.045,dz/len*.32,clean?.09:.08,bright);
    for(let n=1;n<7;n++){const q=Math.max(0,p-n*.05),s=.06-n*.007;put('drops',e.from.x+dx*q,startY*(1-q)+.48*q+Math.sin(q*Math.PI)*.22,e.from.z+dz*q,s,s,s,tint);}
   }
   const hit=impactAge(data,e);
   if(hit>=0&&hit<.68){impacts++;const cleared=e.source==='cleared',power=cleared?1.5:1;
    if(clean){ring(e.to.x,e.to.z,(.25+hit*2.3)*power);hitBursts++;if(!reduced)flash(e.to.x,.62,e.to.z,hit,power);}
    if(!reduced)for(let n=0;n<(clean?15:13);n++){const a=n*2.399+e.id,r=(.18+hit*2.6)*(.55+n%3*.16)*power,s=(clean?.075:.095)*decay(hit,.7);const h=Math.max(.12,.4+hit*(1.4+n%3*.3)-4*hit*hit);put(clean?'foam':'drops',e.to.x+Math.cos(a)*r,h,e.to.z+Math.sin(a)*r,s,s*1.8,s,clean?null:n%3?ink:light);}
   }
  }

  // Interactive Click-to-Splash Hydro Bombs & Upgrade FX (suppressed in Still/reduced mode)
  if(!reduced&&idleState){
   const u=idleState.activeUpgrades||{};
   for(const sp of idleState.splashes||[]){
    const age=time-sp.bornAt;
    if(age<0||age>=.9)continue;
    const r=.35+age*3.1,fade=decay(age,.9);
    ring(sp.x,sp.z,r);
    put('wash',sp.x,.115,sp.z,r*.92,r*.92,1,null,-Math.PI/2,0,sp.id);
    flash(sp.x,.65,sp.z,age,1.5);
    for(let n=0;n<16;n++){
     const a=n/16*Math.PI*2+sp.id,dist=r*(.45+(n%3)*.22);
     const h=Math.max(.14,.35+age*(2.2+(n%3)*.4)-4.5*age*age);
     put('drops',sp.x+Math.cos(a)*dist,h,sp.z+Math.sin(a)*dist,.08*fade,.15*fade,.08*fade,n%2?'#7fdaca':'#ffe484');
    }
   }
   // Hydro Turrets auto-barrage visual streaks during encounter
   if(u.turrets&&data.phase==='encounter'&&data.enemies?.length){
    for(const side of [-1,1]){
     const phase=(time*2.2+(side<0?0:.5))%1;
     if(phase<.45){
      const p=phase/.45,target=data.enemies[(side<0?0:1)%data.enemies.length];
      const sx=side*2.25,sy=3.75,sz=-2.1;
      const x=sx+(target.x-sx)*p,y=sy*(1-p)+.5*p+Math.sin(p*Math.PI)*.4,z=sz+(target.z-sz)*p;
      streak(x,y,z,(target.x-sx)*.15,-.2,(target.z-sz)*.15,.085,'#6ce6d4');
     }
    }
   }
   // Starlight Fountain gentle water arcs
   if(u.fountain){
    for(let k=0;k<8;k++){
     const a=k/8*Math.PI*2+time*.8,p=(time*1.5+k*.125)%1;
     const r=.18+p*1.05,y=1.65+Math.sin(p*Math.PI)*.45-p*.65;
     put('drops',Math.cos(a)*r,y,3.1+Math.sin(a)*r,.045,.065,.045,'#9ef7e8');
    }
   }
  }

  if(data.phase==='encounter'&&!data.gate.broken&&data.pressure>.07){const p=data.pressure;put('reservoir',0,.17+p*.16,-2.82,.9+p*.95,.15+p*.42,.65+p*.20);}
  const dirt=data.gate.breaches?Math.max(0,1-(data.gate.repair||0)/100):0;
  if(dirt>0)for(let i=0;i<18;i++)put('splats',(i%2?-1:1)*(1.85+i%3*.16),.25+i%7*.15,-1.38,.10+i%4*.035,(.16+i%3*.06)*dirt,.013);
  for(const p of Object.values(pools)){p.mesh.count=p.n;p.mesh.instanceMatrix.needsUpdate=true;if(p.mesh.instanceColor)p.mesh.instanceColor.needsUpdate=true;}
  return {shots,impacts,floods,hitBursts,washSweeps,gateDebris:pools.debris.n,liquidFront:front.visible,paintedCells:data.turf.dirtyCells,particles:pools.drops.n+pools.foam.n+pools.spark.n+pools.debris.n,wetSurface:true};
 }
 return {update,dispose(){masks.forEach(m=>m.texture.dispose());}};
}
