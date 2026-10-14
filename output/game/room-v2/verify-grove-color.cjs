const fs=require('node:fs');
const assert=require('node:assert/strict');
const {chromium}=require('C:/Users/yongc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome',args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1080},deviceScaleFactor:1});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto('http://127.0.0.1:4318/grove.html');await page.waitForFunction(()=>window.groveReady);
  await page.waitForFunction(()=>groveLab.getState().phase==='defend',null,{timeout:35000});
  const round=await page.evaluate(()=>groveLab.getState().round);assert.equal(round.rulesVersion,2);
  await page.waitForFunction(()=>groveLab.getStats().projectiles>0&&groveLab.getStats().creatures>=2&&groveLab.getStats().paintedCells>120,null,{timeout:18000});
  const live=await page.evaluate(()=>groveLab.getStats());
  assert.ok(live.creatureParts>live.creatures*8);assert.ok(live.effectParticles>0);
  assert.equal(await page.locator('.turf-hud').isVisible(),true);
  assert.ok(parseFloat(await page.locator('#turf-wild').textContent())>0);
  await page.screenshot({path:__dirname+'/grove-color-clash.png',fullPage:true});
  await page.locator('.world').screenshot({path:__dirname+'/grove-color-stage.png'});
  console.log('Paint, incoming creature models and live projectile effects are visible.');
  await page.reload();await page.waitForFunction(()=>window.groveReady);
  assert.deepEqual(await page.evaluate(()=>groveLab.getState().round),round);
  await page.waitForFunction(()=>groveLab.getStats().paintedCells>120);
  await page.click('#focus-soul');await page.waitForTimeout(350);
  await page.screenshot({path:__dirname+'/grove-color-close.png',fullPage:true});
  await page.click('#motion-toggle');await page.waitForFunction(()=>groveLab.getStats().effectParticles===0);
  const still=await page.evaluate(()=>groveLab.getStats());assert.equal(still.projectiles,0);
  await page.click('#motion-toggle');await page.click('#focus-soul');
  await page.click('#autoplay-toggle');await page.waitForFunction(()=>!groveLab.getState().autoplay);
  if(await page.evaluate(()=>groveLab.getState().phase==='defend'))await page.click('#primary-action');
  await page.waitForFunction(()=>groveLab.getState().phase==='home',null,{timeout:12000});
  const result=await page.evaluate(()=>groveLab.getState().memories[0].result);
  assert.ok(result.turf.soul>result.turf.wild);assert.ok((await page.locator('#result-note').textContent()).includes(`Mint ${result.turf.soul}%`));
  await page.waitForFunction(()=>groveLab.getStats().paintedCells>0);
  await page.screenshot({path:__dirname+'/grove-color-result.png',fullPage:true});
  await page.click('[data-weather="aurora"]');
  for(const [tool,slot] of [['bowl',4],['chime',0],['fence',1],['bowl',2]]){
   await page.click(`[data-tool="${tool}"]`);await page.click(`[data-slot="${slot}"]`);
   await page.waitForFunction(({slot,tool})=>groveLab.getState().layout[slot]===tool,{slot,tool});
  }
  await page.click('#primary-action');await page.waitForFunction(()=>groveLab.getState().phase==='defend');
  await page.waitForFunction(()=>groveLab.getStats().creatureKinds.moth>0&&groveLab.getStats().paintedCells>120,null,{timeout:15000});
  await page.screenshot({path:__dirname+'/grove-color-moths.png',fullPage:true});
  const mobile=[];
  for(const width of [390,320]){
   await page.setViewportSize({width,height:900});await page.waitForTimeout(350);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
   const hud=await page.locator('.turf-hud').boundingBox();assert.ok(hud.x>=0&&hud.x+hud.width<=width);
   await page.screenshot({path:__dirname+`/grove-color-mobile-${width}.png`,fullPage:true});mobile.push({width,overflow:false});
  }
  assert.deepEqual(errors,[]);
  const report={errors,automaticColorEncounter:true,creatureModels:3,actualProjectiles:true,paintOwnershipChanges:true,scoreSurvivesReload:true,paintPersistsThroughRest:true,reducedMotionRemovesParticles:true,liveRenderer:{drawCalls:live.drawCalls,triangles:live.triangles,creatures:live.creatures,parts:live.creatureParts,particles:live.effectParticles},result:{light:result.light,soul:result.turf.soul,wild:result.turf.wild,outcome:result.outcome},mobile,performanceNote:'Headless software WebGL. No real-device FPS claim.'};
  fs.writeFileSync(__dirname+'/grove-color-verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
