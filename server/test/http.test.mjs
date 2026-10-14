import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, mkdir, unlink, rmdir } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createBetaServer } from '../app.mjs'
import { openStore } from '../store.mjs'
test('production serves static HEAD/assets with security headers and prevents escaping the web root',async t=>{
  const dist=await mkdtemp(join(tmpdir(),'souli-http-'))
  await mkdir(join(dist,'assets'));await writeFile(join(dist,'index.html'),'<h1>SOULI</h1>');await writeFile(join(dist,'assets','app-abc123.js'),'console.log(1)')
  const store=await openStore({filename:':memory:'});await store.init()
  const server=createBetaServer({store,dist,production:true,origin:'https://souli.net',allowlist:['0x1111111111111111111111111111111111111111'],readHolder:async()=>({eligible:true})})
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
  t.after(async()=>{await new Promise(resolve=>server.close(resolve));await store.close();await unlink(join(dist,'index.html'));await unlink(join(dist,'assets','app-abc123.js'));await rmdir(join(dist,'assets'));await rmdir(dist)})
  const base=`http://127.0.0.1:${server.address().port}`
  const head=await fetch(base,{method:'HEAD'})
  assert.equal(head.status,200);assert.equal(await head.text(),'')
  assert.match(head.headers.get('content-security-policy'),/frame-ancestors 'none'/)
  assert.match(head.headers.get('strict-transport-security'),/max-age=/)
  const asset=await fetch(base+'/assets/app-abc123.js');assert.match(asset.headers.get('cache-control'),/immutable/)
  for(const path of ['/%2e%2e%2fserver%2fapp.mjs','/.env','/legacy.html'])assert.equal((await fetch(base+path)).status,404)
  assert.equal((await fetch(base+'/%ZZ')).status,400)
  const challenge=await fetch(base+'/api/auth/challenge',{method:'POST',headers:{Origin:'https://souli.net','Content-Type':'application/json'},body:JSON.stringify({address:'0x1111111111111111111111111111111111111111'})})
  assert.match(challenge.headers.get('set-cookie'),/__Host-souli_challenge=.*; Secure/)
  assert.equal(challenge.headers.get('access-control-allow-origin'),'https://souli.net')
  assert.equal(challenge.headers.get('access-control-allow-credentials'),'true')
  assert.match(challenge.headers.get('vary'),/Origin/)
  assert.ok(!challenge.headers.get('set-cookie').includes('Domain='),'Host-only session scope')
  const preflight=await fetch(base+'/api/auth/challenge',{method:'OPTIONS',headers:{Origin:'https://souli.net','Sec-Fetch-Site':'same-site','Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type'}})
  assert.equal(preflight.status,204)
  assert.equal(preflight.headers.get('access-control-allow-origin'),'https://souli.net')
  assert.equal(preflight.headers.get('access-control-allow-methods'),'GET, POST')
  for(const headers of [
    {Origin:'https://attacker.invalid','Access-Control-Request-Method':'POST'},
    {Origin:'https://other.souli.net','Access-Control-Request-Method':'POST'},
    {Origin:'https://souli.net','Access-Control-Request-Method':'DELETE'},
    {Origin:'https://souli.net','Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'x-admin'},
    {Origin:'https://souli.net','Access-Control-Request-Method':'POST','Sec-Fetch-Site':'cross-site'},
  ])assert.equal((await fetch(base+'/api/auth/challenge',{method:'OPTIONS',headers})).status,403)
  const denied=await fetch(base+'/api/status',{headers:{Origin:'https://other.souli.net'}})
  assert.equal(denied.status,403);assert.equal(denied.headers.get('access-control-allow-origin'),null)
})
