const fs=require('node:fs');
const assert=require('node:assert/strict');
const {chromium}=require('C:/Users/yongc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome',args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:1420,height:1060},deviceScaleFactor:1});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 const root='http://127.0.0.1:4318/grove.html';
 await page.goto(root);await page.waitForFunction(()=>window.groveReady);
 await page.waitForFunction(()=>groveLab.getState().phase==='arrange',null,{timeout:25000});
 await page.click('#autoplay-toggle');await page.waitForFunction(()=>groveLab.getState().autoplay===false);
 for(const [tool,slot] of [['lantern',0],['chime',3],['fence',4]]){
   await page.click(`[data-tool="${tool}"]`);await page.click(`[data-slot="${slot}"]`);
   await page.waitForFunction(({slot,tool})=>groveLab.getState().layout[slot]===tool,{slot,tool});
 }
 assert.equal(await page.locator('.slot-marker:visible').count(),6);
 await page.screenshot({path:__dirname+'/grove-fog.png',fullPage:true});
 await page.click('#primary-action');await page.waitForFunction(()=>groveLab.getState().phase==='defend');
 assert.equal(await page.locator('[data-weather="aurora"]').isDisabled(),true);
 await page.waitForFunction(()=>groveLab.getStats().drawCalls>0);
 const roundBefore=await page.evaluate(()=>groveLab.getState().round);
 await page.reload();await page.waitForFunction(()=>window.groveReady);
 assert.deepEqual(await page.evaluate(()=>groveLab.getState().round),roundBefore);
 await page.screenshot({path:__dirname+'/grove-defense.png',fullPage:true});
 await page.click('#primary-action');await page.waitForFunction(()=>groveLab.getState().phase==='home',null,{timeout:12000});
 const first=await page.evaluate(()=>groveLab.getState());assert.equal(first.memories.length,2);assert.equal(first.memories[0].result.light,73);assert.ok(first.memories[0].result.turf.soul>0);
 await page.click('[data-weather="aurora"]');
 for(const [tool,slot] of [['bowl',3],['chime',0],['fence',1],['bowl',2]]){
   await page.click(`[data-tool="${tool}"]`);await page.click(`[data-slot="${slot}"]`);
   await page.waitForFunction(({slot,tool})=>groveLab.getState().layout[slot]===tool,{slot,tool});
 }
 assert.deepEqual(await page.evaluate(()=>groveLab.getState().layout),{0:'chime',1:'fence',2:'bowl'});
 await page.screenshot({path:__dirname+'/grove-aurora.png',fullPage:true});
 await page.click('#primary-action');await page.waitForFunction(()=>groveLab.getState().phase==='defend');
 await page.click('#primary-action');await page.waitForFunction(()=>groveLab.getState().phase==='home',null,{timeout:12000});
 const second=await page.evaluate(()=>groveLab.getState());assert.equal(second.memories.length,3);assert.equal(second.memories[0].result.light,94);assert.ok(second.memories[0].result.turf.soul>second.memories[0].result.turf.wild);
 await page.reload();await page.waitForFunction(()=>window.groveReady);
 assert.deepEqual((await page.evaluate(()=>groveLab.getState())).memories,second.memories);
 await page.click('#memories-open');assert.equal(await page.locator('#memory-list li').count(),3);await page.click('#memories-close');
 // All source samples, including tiny dot, remain usable in the same world.
 for(let index=0;index<7;index++){
   await page.selectOption('#soul-select',String(index));await page.waitForFunction(i=>groveLab.getState().soulIndex===i,index);
 }
 await page.click('#focus-soul');await page.screenshot({path:__dirname+'/grove-dot.png',fullPage:true});await page.click('#focus-soul');
 await page.selectOption('#soul-select','0');
 const sizes=[];
 for(const width of [390,320]){
   await page.setViewportSize({width,height:900});
   await page.waitForFunction(()=>document.documentElement.scrollWidth<=innerWidth+1);
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);assert.equal(overflow,false);
   const rects=await page.locator('.view-actions button').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {left:r.left,right:r.right};}));
   assert.ok(rects.every(r=>r.left>=0&&r.right<=width));sizes.push({width,overflow});
   await page.screenshot({path:__dirname+`/grove-mobile-${width}.png`,fullPage:true});
 }
 // CAS rejects a stale writer; its attempted data does not overwrite the latest save.
 const concurrency=await page.evaluate(async()=>{
   const {openGroveStore}=await import('./grove-store.mjs');const a=await openGroveStore(),b=await openGroveStore();
   const revision=a.state.revision;await a.update(s=>({...s,soulIndex:1}),revision);
   let rejected=false;try{await b.update(s=>({...s,soulIndex:2}),revision);}catch{rejected=true;}
   const latest=await a.read();a.close();b.close();return {rejected,soulIndex:latest.soulIndex};
 });assert.deepEqual(concurrency,{rejected:true,soulIndex:1});
 const stats=await page.evaluate(()=>groveLab.getStats());assert.equal(errors.length,0,errors.join('\n'));
 const result={errors,manualTakeover:true,discoverySaved:true,reloadDuringDefense:true,idempotentMemories:true,weatherFrozenDuringRound:true,fogLight:first.memories[0].result.light,auroraLight:second.memories[0].result.light,originalSamples:7,sizes,concurrency,renderer:{drawCalls:stats.drawCalls,triangles:stats.triangles},performanceNote:'Headless software WebGL. No real-device FPS claim.'};
 fs.writeFileSync(__dirname+'/grove-verification.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
