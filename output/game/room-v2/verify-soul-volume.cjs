const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {chromium}=require('C:/Users/yongc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome',args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1328,height:1300},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.goto('http://127.0.0.1:4318/room.html');await page.waitForFunction(()=>window.roomReady);
 assert.equal(await page.locator('#volume-mode').getAttribute('aria-pressed'),'true');
 await page.locator('main').screenshot({path:path.join(__dirname,'soul-volume-room.png')});
 await page.click('#close-view');
 await page.locator('.product').screenshot({path:path.join(__dirname,'soul-volume-close.png')});
 await page.click('#flat-mode');
 assert.equal(await page.locator('.soul').evaluate(el=>el.hidden),false);
 assert.equal(await page.evaluate(()=>roomLab.getFigure().visible),false);
 assert.equal(await page.locator('#soul-depth').isDisabled(),true);
 await page.locator('.product').screenshot({path:path.join(__dirname,'soul-flat-close.png')});
 await page.click('#volume-mode');
 await page.locator('#soul-depth').fill('6');await page.locator('#soul-depth').dispatchEvent('input');
 await page.locator('#soul-roundness').fill('24');await page.locator('#soul-roundness').dispatchEvent('input');
 await page.locator('#soul-angle').fill('55');await page.locator('#soul-angle').dispatchEvent('input');
 const configured=await page.evaluate(()=>roomLab.getAppearance());assert.equal(configured.depth,6);assert.equal(configured.roundness,.24);assert.equal(configured.angle,55);
 await page.locator('.product').screenshot({path:path.join(__dirname,'soul-volume-side.png')});
 await page.locator('#soul-angle').fill('180');await page.locator('#soul-angle').dispatchEvent('input');
 await page.locator('.product').screenshot({path:path.join(__dirname,'soul-volume-back.png')});
 await page.click('#front-view');assert.equal(await page.locator('#soul-angle').inputValue(),'0');
 const checks=await page.evaluate(async()=>{
   const THREE=await import('three');
   const {visiblePixels,pixelComponents,componentContours,createSoulVolume,disposeSoulVolume}=await import('./soul-volume.mjs');
   // A hole must remain empty, and a diagonal contact must stay disconnected.
   const ring=visiblePixels([{x:0,y:0,width:3,height:1,fill:'#fff'},{x:0,y:2,width:3,height:1,fill:'#fff'},{x:0,y:1,width:1,height:1,fill:'#fff'},{x:2,y:1,width:1,height:1,fill:'#fff'}]);
   const loops=componentContours([...ring.values()]);
   const diagonal=pixelComponents(visiblePixels([{x:0,y:0,width:1,height:1,fill:'#fff'},{x:1,y:1,width:1,height:1,fill:'#fff'}]));
   const samples=[];
   for(const soul of roomLab.souls){
     const original=visiblePixels(soul.rectangles),figure=createSoulVolume(soul,{depth:4,roundness:.14,worldWidth:soul.dot?.78:1.75});
     const data=figure.userData,face=figure.getObjectByName('Original_pixel_front'),color=face.geometry.attributes.color;
     const pixelsExact=data.frontPixels.every((p,i)=>{const c=new THREE.Color().setRGB(color.getX(i*6),color.getY(i*6),color.getZ(i*6));return original.get(`${p.x},${p.y}`).color.toLowerCase()==='#'+c.getHexString()});
     const areaExact=data.componentMetadata.every(c=>c.outlineArea===c.pixels);
     let finite=true;figure.traverse(o=>{if(o.isMesh){const p=o.geometry.attributes.position;for(let i=0;i<p.array.length;i++)if(!Number.isFinite(p.array[i]))finite=false}});
     samples.push({name:soul.name,pixels:original.size,frontPixels:data.frontPixels.length,pixelsExact,areaExact,finite,components:data.componentMetadata.length});disposeSoulVolume(figure);
   }
   return {ring:{loops:loops.length,holes:loops.filter(l=>l.area<0).length,area:loops.reduce((s,l)=>s+l.area,0)},diagonalComponents:diagonal.length,samples};
 });
 assert.deepEqual(checks.ring,{loops:2,holes:1,area:8});assert.equal(checks.diagonalComponents,2);
 assert.ok(checks.samples.every(s=>s.pixels===s.frontPixels&&s.pixelsExact&&s.areaExact&&s.finite));
 await page.evaluate(()=>{roomLab.setAppearance({mode:'volume',depth:4,roundness:.14,angle:-24});roomLab.setClose(false)});
 for(const [i,name] of [[1,'dark'],[6,'dot']]){await page.selectOption('#soul-select',String(i));await page.locator('.product').screenshot({path:path.join(__dirname,`soul-volume-${name}.png`)})}
 await page.selectOption('#soul-select','0');await page.click('#light-toggle');
 await page.locator('.product').screenshot({path:path.join(__dirname,'soul-volume-evening.png')});await page.click('#light-toggle');
 await page.click('#model-view');assert.equal(await page.evaluate(()=>roomLab.getFigure().visible),true);await page.click('#game-view');
 const exported=await page.evaluate(async()=>{
   const bytes=await roomLab.exportSoul(),validation=await roomLab.validateGLB(bytes);
   const base64=await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.readAsDataURL(new Blob([bytes]))});return {base64,validation};
 });
 const bytes=Buffer.from(exported.base64,'base64');assert.equal(bytes.toString('ascii',0,4),'glTF');assert.equal(bytes.length,bytes.readUInt32LE(8));assert.ok(exported.validation.names.includes('Continuous_pixel_body'));assert.ok(exported.validation.names.includes('Original_pixel_front'));assert.ok(exported.validation.bounds.every(v=>Number.isFinite(v)&&v>0));
 fs.writeFileSync(path.join(__dirname,'souli-pixel-figure.glb'),bytes);
 const mobile=[];
 for(const width of [390,320]){
   await page.setViewportSize({width,height:1500});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   const metric=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,controls:[...document.querySelectorAll('.shape-controls input')].every(e=>{const b=e.getBoundingClientRect();return b.left>=0&&b.right<=innerWidth})}));
   assert.ok(metric.scroll<=metric.width&&metric.controls);mobile.push(metric);
   if(width===390)await page.locator('main').screenshot({path:path.join(__dirname,'soul-volume-mobile.png')});
 }
 // Appearance survives reload without touching original artwork or ownership data.
 await page.reload();await page.waitForFunction(()=>window.roomReady);assert.equal(await page.evaluate(()=>roomLab.getAppearance().depth),4);
 assert.deepEqual(errors,[]);
 const result={status:'passed',checks,configured,mobile,export:{bytes:bytes.length,meshes:exported.validation.meshes,triangles:exported.validation.triangles,bounds:exported.validation.bounds},errors};
 fs.writeFileSync(path.join(__dirname,'soul-volume-verification.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1});
