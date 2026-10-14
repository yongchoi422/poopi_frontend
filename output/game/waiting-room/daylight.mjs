import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

// Furniture construction follows the room-v2 rounded-box/lathe model. All
// resources belong to this room and are disposed with the renderer instance.
export function createDaylight(){
 const room=new THREE.Group();room.name='Little_Daylight';const cache=new Map();
 const mat=(color,roughness=.9,metalness=0)=>{const key=`${color}/${roughness}/${metalness}`;if(!cache.has(key))cache.set(key,new THREE.MeshStandardMaterial({color,roughness,metalness}));return cache.get(key);};
 const m={wall:mat('#f4f0e6'),edge:mat('#e0dccf'),wood:mat('#d3b58a'),woodEdge:mat('#bca17a'),blue:mat('#37689a'),blueDark:mat('#294e79'),blueLight:mat('#7c9fbb'),gold:mat('#b89554',.4,.6),cream:mat('#fff7df',.65),rug:mat('#d9d6c7'),sage:mat('#8e9a86'),dark:mat('#647779')};
 function mesh(geo,material,pos=[0,0,0],parent=room){const o=new THREE.Mesh(geo,material);o.position.set(...pos);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
 function box(size,pos,material,r=.045,parent=room){return mesh(new RoundedBoxGeometry(...size,2,Math.min(r,...size.map(v=>v*.44))),material,pos,parent);}
 function cyl(rt,rb,h,pos,material,segments=32){return mesh(new THREE.CylinderGeometry(rt,rb,h,segments),material,pos);}
 function rod(a,b,r,material){const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),o=cyl(r,r,p.distanceTo(q),p.clone().add(q).multiplyScalar(.5).toArray(),material,12);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),q.sub(p).normalize());return o;}
 box([8.5,.26,6.5],[0,-.14,.65],m.edge,.09);box([8.38,.075,6.38],[0,.015,.65],m.wall,.025);
 const planks=document.createElement('canvas');planks.width=1024;planks.height=768;const plankCtx=planks.getContext('2d');plankCtx.fillStyle='#f4f0e6';plankCtx.fillRect(0,0,1024,768);plankCtx.strokeStyle='#ddd9cd';plankCtx.lineWidth=1;
 for(let row=0;row<12;row++){const y=row*64;plankCtx.beginPath();plankCtx.moveTo(0,y);plankCtx.lineTo(1024,y);for(let col=0;col<4;col++){const x=col*340+(row%2)*170;plankCtx.moveTo(x,y);plankCtx.lineTo(x,y+64);}plankCtx.stroke();}
 const floorTexture=new THREE.CanvasTexture(planks);floorTexture.colorSpace=THREE.SRGBColorSpace;const floor=mesh(new THREE.PlaneGeometry(8.28,6.28),new THREE.MeshStandardMaterial({map:floorTexture,roughness:1}),[0,.057,.65]);floor.rotation.x=-Math.PI/2;floor.castShadow=false;
 // Actual opening in the back wall, leaving the view and the front unobstructed.
 box([.58,4.2,.19],[-3.94,2.1,-2.57],m.wall);box([4.48,4.2,.19],[1.98,2.1,-2.57],m.wall);
 box([3.25,1.02,.19],[-2.04,.51,-2.57],m.wall);box([3.25,.42,.19],[-2.04,3.99,-2.57],m.wall);
 box([.18,4.2,1.85],[-4.2,2.1,-1.65],m.wall);box([.18,1.25,2.0],[4.2,.625,-1.58],m.wall);
 box([8.25,.13,.09],[0,.12,-2.43],m.edge,.015);
 const sky=mesh(new THREE.PlaneGeometry(3.3,2.76),new THREE.MeshBasicMaterial({color:'#dae8e5',toneMapped:false}),[-2.04,2.40,-2.69]);sky.castShadow=false;
 const sun=mesh(new THREE.CircleGeometry(.23,40),new THREE.MeshBasicMaterial({color:'#fff7dd',toneMapped:false}),[-1.34,3.12,-2.67]);sun.castShadow=false;
 const clouds=[];for(const [x,y,s]of [[-2.8,2.98,.34],[-1.9,3.45,.26]]){const c=mesh(new THREE.SphereGeometry(1,16,8),new THREE.MeshBasicMaterial({color:'#f7faf3',toneMapped:false}),[x,y,-2.65]);c.scale.set(s*1.8,s*.4,.02);c.castShadow=false;clouds.push({mesh:c,x});}
 const hill=new THREE.Shape();hill.moveTo(-1.66,-1.4);hill.lineTo(-1.66,-.89);hill.quadraticCurveTo(-.8,-.31,0,-.83);hill.quadraticCurveTo(.9,-1.18,1.66,-.61);hill.lineTo(1.66,-1.4);hill.closePath();const hillside=mesh(new THREE.ShapeGeometry(hill),new THREE.MeshBasicMaterial({color:'#bbcabb',toneMapped:false}),[-2.04,2.4,-2.63]);hillside.castShadow=false;
 for(const x of [-3.69,-.39])box([.13,2.95,.24],[x,2.42,-2.45],m.cream,.02);
 for(const y of [1.0,3.84])box([3.45,.13,.24],[-2.04,y,-2.45],m.cream,.02);
 box([.075,2.78,.15],[-2.04,2.42,-2.36],m.cream,.012);box([3.25,.075,.15],[-2.04,2.42,-2.36],m.cream,.012);box([3.62,.12,.55],[-2.04,.98,-2.32],m.wood,.035);
 rod([-3.95,4.02,-2.10],[-.12,4.02,-2.10],.026,m.gold);
 const curtains=[];for(const x of [-3.68,-.37]){const g=new THREE.PlaneGeometry(.50,2.95,20,12),p=g.attributes.position;for(let i=0;i<p.count;i++)p.setZ(i,Math.cos(p.getX(i)*Math.PI*12)*.046);g.computeVertexNormals();const cloth=mat('#e6e2d5').clone();cloth.side=THREE.DoubleSide;const c=mesh(g,cloth,[x,2.47,-2.12]);curtains.push(c);}
 const rug=mesh(new THREE.CircleGeometry(1,64),m.rug,[.22,.064,1.15]);rug.rotation.x=-Math.PI/2;rug.scale.set(2.52,1.52,1);rug.castShadow=false;
 const rugInner=mesh(new THREE.RingGeometry(.95,1,64),mat('#cbcbbb'),[.22,.068,1.15]);rugInner.rotation.x=-Math.PI/2;rugInner.scale.set(2.42,1.43,1);rugInner.castShadow=false;
 // Warm daylight falls across the floor; there are no particle emitters.
 const beam=new THREE.Shape();beam.moveTo(-3.4,-1.9);beam.lineTo(-.65,-1.9);beam.lineTo(1.4,2.9);beam.lineTo(-2,2.9);beam.closePath();const lightPatch=mesh(new THREE.ShapeGeometry(beam),new THREE.MeshBasicMaterial({color:'#fff3c9',transparent:true,opacity:.19,depthWrite:false}),[0,.071,0]);lightPatch.rotation.x=-Math.PI/2;lightPatch.castShadow=false;
 // Small oak table, a closed book, and a quiet ceramic cup.
 const table=cyl(.95,.92,.13,[-2.6,.84,1.21],m.wood,48);table.scale.z=.76;
 for(const [dx,dz]of [[-.55,-.30],[.55,-.30],[0,.43]])rod([-2.6+dx*1.2,.07,1.21+dz*1.2],[-2.6+dx,.8,1.21+dz],.055,m.woodEdge);
 box([.67,.075,.43],[-2.84,.946,1.12],m.blue,.018);box([.61,.045,.40],[-2.84,.985,1.12],m.cream,.006);
 const profile=[[0,0],[.14,0],[.17,.035],[.175,.23],[.15,.26],[.134,.24],[.13,.06],[0,.06]].map(p=>new THREE.Vector2(...p));mesh(new THREE.LatheGeometry(profile,32),m.cream,[-2.19,.91,1.31]);const handle=mesh(new THREE.TorusGeometry(.078,.022,8,20),m.cream,[-1.99,1.045,1.31]);handle.scale.y=1.12;cyl(.127,.127,.004,[-2.19,1.142,1.31],mat('#87745d'),24);
 // The blue cushion is kept low enough that even a dot has a visible front.
 box([1.82,.30,1.52],[2.03,.23,.57],m.blueDark,.14);box([1.75,.28,1.43],[2.01,.39,.59],m.blue,.13);
 const back=box([1.48,.91,.25],[2.11,.83,.00],m.blue,.12);back.rotation.set(-.18,0,-.11);
 for(const x of [1.27,2.73]){const seam=rod([x,.48,-.04],[x,.48,1.18],.012,m.blueLight);seam.castShadow=false;}
 const button=cyl(.052,.052,.012,[2.1,.85,.145],m.blueDark,20);button.rotation.x=Math.PI/2;
 cyl(.35,.38,.09,[3.17,.07,-1.15],m.gold);rod([3.17,.1,-1.15],[3.17,2.65,-1.15],.036,m.gold);
 const shade=cyl(.43,.67,.75,[3.17,2.74,-1.15],m.cream,48);cyl(.67,.67,.03,[3.17,2.375,-1.15],m.gold,48);cyl(.08,.08,.07,[3.17,3.17,-1.15],m.gold,20);
 const lampLight=new THREE.PointLight('#ffe1a2',1.1,4,2);lampLight.position.set(3.17,2.36,-1.15);room.add(lampLight);
 // A small wall print and ceramic vase give scale without surrounding the soul.
 box([1.03,1.34,.06],[1.51,2.63,-2.42],m.wood,.02);box([.89,1.20,.02],[1.51,2.63,-2.375],m.cream,.005);
 const print=mesh(new THREE.CircleGeometry(.24,32),mat('#b5c6c9'),[1.48,2.79,-2.35]);print.castShadow=false;box([.38,.04,.007],[1.58,2.40,-2.343],m.gold,.002);
 cyl(.12,.2,.37,[-3.04,1.24,-2.24],m.cream,28);rod([-3.04,1.35,-2.24],[-3.14,1.91,-2.2],.012,m.woodEdge);
 for(const [x,y,angle]of [[-3.08,1.58,-.6],[-3.17,1.76,.6]]){const leaf=mesh(new THREE.SphereGeometry(1,12,8),m.sage,[x,y,-2.18]);leaf.scale.set(.12,.045,.035);leaf.rotation.z=angle;}
 return {room,animate(seconds,still){curtains.forEach((c,i)=>c.rotation.y=still?0:Math.sin(seconds*.23+i)*.016);clouds.forEach((c,i)=>c.mesh.position.x=c.x+(still?0:Math.sin(seconds*.035+i)*.10));}};
}

export function disposeTree(root){
 const geometries=new Set(),materials=new Set(),textures=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material]){materials.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v);}});
 geometries.forEach(g=>g.dispose());textures.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());root.clear();
}
