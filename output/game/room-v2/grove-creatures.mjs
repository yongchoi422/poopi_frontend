import * as THREE from 'three';
import {PALETTE} from './grove-turf.mjs';

// Shared part pools: expressive silhouettes without one draw call per limb.
export function createGroveCreatures(scene){
  const pools={},dummy=new THREE.Object3D(),color=new THREE.Color();
  const bodyMat=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.58,flatShading:true,fog:false});
  const plain=new THREE.MeshBasicMaterial({color:'#ffffff',toneMapped:false,fog:false});
  const addPool=(key,geometry,material,capacity)=>{
    const mesh=new THREE.InstancedMesh(geometry,material,capacity);mesh.name=`Visitors_${key}`;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.count=0;scene.add(mesh);pools[key]={mesh,count:0,capacity};
  };
  addPool('round',new THREE.IcosahedronGeometry(1,2),bodyMat,180);
  addPool('face',new THREE.SphereGeometry(1,8,6),plain,100);
  addPool('point',new THREE.ConeGeometry(1,1,6),bodyMat,100);
  addPool('wing',new THREE.SphereGeometry(1,8,5),bodyMat,80);
  addPool('contact',new THREE.CircleGeometry(1,16),new THREE.MeshBasicMaterial({color:'#292039',transparent:true,opacity:.28,depthWrite:false}),20);
  let current,visitorPalette=null;const tintHsl={},targetHsl={};
  function part(pool,position,scale,tint,rotation=[0,0,0]){
    const p=pools[pool];if(p.count>=p.capacity)return;
    const [x,y,z]=position,heading=current.lane===0?.3:-.3,c=Math.cos(heading),s=Math.sin(heading);
    dummy.position.set(current.x+x*c+z*s,current.y+y,current.z+z*c-x*s);
    if(pool==='contact')dummy.rotation.set(-Math.PI/2,0,heading);else dummy.rotation.set(rotation[0],rotation[1]+heading,rotation[2]);dummy.scale.set(...scale);if(current.hit&&pool!=='contact'){dummy.scale.x*=1.12;dummy.scale.y*=.76;}dummy.updateMatrix();p.mesh.setMatrixAt(p.count,dummy.matrix);color.set(tint);
    if(visitorPalette&&['round','point','wing'].includes(pool)){color.getHSL(tintHsl);if(tintHsl.h>.58&&tintHsl.h<.95)color.setHSL(targetHsl.h,Math.max(.48,tintHsl.s),tintHsl.l);}
    p.mesh.setColorAt(p.count,color);p.count++;
  }
  function eyes(y,z,separation=.12){
    for(const x of [-separation,separation]){
      part('face',[x,y,z],[.09,.105,.037],'#fff5d9');
      part('face',[x+.012,y-.012,z+.033],[.038,.062,.024],PALETTE.dark);
    }
  }
  function update(enemies=[],time=0,reduced=false,palette=null){
    visitorPalette=palette;if(palette)color.set(palette.wild).getHSL(targetHsl);
    for(const p of Object.values(pools))p.count=0;
    for(const e of enemies){
      const hop=reduced?0:Math.abs(Math.sin(time*7+e.id))*.10;
      current={...e,y:e.kind==='moth'?.55+(reduced?0:Math.sin(time*5+e.id)*.09):.1+hop};
      const oldY=current.y;current.y=.093;
      part('contact',[0,0,0],[e.kind==='moth'?.42:.38,.26,1],'#ffffff',[-Math.PI/2,0,0]);current.y=oldY;
      if(e.kind==='shadow'){
        part('round',[0,.3,0],[.37,.4,.29],PALETTE.wild);
        part('round',[0,.11,.09],[.42,.15,.30],'#7542b7');
        for(const sign of [-1,1]){
          part('point',[sign*.22,.73,0],[.13,.37,.15],'#cd87ff',[0,0,-sign*.3]);
          part('round',[sign*.24,.03,.13],[.14,.10,.2],PALETTE.dark);
          part('round',[sign*.39,.29,.03],[.10,.16,.11],'#ac58db',[0,0,sign*.45]);
        }
        eyes(.4,.269);
        part('face',[0,.2,.29],[.065,.018,.012],PALETTE.dark);
      }else if(e.kind==='dust'){
        part('round',[0,.2,0],[.44,.25,.34],'#c762d8');
        part('round',[0,.35,-.06],[.32,.2,.27],'#7940bb');
        for(const sign of [-1,1])for(let leg=0;leg<2;leg++)part('round',[sign*(.32+leg*.10),.04,.21-leg*.33],[.19,.065,.10],'#593279',[0,0,sign*(reduced?0:Math.sin(time*9+leg+e.id)*.22)]);
        part('point',[0,.65,-.06],[.13,.37,.14],'#efad62',[0,0,-.25]);
        eyes(.25,.32,.14);
      }else{
        part('round',[0,.16,0],[.17,.25,.20],'#7940a9');
        const flap=reduced?.22:Math.sin(time*16+e.id)*.5;
        for(const sign of [-1,1]){
          part('wing',[sign*.30,.22,-.07],[.37,.12,.35],'#c175ee',[0,0,sign*flap]);
          part('wing',[sign*.31,.19,.21],[.26,.09,.21],'#eaabe9',[0,0,-sign*flap*.7]);
          part('point',[sign*.13,.57,.03],[.055,.32,.055],'#f4cb93',[0,0,-sign*.4]);
        }
        eyes(.25,.19,.085);
      }
    }
    let parts=0;
    for(const p of Object.values(pools)){p.mesh.count=p.count;p.mesh.instanceMatrix.needsUpdate=true;if(p.mesh.instanceColor)p.mesh.instanceColor.needsUpdate=true;parts+=p.count;}
    return {creatures:enemies.length,creatureParts:parts,creatureKinds:Object.fromEntries(['dust','shadow','moth'].map(kind=>[kind,enemies.filter(e=>e.kind===kind).length]))};
  }
  return {update};
}
