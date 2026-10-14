import * as THREE from 'three';
import {TURF,TURF_CELLS,PALETTE} from './grove-turf.mjs';

export function createGrovePaint(scene,options={}){
  const cells=options.cells||TURF_CELLS,bounds=options.bounds||TURF,restore=!!options.restore;
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=576;
  const ctx=canvas.getContext('2d'),texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  texture.minFilter=THREE.LinearFilter;texture.generateMipmaps=false;
  const surface=new THREE.Mesh(new THREE.PlaneGeometry(bounds.maxX-bounds.minX,bounds.maxZ-bounds.minZ),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,toneMapped:false,fog:false,opacity:.94}));
  surface.name='Living_color_territory';surface.rotation.x=-Math.PI/2;surface.position.set(0,.088,(bounds.minZ+bounds.maxZ)/2);scene.add(surface);
  const material=new THREE.MeshBasicMaterial({color:'#ffffff',toneMapped:false,fog:false});
  const drops=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,1),material,320);
  const rings=new THREE.InstancedMesh(new THREE.RingGeometry(.83,1,28),new THREE.MeshBasicMaterial({color:'#ffffff',toneMapped:false,fog:false,side:THREE.DoubleSide,transparent:true,opacity:.8,depthWrite:false}),80);
  const surges=new THREE.InstancedMesh(new THREE.SphereGeometry(1,12,6),new THREE.MeshBasicMaterial({color:'#ffffff',toneMapped:false,fog:false,transparent:true,opacity:.75,depthWrite:false}),10);
  for(const mesh of [drops,rings,surges]){mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.count=0;scene.add(mesh);}
  const dummy=new THREE.Object3D(),color=new THREE.Color();let ownership='',dropCount=0,ringCount=0,surgeCount=0;
  function drawTurf(owners='',palette=PALETTE){
    const key=owners+palette.wild;if(ownership===key)return;ownership=key;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    const sx=canvas.width/(bounds.maxX-bounds.minX),sz=canvas.height/(bounds.maxZ-bounds.minZ);
    for(let i=0;i<cells.length;i++){
      const owner=+owners[i];if(!owner||(restore&&owner!==2))continue;
      const cell=cells[i],x=(cell.x-bounds.minX)*sx,z=(cell.z-bounds.minZ)*sz;
      const edge=.73+(i*17%7)*.01;
      ctx.fillStyle=owner===1?palette.soul:palette.wild;ctx.beginPath();ctx.ellipse(x,z,bounds.step*sx*edge,bounds.step*sz*edge,0,0,Math.PI*2);ctx.fill();
    }
    // Deterministic little gleams soften a grid into pools of living pigment.
    for(let i=0;i<cells.length;i+=9){
      const owner=+owners[i];if(!owner||(restore&&owner!==2))continue;const cell=cells[i];
      ctx.fillStyle=(owner===1?palette.soulLight:palette.wildLight)+'66';ctx.beginPath();ctx.ellipse((cell.x-bounds.minX)*sx-3,(cell.z-bounds.minZ)*sz-4,4,1.8,-.3,0,Math.PI*2);ctx.fill();
    }
    texture.needsUpdate=true;
  }
  function drop(x,y,z,size,tint,stretch=1){
    if(dropCount>=320)return;dummy.position.set(x,y,z);dummy.rotation.set(0,0,0);dummy.scale.set(size,size*stretch,size);dummy.updateMatrix();drops.setMatrixAt(dropCount,dummy.matrix);drops.setColorAt(dropCount,color.set(tint));dropCount++;
  }
  function ring(x,z,radius,tint){
    if(ringCount>=80)return;dummy.position.set(x,.12,z);dummy.rotation.set(-Math.PI/2,0,0);dummy.scale.setScalar(Math.max(.001,radius));dummy.updateMatrix();rings.setMatrixAt(ringCount,dummy.matrix);rings.setColorAt(ringCount,color.set(tint));ringCount++;
  }
  function update({turf,effects=[],logical=0,reducedMotion=false,palette=PALETTE}){
    drawTurf(turf?.owners||'',palette);dropCount=0;ringCount=0;surgeCount=0;let projectiles=0,impacts=0,beaconHit=0,floods=0;
    for(const e of effects){
      const age=(logical-e.at)/6;if(age<0)continue;
      const tint=e.side===1?palette.soul:palette.wild,bright=e.side===1?palette.soulLight:palette.wildLight;
      const from=e.from,to=e.to;
      if(e.kind==='flood'){
        const p=(logical-e.at)/(e.duration||7);if(p>1)continue;floods++;
        const dx=to.x-from.x,dz=to.z-from.z,length=Math.hypot(dx,dz),width=1.15+p*.55;
        const x=from.x+dx*p,z=from.z+dz*p;
        if(reducedMotion){ring(x,z,width,tint);continue;}
        for(let wake=0;wake<3&&surgeCount<10;wake++){
          const q=Math.max(0,p-wake*.065);dummy.position.set(from.x+dx*q,.16+Math.sin(p*Math.PI)*.12,from.z+dz*q);dummy.rotation.set(0,Math.atan2(dx,dz),0);dummy.scale.set(width,.20*(1-p)+.08,.7-wake*.12);dummy.updateMatrix();surges.setMatrixAt(surgeCount,dummy.matrix);surges.setColorAt(surgeCount,color.set(tint));surgeCount++;
        }
        for(let n=-3;n<=3;n++)drop(x+dz/length*n*width/3,.26+Math.sin(p*Math.PI)*.35,z-dx/length*n*width/3,.08,bright,1.5);
        continue;
      }
      if(age>.7)continue;
      if(e.kind==='beacon-hit')beaconHit=Math.max(beaconHit,Math.max(0,1-age/.7));
      if(e.kind==='spawn'){if(age<.5)ring(to.x,to.z,.35+age*.9,tint);continue;}
      if(reducedMotion){ring(to.x,to.z,e.radius*.65,tint);impacts++;continue;}
      if(e.kind==='pulse'){ring(to.x,to.z,e.radius*Math.min(1,age/.48),bright);continue;}
      const flight=e.kind==='shot'||e.kind==='beacon-hit';
      if(flight&&age<.20){
        const t=Math.min(1,age/.20);
        for(let tail=0;tail<3;tail++){
          const p=Math.max(0,t-tail*.16),x=from.x+(to.x-from.x)*p,z=from.z+(to.z-from.z)*p,y=(from.y||.5)+((to.y||.1)-(from.y||.5))*p+Math.sin(p*Math.PI)*.65;
          drop(x,y,z,tail===0?.16:.095-tail*.022,tail===0?bright:tint,1.1);
        }
        projectiles++;
      }
      const impactAge=flight?age-.12:age;
      if(impactAge>=0&&impactAge<.56){
        const p=impactAge/.56,spread=e.radius*(.25+p*.8);ring(to.x,to.z,spread,tint);impacts++;
        for(let n=0;n<7;n++){
          const a=n*Math.PI*2/7+e.id*.81,r=spread*(.65+(n%3)*.15);
          drop(to.x+Math.cos(a)*r,.13+Math.sin(p*Math.PI)*(.5+(n%2)*.35),to.z+Math.sin(a)*r,.11*(1-p)+.025,n%3? tint:bright,1.5);
        }
      }
    }
    drops.count=dropCount;rings.count=ringCount;surges.count=surgeCount;
    for(const mesh of [drops,rings,surges]){mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;}
    return {projectiles,impacts,effectParticles:dropCount,effectRings:ringCount,floods,surgeMeshes:surgeCount,beaconHit,paintedCells:turf?(restore?turf.dirtyCells:turf.soulCells+turf.wildCells):0};
  }
  return {update};
}
