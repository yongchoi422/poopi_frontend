const fs=require('node:fs/promises'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/yongc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome',args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const report={scenes:[],checks:[],errors:[]};
 try{
  const page=await browser.newPage({viewport:{width:1100,height:820}});
  page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
  await page.goto('http://127.0.0.1:4318/plaza.html');await page.waitForFunction(()=>window.plazaReady,null,{timeout:90000});await page.evaluate(()=>plazaLab.pause());
  const times=await page.evaluate(async()=>{const {makeStory}=await import('./plaza-timeline.mjs'),{encounterTimeAt,SHOT_TRAVEL}=await import('./plaza-beats.mjs'),run=makeStory(),events=run.frames.flatMap(f=>f.events);const shot=events.find(e=>e.source==='guard'&&e.targetId!==undefined&&e.at>30),wash=events.find(e=>e.source==='washer'&&e.kind==='pulse'&&e.at>123);return {hit:6+encounterTimeAt(shot.at)+SHOT_TRAVEL+.025,clean:6+encounterTimeAt(wash.at)+.20};});
  for(const [name,time,capture]of [['hit',times.hit,true],['breach',36.62,true],['flood',37.28,true],['clean',times.clean,true],['rest',73,false]]){
   await page.evaluate(t=>plazaLab.seek(t),time);const stats=await page.evaluate(()=>plazaLab.getStats());
   assert.equal(stats.residents,5);assert.ok(stats.drawCalls<220);assert.ok(stats.crew.every(c=>c.screen.visible));report.scenes.push({name,time,...stats});assert.deepEqual(report.errors,[]);
   if(capture)await page.screenshot({path:__dirname+`/plaza-feel-${name}.png`,fullPage:true,timeout:45000});console.log('PASS',name,stats.drawCalls,'calls',stats.particles,'particles');
  }
  const scene=n=>report.scenes.find(s=>s.name===n);
  assert.ok(scene('hit').hitBursts>0&&scene('hit').hitReactions>0);assert.ok(scene('breach').gateDebris>0&&scene('breach').combat.shake>.05);assert.ok(scene('flood').liquidFront&&scene('flood').floods>0);assert.ok(scene('clean').washSweeps>0);assert.equal(scene('rest').homeClean,100);report.checks.push('Water impact reactions, latch debris, camera impulse, connected flood front, wash sweeps, complete recovery');
  await page.evaluate(()=>plazaLab.seek(37.28));const memoryA=await page.evaluate(()=>plazaLab.getStats().resources);
  const geometry=await page.evaluate(()=>{let vertices=0,finite=true;plazaLab.world.model.root.parent.traverse(o=>{if(o.name==='Liquid_flood_front'){const a=o.geometry.attributes.position.array;vertices=a.length/3;finite=[...a,...o.geometry.attributes.normal.array].every(Number.isFinite);}});return {vertices,finite};});assert.ok(geometry.finite&&geometry.vertices>300);report.checks.push('Moving liquid surface has finite positions and normals');
  await page.click('#still');let s=await page.evaluate(()=>plazaLab.getStats());assert.equal(s.particles,0);assert.equal(s.combat.shake,0);assert.equal(s.liquidFront,false);await page.click('#still');report.checks.push('Still suppresses particles, surface wave and camera shake');
  await page.click('#sound');assert.ok(await page.evaluate(()=>plazaLab.getStats().audio));await page.evaluate(()=>{plazaLab.seek(36.51);});await page.click('#sound');assert.equal(await page.evaluate(()=>plazaLab.getStats().audio),false);report.checks.push('Layered audio schedules after user gesture');
  await page.evaluate(()=>{plazaLab.restart('coral');plazaLab.seek(37.28);});s=await page.evaluate(()=>plazaLab.getStats());assert.ok(s.liquidFront&&s.floods>0&&s.weather==='coral');report.checks.push('Coral uses its own real breach with the same presentation pace');
  await page.evaluate(()=>{plazaLab.restart('violet');plazaLab.seek(37.28);});const memoryB=await page.evaluate(()=>plazaLab.getStats().resources);assert.deepEqual(memoryA,memoryB);report.checks.push('Replay and color changes do not accumulate GPU geometry or textures');
  assert.deepEqual(report.errors,[]);report.resources=memoryB;report.geometry=geometry;report.checkedAt=new Date().toISOString();report.environment='Chrome headless ANGLE/SwiftShader; does not certify physical device FPS or listening quality.';
  await fs.writeFile(__dirname+'/plaza-feel-verification.json',JSON.stringify(report,null,2));console.log('PASS',report.checks.length,'combat presentation checks');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
