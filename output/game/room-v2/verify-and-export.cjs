const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {chromium}=require('C:/Users/yongc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome',args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1328,height:1080},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.goto('http://127.0.0.1:4318/room.html');await page.waitForFunction(()=>window.roomReady);
 await page.evaluate(()=>window.roomLab.setAppearance({mode:'flat'}));
 await page.locator('.product').screenshot({path:path.join(__dirname,'room-v2-day.png')});
 const originalChecks=await page.evaluate(()=>window.roomLab.souls.map(s=>{
   const original=new DOMParser().parseFromString(s.svg,'image/svg+xml');const rendered=new DOMParser().parseFromString(s.markup,'image/svg+xml');
   const src=[...original.documentElement.children];const skip=+src[1].getAttribute('height')===7?2:4;
   const attributes=el=>['x','y','width','height','fill'].map(k=>el.getAttribute(k));
   return {name:s.name,exact:JSON.stringify(src.slice(skip).map(attributes))===JSON.stringify([...rendered.documentElement.children].map(attributes)),rects:rendered.documentElement.children.length};
 }));
 assert.ok(originalChecks.every(c=>c.exact),'Native soul foreground must remain identical');
 await page.selectOption('#soul-select','1');
 await page.locator('.product').screenshot({path:path.join(__dirname,'room-v2-dark-soul.png')});
 await page.selectOption('#soul-select','6');assert.equal(await page.locator('.soul rect').count(),3);
 await page.locator('.product').screenshot({path:path.join(__dirname,'room-v2-dot.png')});
 await page.selectOption('#soul-select','0');await page.click('#light-toggle');
 assert.equal(await page.locator('#light-toggle').getAttribute('aria-pressed'),'true');
 await page.locator('.product').screenshot({path:path.join(__dirname,'room-v2-evening.png')});
 await page.click('#light-toggle');await page.click('#model-view');
 assert.equal(await page.locator('.soul').evaluate(el=>el.hidden),true);
 await page.locator('.stage').screenshot({path:path.join(__dirname,'room-v2-model.png')});
 await page.click('#game-view');
 const output=await page.evaluate(async()=>{
   const bytes=await window.roomLab.exportRoom();const validation=await window.roomLab.validateGLB(bytes);
   const base64=await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.readAsDataURL(new Blob([bytes]))});
   return {base64,validation};
 });
 const bytes=Buffer.from(output.base64,'base64');assert.equal(bytes.toString('ascii',0,4),'glTF');assert.equal(bytes.readUInt32LE(4),2);assert.equal(bytes.readUInt32LE(8),bytes.length);
 assert.ok(output.validation.meshes>100);assert.ok(output.validation.bounds.every(Number.isFinite));
 for(const name of ['Coffee_Table','Armchair','Coffee_Machine','Curtains','Potted_Plant','Soul_on_table','Game_Camera'])assert.ok(output.validation.names.includes(name),`Missing ${name}`);
 fs.writeFileSync(path.join(__dirname,'souli-walnut-room-v2.glb'),bytes);
 const plate=await page.evaluate(()=>{window.roomLab.setCharacterVisible(false);const data=window.roomLab.renderer.domElement.toDataURL('image/png');window.roomLab.setCharacterVisible(true);return data.split(',')[1]});
 fs.writeFileSync(path.join(__dirname,'room-v2-background.png'),Buffer.from(plate,'base64'));
 const mobile=[];
 for(const width of [390,320]){
   await page.setViewportSize({width,height:950});
   await page.locator('.stage').evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   const metrics=await page.evaluate(()=>{const s=document.querySelector('.soul').getBoundingClientRect(),r=document.querySelector('.stage').getBoundingClientRect();return {width:innerWidth,scroll:document.documentElement.scrollWidth,soulInside:s.left>=r.left&&s.right<=r.right&&s.top>=r.top&&s.bottom<=r.bottom}});
   assert.ok(metrics.scroll<=metrics.width);assert.ok(metrics.soulInside);mobile.push(metrics);
   if(width===390)await page.locator('.product').screenshot({path:path.join(__dirname,'room-v2-mobile.png')});
 }
 assert.deepEqual(errors,[]);
 const result={status:'passed',originalChecks,mobile,glb:{bytes:bytes.length,meshes:output.validation.meshes,triangles:output.validation.triangles,boundsMeters:output.validation.bounds},errors};
 fs.writeFileSync(path.join(__dirname,'verification.json'),JSON.stringify(result,null,2));
 console.log(JSON.stringify(result,null,2));await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1});
