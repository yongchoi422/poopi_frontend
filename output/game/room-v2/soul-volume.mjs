import * as THREE from 'three';

// Resolve the original SVG painter's order before modeling. Facial marks replace
// body colors on the same front surface; they are not separate stacked blocks.
export function visiblePixels(rectangles) {
  const grid=new Map();
  for(const rect of rectangles) {
    for(let y=rect.y;y<rect.y+rect.height;y++)for(let x=rect.x;x<rect.x+rect.width;x++) {
      grid.set(`${x},${y}`,{x,y,color:rect.fill});
    }
  }
  return grid;
}

export function pixelComponents(grid) {
  const remaining=new Set(grid.keys()),components=[];
  while(remaining.size) {
    const start=remaining.values().next().value,queue=[start],cells=[];remaining.delete(start);
    for(let i=0;i<queue.length;i++) {
      const p=grid.get(queue[i]);cells.push(p);
      for(const [dx,dy] of [[1,0],[0,1],[-1,0],[0,-1]]) {
        const key=`${p.x+dx},${p.y+dy}`;if(remaining.delete(key))queue.push(key);
      }
    }
    components.push(cells);
  }
  return components.sort((a,b)=>b.length-a.length);
}

function signedArea(points) {
  return points.reduce((sum,p,i)=>{const q=points[(i+1)%points.length];return sum+p[0]*q[1]-q[0]*p[1]},0)/2;
}

// Trace only the perimeter of a connected silhouette. Joining neighboring cells
// removes internal cube seams while retaining all stair-step pixel contours.
export function componentContours(cells) {
  const occupied=new Set(cells.map(p=>`${p.x},${p.y}`)),edges=[],starts=new Map();
  function edge(a,b,dir){const e={a,b,dir,used:false};edges.push(e);const key=a.join(',');if(!starts.has(key))starts.set(key,[]);starts.get(key).push(e)}
  for(const {x,y} of cells) {
    if(!occupied.has(`${x},${y-1}`))edge([x,y],[x+1,y],0);
    if(!occupied.has(`${x+1},${y}`))edge([x+1,y],[x+1,y+1],1);
    if(!occupied.has(`${x},${y+1}`))edge([x+1,y+1],[x,y+1],2);
    if(!occupied.has(`${x-1},${y}`))edge([x,y+1],[x,y],3);
  }
  const loops=[];
  for(const first of edges) {
    if(first.used)continue;
    const points=[];let current=first;
    for(let count=0;count<=edges.length;count++) {
      current.used=true;points.push(current.a);
      if(current.b[0]===first.a[0]&&current.b[1]===first.a[1])break;
      const options=(starts.get(current.b.join(','))||[]).filter(e=>!e.used);
      const priorities=[1,0,3,2];options.sort((a,b)=>priorities.indexOf((a.dir-current.dir+4)%4)-priorities.indexOf((b.dir-current.dir+4)%4));
      if(!options.length)throw new Error('Open pixel silhouette');current=options[0];
      if(count===edges.length)throw new Error('Pixel contour did not close');
    }
    const corners=points.filter((p,i)=>{const a=points[(i+points.length-1)%points.length],b=points[(i+1)%points.length];return (p[0]-a[0])*(b[1]-p[1])!==(p[1]-a[1])*(b[0]-p[0])});
    loops.push({points:corners,area:signedArea(corners)});
  }
  return loops;
}

export function createSoulVolume(soul,{depth=4,roundness=.14,worldWidth=1.75}={}) {
  const group=new THREE.Group();group.name='SOULI_Pixel_Figure';
  const grid=visiblePixels(soul.rectangles),components=pixelComponents(grid);
  const [vx,vy,vw,vh]=soul.frame,unit=worldWidth/vw,cx=vx+vw/2,bottom=vy+vh;
  const rounded=THREE.MathUtils.clamp(roundness,0,.28),thickness=THREE.MathUtils.clamp(depth,.6,8);
  const position=[],colors=[],frontCells=[],componentMetadata=[];
  const colorCache=new Map();
  function rgb(hex){if(!colorCache.has(hex))colorCache.set(hex,new THREE.Color(hex));return colorCache.get(hex)}
  components.forEach((cells,index)=>{
    const tally=new Map();cells.forEach(p=>tally.set(p.color,(tally.get(p.color)||0)+1));
    const dominant=[...tally].sort((a,b)=>b[1]-a[1])[0][0];
    const isParticle=index>0&&cells.length<components[0].length*.12;
    const d=isParticle?Math.max(.55,thickness*.42):thickness,b=Math.min(rounded,d*.2);
    const loops=componentContours(cells);
    const convert=p=>new THREE.Vector2(p[0]-cx,bottom-p[1]);
    const outer=loops.filter(l=>l.area>0),holes=loops.filter(l=>l.area<0);
    const shapes=outer.map(loop=>new THREE.Shape(loop.points.map(convert)));
    // A 4-connected component has one exterior; holes are genuinely empty pixels.
    if(shapes.length!==1)throw new Error('Ambiguous connected silhouette');
    shapes[0].holes=holes.map(loop=>new THREE.Path(loop.points.map(convert)));
    const geo=new THREE.ExtrudeGeometry(shapes,{depth:d,steps:1,bevelEnabled:b>0,bevelThickness:b,bevelSize:b,bevelSegments:3,curveSegments:1});
    geo.translate(0,b,-d/2);
    const mat=new THREE.MeshStandardMaterial({color:dominant,roughness:.8,metalness:0});mat.name=`original_side_${dominant.slice(1)}`;
    const mesh=new THREE.Mesh(geo,mat);mesh.name=index===0?'Continuous_pixel_body':`Floating_pixel_${index}`;mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
    componentMetadata.push({pixels:cells.length,dominant,depth:d,holes:holes.length,outlineArea:loops.reduce((sum,l)=>sum+l.area,0)});
    const z=d/2+b+.008;
    for(const cell of cells) {
      const x=cell.x-cx,y=bottom-cell.y-1+b,c=rgb(cell.color);
      for(const [px,py] of [[x,y],[x+1,y],[x+1,y+1],[x,y],[x+1,y+1],[x,y+1]]){position.push(px,py,z);colors.push(c.r,c.g,c.b)}
      frontCells.push({...cell});
    }
  });
  const frontGeometry=new THREE.BufferGeometry();frontGeometry.setAttribute('position',new THREE.Float32BufferAttribute(position,3));frontGeometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));frontGeometry.computeVertexNormals();
  // Unlit front colors preserve the original SVG palette. Lit continuous sides
  // and the cast shadow supply depth; the back deliberately has no invented face.
  const face=new THREE.Mesh(frontGeometry,new THREE.MeshBasicMaterial({vertexColors:true,toneMapped:false}));face.name='Original_pixel_front';face.castShadow=false;group.add(face);
  group.scale.setScalar(unit);
  group.userData={kind:'optional-game-appearance',source:soul.name,depthPixels:thickness,roundnessPixels:rounded,worldUnitsPerPixel:unit,visiblePixelCount:grid.size,componentMetadata,frontPixels:frontCells,backRule:'solid dominant color per connected component',frontRule:'original visible colors, unlit'};
  return group;
}

export function disposeSoulVolume(group) {
  const geometries=new Set(),materials=new Set();
  group.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m))});
  geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
}
