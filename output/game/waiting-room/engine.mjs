import * as THREE from 'three';
import {createDaylight,disposeTree} from './daylight.mjs';
import {createSoulVolume,disposeSoulVolume,pixelComponents,visiblePixels} from './soul-volume.mjs';

function frontCanvas(art,image){
 if(!art.rectangles)return image;
 const [x,y,w,h]=art.frame,c=document.createElement('canvas');c.width=w*24;c.height=h*24;const ctx=c.getContext('2d');ctx.scale(24,24);ctx.translate(-x,-y);for(const r of art.rectangles){ctx.fillStyle=r.fill;ctx.fillRect(r.x,r.y,r.width,r.height);}return c;
}
function contactTexture(){const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d'),g=ctx.createRadialGradient(64,64,3,64,64,62);g.addColorStop(0,'rgba(35,44,53,.35)');g.addColorStop(.5,'rgba(35,44,53,.12)');g.addColorStop(1,'rgba(35,44,53,0)');ctx.fillStyle=g;ctx.fillRect(0,0,128,128);return new THREE.CanvasTexture(c);}

export function createEngine(stage,{prefer2D=false,createFigure=createSoulVolume,onContextLost=()=>{}}={}){
 let renderer,scene,camera,daylight,figure=null,art=null,image=null,mode='none',width=1,height=1,close=false,disposed=false,webgl=false,poses=null;
 let contact=null,renderCount=0,modelError=null,source=null,finalResources=null,contextLost=false;
 let canvas=document.createElement('canvas');canvas.className='wr-canvas';canvas.setAttribute('aria-label','Little Daylight, a white miniature room');
 const root=new THREE.Group();
 if(!prefer2D){
  try{
   renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});canvas=renderer.domElement;canvas.className='wr-canvas';canvas.setAttribute('aria-label','Little Daylight, a white miniature room');renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor('#eeeade');renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
   scene=new THREE.Scene();scene.add(root);daylight=createDaylight();root.add(daylight.room);
   scene.add(new THREE.HemisphereLight('#fff9e9','#a8a79b',1.7));const light=new THREE.DirectionalLight('#fff0d0',2.7);light.position.set(-3.5,7,3.5);light.castShadow=true;light.shadow.mapSize.set(1024,1024);Object.assign(light.shadow.camera,{left:-6,right:6,top:6,bottom:-5,near:.1,far:25});light.shadow.normalBias=.065;light.shadow.bias=-.0005;scene.add(light);
   const fill=new THREE.DirectionalLight('#d9e7f3',.55);fill.position.set(5,4,8);scene.add(fill);
   camera=new THREE.OrthographicCamera(-5,5,3.2,-3.2,.1,60);
   contact=new THREE.Mesh(new THREE.PlaneGeometry(1.7,1.0),new THREE.MeshBasicMaterial({map:contactTexture(),transparent:true,depthWrite:false,toneMapped:false}));contact.rotation.x=-Math.PI/2;root.add(contact);contact.visible=false;
   webgl=true;
  }catch(error){if(renderer){if(scene)disposeTree(scene);renderer.dispose();renderer.forceContextLoss();renderer=null;}canvas=document.createElement('canvas');canvas.className='wr-canvas';canvas.setAttribute('aria-label','Little Daylight with the original 2D soul');modelError='WebGL is unavailable.';}
 }
 stage.prepend(canvas);
 const lost=e=>{e.preventDefault();onContextLost();};canvas.addEventListener('webglcontextlost',lost);
 function clear(){if(figure){scene.remove(figure);disposeTree(figure);figure=null;}art=null;image=null;source=null;mode='none';if(contact)contact.visible=false;}
 function setSoul(nextArt,nextImage){
  clear();art=nextArt;image=nextImage;modelError=null;
  if(!art)return 'none';source=frontCanvas(art,image);
  mode='original2d';
  if(webgl){
   if(art.mode==='volume'){
    try{if(pixelComponents(visiblePixels(art.rectangles)).length>64)throw Error('Artwork has too many separate pieces.');figure=createFigure(art,{worldWidth:art.dot?1.08:1.83,depth:art.dot?1.2:3.2,roundness:.12});if(!figure?.isObject3D)throw Error('The soul model could not be created.');figure.traverse(o=>o.castShadow=false);mode='volume';}
    catch(error){if(figure?.isObject3D)disposeSoulVolume(figure);figure=null;modelError='The original is shown in 2D.';}
   }
   if(!figure){const source=frontCanvas(art,image),texture=source instanceof HTMLCanvasElement?new THREE.CanvasTexture(source):new THREE.Texture(source);texture.needsUpdate=true;texture.colorSpace=THREE.SRGBColorSpace;texture.minFilter=THREE.NearestFilter;texture.magFilter=THREE.NearestFilter;texture.generateMipmaps=false;const aspect=source.width/source.height,w=art.dot?1.08:1.83,h=w/aspect;figure=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:texture,transparent:true,toneMapped:false,side:THREE.DoubleSide}));figure.geometry.translate(0,h/2,0);figure.userData={frontRule:'validated original 2D'};}
   scene.add(figure);contact.visible=true;
  }
  return mode;
 }
 function resize(){width=Math.max(1,stage.clientWidth);height=Math.max(1,stage.clientHeight);if(webgl){renderer.setSize(width,height,false);}else{const dpr=Math.min(devicePixelRatio,1.5);canvas.width=width*dpr;canvas.height=height*dpr;}if(poses)draw(...poses);}
 function drawFallback(p,still){
  const ctx=canvas.getContext('2d'),dpr=canvas.width/width;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#eeeade';ctx.fillRect(0,0,width,height);
  const s=Math.max(width/1000,height/680),ox=width/2,oy=height*.56;ctx.save();ctx.translate(ox,oy);ctx.scale(s,s);
  ctx.fillStyle='#faf7ef';ctx.fillRect(-470,-300,940,355);ctx.fillStyle='#e5ddca';ctx.fillRect(-470,55,940,210);
  ctx.fillStyle='#d4e4e4';ctx.fillRect(-365,-259,285,227);ctx.fillStyle='#b8c7b6';ctx.beginPath();ctx.moveTo(-365,-60);ctx.quadraticCurveTo(-260,-155,-80,-65);ctx.lineTo(-80,-32);ctx.lineTo(-365,-32);ctx.fill();ctx.strokeStyle='#fffae9';ctx.lineWidth=11;ctx.strokeRect(-365,-259,285,227);ctx.beginPath();ctx.moveTo(-221,-259);ctx.lineTo(-221,-32);ctx.moveTo(-365,-145);ctx.lineTo(-80,-145);ctx.stroke();
  ctx.fillStyle='#d6bc91';ctx.fillRect(-387,-26,323,12);ctx.fillStyle='#e1dfd0';ctx.beginPath();ctx.ellipse(0,155,264,58,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#366491';ctx.beginPath();ctx.roundRect(122,120,151,45,20);ctx.fill();ctx.fillStyle='#487da6';ctx.beginPath();ctx.roundRect(140,65,125,67,16);ctx.fill();
  ctx.strokeStyle='#b69756';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(327,178);ctx.lineTo(327,-119);ctx.stroke();ctx.fillStyle='#fff1d3';ctx.beginPath();ctx.moveTo(291,-178);ctx.lineTo(363,-178);ctx.lineTo(386,-112);ctx.lineTo(266,-112);ctx.closePath();ctx.fill();
  ctx.fillStyle='#bba27f';ctx.fillRect(-288,122,8,70);ctx.fillRect(-181,122,8,70);ctx.fillStyle='#d1b185';ctx.beginPath();ctx.ellipse(-233,116,78,22,0,0,Math.PI*2);ctx.fill();
  if(image&&art){const x=p.x*72,y=135+p.z*12-p.y*62,w=(art.dot?78:135)*(close?1.25:1),h=w/source.width*source.height;ctx.fillStyle='#63717830';ctx.beginPath();ctx.ellipse(x,y+7,w*.42,10,0,0,Math.PI*2);ctx.fill();ctx.save();ctx.translate(x,y-p.bob*60);ctx.rotate(p.lean);ctx.imageSmoothingEnabled=false;ctx.drawImage(source,-w/2,-h,w,h);ctx.restore();}
  ctx.restore();
 }
 function draw(p,seconds=0,still=false){if(disposed)return;poses=[p,seconds,still];renderCount++;
  if(webgl){
   const aim=close&&art?new THREE.Vector3(p.x,.75+p.y,p.z):new THREE.Vector3(width<600?p.x*.75:0,1.55,.40),halfH=width<600?3.3:3.32;
   camera.left=-halfH*width/height;camera.right=halfH*width/height;camera.top=halfH;camera.bottom=-halfH;camera.zoom=close?1.55:1;camera.position.copy(aim).add(new THREE.Vector3(.65,4.2,12));camera.lookAt(aim);camera.updateProjectionMatrix();camera.updateMatrixWorld();
   if(figure){figure.position.set(p.x,p.y+p.bob,p.z);figure.rotation.set(0,p.yaw,p.lean);contact.position.set(p.x,p.y+.007,p.z);contact.scale.setScalar(art.dot?.58:1);}
   daylight.animate(seconds,still);renderer.render(scene,camera);
  }else drawFallback(p,still);
 }
 function details(){let bounds=null,frontPixels=null;if(figure&&art?.rectangles){figure.updateMatrixWorld(true);const pixels=figure.userData.frontPixels;frontPixels=pixels?.map(p=>({...p}));const box=new THREE.Box3().setFromObject(figure);const points=[];for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){const p=new THREE.Vector3(x,y,z).project(camera);points.push({x:(p.x*.5+.5)*width,y:(-p.y*.5+.5)*height});}bounds={x:Math.min(...points.map(p=>p.x)),y:Math.min(...points.map(p=>p.y)),width:Math.max(...points.map(p=>p.x))-Math.min(...points.map(p=>p.x)),height:Math.max(...points.map(p=>p.y))-Math.min(...points.map(p=>p.y))};}
  return {engine:webgl?'webgl':'canvas2d',mode,renderCount,modelError,width,height,soulBounds:bounds,frontPixels,contextLost,resources:renderer?{...renderer.info.memory,programs:renderer.info.programs?.length??0}:finalResources,drawCalls:renderer?.info.render.calls||0,triangles:renderer?.info.render.triangles||0};}
 const observer=new ResizeObserver(resize);observer.observe(stage);resize();
 return {canvas,setSoul,clear,draw,resize,setClose(value){close=!!value;},details,dispose(){if(disposed)return;disposed=true;observer.disconnect();canvas.removeEventListener('webglcontextlost',lost);clear();if(scene){scene.traverse(o=>{o.shadow?.map?.depthTexture?.dispose();o.shadow?.dispose();});disposeTree(scene);}renderer?.dispose();renderer?.forceContextLoss();if(renderer){contextLost=renderer.getContext().isContextLost();finalResources={...renderer.info.memory,programs:renderer.info.programs?.length??0};}root.clear();renderer=scene=camera=daylight=contact=null;canvas.remove();canvas.width=canvas.height=1;}};
}
