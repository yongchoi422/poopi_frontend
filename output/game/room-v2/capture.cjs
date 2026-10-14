const {chromium}=require('C:/Users/yongc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome',args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1328,height:1080},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.goto('http://127.0.0.1:4318');await page.waitForFunction(()=>window.roomReady,{timeout:30000});
 await page.locator('.product').screenshot({path:path.join(__dirname,'room-v2-first-render.png')});
 console.log(JSON.stringify({errors,info:await page.evaluate(()=>({meshes:window.roomLab.renderer.info.render.calls,triangles:window.roomLab.renderer.info.render.triangles,soul:document.querySelector('.soul').getBoundingClientRect().toJSON()}))}));
 await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1});
