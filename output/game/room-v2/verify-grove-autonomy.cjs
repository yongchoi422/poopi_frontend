const fs=require('node:fs');
const assert=require('node:assert/strict');
const {chromium}=require('C:/Users/yongc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome',args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const context=await browser.newContext({viewport:{width:1420,height:1060},deviceScaleFactor:1});
  const page=await context.newPage(),errors=[];
  const captureErrors=p=>{p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});};
  captureErrors(page);
  const root='http://127.0.0.1:4318/grove.html';
  await page.goto(root);await page.waitForFunction(()=>window.groveReady);
  assert.equal(await page.evaluate(()=>groveLab.getState().autoplay),true);
  assert.equal(await page.locator('#manual-controls').isVisible(),false);
  assert.equal(await page.locator('.slot-marker:visible').count(),0);
  await page.screenshot({path:__dirname+'/grove-autonomous.png',fullPage:true});
  // Two open views may reach the same deadline; neither should freeze or
  // produce a second encounter when their automatic saves race.
  const other=await context.newPage();captureErrors(other);
  await other.goto(root);await other.waitForFunction(()=>window.groveReady);
  await page.waitForFunction(()=>groveLab.getState().phase==='arrange'&&Object.keys(groveLab.getState().layout).length===1,null,{timeout:25000});
  const preparing=await page.evaluate(()=>groveLab.getState());
  await page.screenshot({path:__dirname+'/grove-autonomous-preparing.png',fullPage:true});
  await page.reload();await page.waitForFunction(()=>window.groveReady);
  assert.equal(await page.evaluate(()=>groveLab.getState().phaseAt),preparing.phaseAt);
  await page.waitForFunction(()=>groveLab.getState().phase==='defend',null,{timeout:15000});
  await other.waitForFunction(()=>groveLab.getState().phase==='defend',null,{timeout:15000});
  const fog=await page.evaluate(()=>groveLab.getState().round);
  assert.deepEqual(fog.layout,{1:'fence',3:'chime',4:'lantern'});
  assert.deepEqual(await other.evaluate(()=>groveLab.getState().round),fog);
  assert.equal(await page.locator('#save-error').isVisible(),false);
  assert.equal(await other.locator('#save-error').isVisible(),false);
  await other.close();
  console.log('Automatic discovery, gradual placement, reload and two-tab encounter start passed.');
  await page.waitForFunction(()=>groveLab.getState().phase==='home',null,{timeout:42000});
  const home=await page.evaluate(()=>groveLab.getState());
  assert.equal(home.memories.length,2);assert.equal(home.memories[0].result.light,100);assert.ok(home.memories[0].result.turf.soul>home.memories[0].result.turf.wild);
  await page.screenshot({path:__dirname+'/grove-autonomous-rest.png',fullPage:true});
  console.log('The whole first encounter finished and the soul returned home without a game click.');
  await page.waitForFunction(()=>groveLab.getState().phase==='defend'&&groveLab.getState().roundNumber===2,null,{timeout:52000});
  const aurora=await page.evaluate(()=>groveLab.getState().round);
  assert.equal(aurora.weather,'aurora');assert.deepEqual(aurora.layout,{0:'chime',1:'fence',2:'bowl'});
  // An explicit takeover only stops future automatic encounters.
  await page.click('#autoplay-toggle');await page.waitForFunction(()=>groveLab.getState().autoplay===false);
  assert.deepEqual(await page.evaluate(()=>groveLab.getState().round),aurora);
  await page.reload();await page.waitForFunction(()=>window.groveReady);
  assert.equal(await page.evaluate(()=>groveLab.getState().autoplay),false);
  await page.click('#primary-action');await page.waitForFunction(()=>groveLab.getState().phase==='home',null,{timeout:12000});
  assert.equal(await page.evaluate(()=>groveLab.getState().memories.length),3);
  await page.click('#autoplay-toggle');await page.waitForFunction(()=>groveLab.getState().autoplay===true);
  const sizes=[];
  for(const width of [390,320]){
   await page.setViewportSize({width,height:900});
   await page.waitForFunction(()=>document.documentElement.scrollWidth<=innerWidth+1);
   const control=await page.locator('#autoplay-toggle').boundingBox();
   assert.ok(control.height>=44&&control.x>=0&&control.x+control.width<=width);
   assert.equal(await page.locator('#manual-controls').isVisible(),false);
   await page.screenshot({path:__dirname+`/grove-autonomous-mobile-${width}.png`,fullPage:true});
   sizes.push({width,overflow:false,toggleHeight:control.height});
  }
  assert.deepEqual(errors,[]);
  const result={errors,defaultAutomatic:true,noGameClickUntilSecondEncounter:true,gradualPlacement:true,reloadDuringPreparation:true,twoTabTransitions:true,automaticRestAndRepeat:true,weatherAdaptiveTools:true,manualTakeoverPreservesRound:true,modePersists:true,sizes,performanceNote:'Headless software WebGL, not a real-device performance measurement.'};
  fs.writeFileSync(__dirname+'/grove-autonomy-verification.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
