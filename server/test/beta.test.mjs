import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Wallet } from 'ethers'
import pg from 'pg'
import { randomBytes } from 'node:crypto'
import { openStore } from '../store.mjs'
import { openFirestoreStore } from '../firestore-store.mjs'
import { createBetaServer } from '../app.mjs'
import { mkdtemp, unlink, rmdir } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const origin='http://127.0.0.1:5173'
async function fixture(t,extra={}){
  let now=Date.now(),eligible=true,marketKind='calm',marketStatus='live'
  let databaseUrl=process.env.SOULI_TEST_DATABASE_URL, admin, schema
  if(databaseUrl){
    const url=new URL(databaseUrl)
    if(!url.pathname.startsWith('/souli_test_'))throw Error('Integration tests require a disposable souli_test_ database.')
    admin=new pg.Client({connectionString:databaseUrl});await admin.connect()
    schema=`test_${randomBytes(8).toString('hex')}`
    await admin.query(`CREATE SCHEMA ${schema}`)
    url.searchParams.set('options',`-c search_path=${schema}`);databaseUrl=url.toString()
  }
  let store
  if(process.env.SOULI_TEST_FIRESTORE_HOST){
    if(databaseUrl||!/^127\.0\.0\.1:\d+$/.test(process.env.SOULI_TEST_FIRESTORE_HOST))throw Error('Firestore tests require a loopback emulator, never a cloud project.')
    process.env.FIRESTORE_EMULATOR_HOST=process.env.SOULI_TEST_FIRESTORE_HOST
    store=openFirestoreStore({projectId:'demo-souli-tests',namespace:`test_${randomBytes(8).toString('hex')}`})
  }else store=await openStore({filename:':memory:',databaseUrl})
  await store.init()
  const marketFeed={read:async()=>({asset:'ETH',kind:marketKind,status:marketStatus,change24h:marketKind==='fog'?-5:marketKind==='aurora'?5:0,observedAt:now})}
  const server=createBetaServer({store,origin,readHolder:async()=>({eligible,block:123}),now:()=>now,marketFeed,...extra})
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
  t.after(async()=>{await new Promise(resolve=>server.close(resolve));await store.close();if(admin){await admin.query(`DROP SCHEMA ${schema} CASCADE`);await admin.end()}})
  const url=`http://127.0.0.1:${server.address().port}`
  async function request(path,body,cookie='',headers={}){
    const response=await fetch(url+'/api'+path,{method:body===undefined?'GET':'POST',headers:{Origin:origin,...(body===undefined?{}:{'Content-Type':'application/json'}),Cookie:cookie,...headers},...(body===undefined?{}:{body:JSON.stringify(body)})})
    return {status:response.status,data:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0],headers:response.headers}
  }
  async function login(wallet=Wallet.createRandom()){
    const challenge=await request('/auth/challenge',{address:wallet.address});assert.equal(challenge.status,200)
    const signature=await wallet.signMessage(challenge.data.message)
    const verified=await request('/auth/verify',{id:challenge.data.id,signature},challenge.cookie);assert.equal(verified.status,200)
    return {wallet,cookie:verified.cookie,challenge,signature,headers:verified.headers}
  }
  return {request,login,store,server,marketFeed,now:()=>now,tick:()=>server.tickWorld(),setMarket:(kind,status='live')=>{marketKind=kind;marketStatus=status},advance:ms=>now+=ms,setEligible:value=>eligible=value}
}

test('SIWE signature establishes an HttpOnly session; nonce cannot be replayed; logout revokes it',async t=>{
  const f=await fixture(t),signed=await f.login()
  assert.match(signed.headers.get('set-cookie'),/HttpOnly; SameSite=Strict; Path=\//)
  assert.equal((await f.request('/auth/session',undefined,signed.cookie)).data.address,signed.wallet.address.toLowerCase())
  assert.equal((await f.request('/auth/verify',{id:signed.challenge.data.id,signature:signed.signature})).status,401)
  await f.request('/auth/logout',{},signed.cookie)
  assert.equal((await f.request('/auth/session',undefined,signed.cookie)).status,401)
})
test('reject forged, expired and cross-origin sign-ins; never accept a client-authored message',async t=>{
  const f=await fixture(t),wallet=Wallet.createRandom(),impostor=Wallet.createRandom()
  assert.equal((await f.request('/auth/challenge',{address:wallet.address},'',{Origin:'https://evil.example'})).status,403)
  const first=await f.request('/auth/challenge',{address:wallet.address})
  assert.equal((await f.request('/auth/verify',{id:first.data.id,signature:await impostor.signMessage(first.data.message)},first.cookie)).status,401)
  const second=await f.request('/auth/challenge',{address:wallet.address})
  f.advance(5*60000+1)
  assert.equal((await f.request('/auth/verify',{id:second.data.id,signature:await wallet.signMessage(second.data.message)},second.cookie)).status,401)
  assert.equal((await f.request('/auth/verify',{message:'client message',signature:'0x'})).status,400)
})
test('server ignores submitted resources, time and address; enforces one-time construction and the offline cap',async t=>{
  const f=await fixture(t),a=await f.login()
  assert.equal((await f.request('/world')).status,401)
  await f.request('/world/work',{supplies:999999,memories:999999,address:Wallet.createRandom().address},a.cookie)
  f.advance(60000)
  let response=await f.request('/world',undefined,a.cookie)
  assert.deepEqual([response.data.home.supplies,response.data.home.glowstones,response.data.home.memories],[8,4,3])
  response=await f.request('/world/build',{},a.cookie);assert.equal(response.status,200);assert.equal(response.data.home.supplies,0)
  assert.equal((await f.request('/world/build',{},a.cookie)).status,409)
  f.advance(3*3600000)
  response=await f.request('/world',undefined,a.cookie);assert.equal(response.data.home.days,121)
  assert.equal((await f.request('/world',undefined,a.cookie)).data.home.days,121)
})
test('two verified wallets share a project but keep distinct homes; contribution deductions are atomic',async t=>{
  const f=await fixture(t),a=await f.login(),b=await f.login()
  await f.request('/world/work',{},a.cookie);await f.request('/world',undefined,b.cookie)
  f.advance(60000)
  const contributions=await Promise.all([f.request('/world/contribute',{},a.cookie),f.request('/world/contribute',{},a.cookie)])
  assert.deepEqual(contributions.map(r=>r.status).sort(),[200,409])
  const one=await f.request('/world',undefined,a.cookie),two=await f.request('/world',undefined,b.cookie)
  assert.equal(one.data.project.id,two.data.project.id);assert.equal(two.data.project.supplies,8)
  assert.equal(two.data.project.members,2);assert.equal(two.data.home.memories,0)
  assert.equal(one.data.home.memories,3);assert.equal(one.data.home.supplies,0)
  assert.equal(two.data.project.contribution.supplies,0)
  const anotherDevice=await f.login(a.wallet)
  assert.equal((await f.request('/world',undefined,anotherDevice.cookie)).data.home.memories,3)
})
test('holders are rechecked; allowlist and sessions are enforced; real sales stay disabled',async t=>{
  const wallet=Wallet.createRandom(),f=await fixture(t,{allowlist:[wallet.address]}),a=await f.login(wallet)
  assert.equal((await f.request('/auth/challenge',{address:Wallet.createRandom().address})).status,403)
  f.setEligible(false);assert.equal((await f.request('/world/work',{},a.cookie)).status,403)
  f.setEligible(true);assert.equal((await f.request('/world',undefined,a.cookie)).status,200)
  assert.equal((await f.request('/status')).data.sales,false)
  assert.equal((await f.request('/purchase',{},a.cookie)).status,404)
  f.advance(24*3600000+1);assert.equal((await f.request('/world',undefined,a.cookie)).status,401)
})
test('production refuses insecure origins and an open allowlist',()=>{
  const store={},readHolder=async()=>({eligible:true})
  assert.throws(()=>createBetaServer({store,readHolder,production:true,origin}),/HTTPS/)
  assert.throws(()=>createBetaServer({store,readHolder,production:true,origin:'https://souli.net'}),/ALLOWLIST/)
})
test('sign-in is browser-bound and invalid bodies fail without consuming a valid nonce',async t=>{
  const f=await fixture(t),wallet=Wallet.createRandom()
  for(const input of [null,[],1,'text'])assert.equal((await f.request('/auth/verify',input)).status,400)
  const challenge=await f.request('/auth/challenge',{address:wallet.address})
  const input={id:challenge.data.id,signature:await wallet.signMessage(challenge.data.message)}
  assert.equal((await f.request('/auth/verify',input)).status,401)
  assert.equal((await f.request('/auth/verify',input,'souli_challenge='+'a'.repeat(64))).status,401)
  assert.equal((await f.request('/auth/verify',input,challenge.cookie)).status,200)
  assert.equal((await f.request('/auth/verify',input,challenge.cookie)).status,401)
})
test('health checks distinguish database failure; cross-site reads cannot renew a home',async t=>{
  const f=await fixture(t),a=await f.login()
  assert.equal((await f.request('/health/live')).status,200)
  assert.equal((await f.request('/health/ready')).status,200)
  assert.equal((await f.request('/world',undefined,a.cookie,{'Sec-Fetch-Site':'cross-site'})).status,403)
  const broken=await fixture(t,{store:{transaction:async()=>{throw Error('private database information')}}})
  const ready=await broken.request('/health/ready')
  assert.equal(ready.status,503);assert.doesNotMatch(JSON.stringify(ready.data),/private database/)
  assert.equal((await broken.request('/health/live')).status,200)
})
test('completed shared projects stop charging materials and never exceed their target',async t=>{
  const f=await fixture(t),a=await f.login()
  await f.request('/world/work',{},a.cookie);f.advance(40*60000)
  for(let i=0;i<40;i++)assert.equal((await f.request('/world/contribute',{},a.cookie)).status,200)
  f.advance(60000)
  assert.equal((await f.request('/world/contribute',{},a.cookie)).status,409)
  const {data}=await f.request('/world',undefined,a.cookie)
  assert.deepEqual([data.project.supplies,data.project.glowstones],[320,160])
  assert.deepEqual([data.home.supplies,data.home.glowstones],[8,4])
})
test('SQLite local saves survive closing and reopening the store',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'souli-beta-test-')),filename=join(directory,'test.sqlite')
  let store
  try{
    store=await openStore({filename});await store.init()
    await store.transaction(q=>q('INSERT INTO homes (address,state,village) VALUES ($1,$2,$3)',['test-owner','{"memories":3}','test-village']))
    await store.close();store=await openStore({filename});await store.init()
    const [row]=await store.transaction(q=>q('SELECT * FROM homes WHERE address=$1',['test-owner']))
    assert.equal(JSON.parse(row.state).memories,3)
  }finally{await store?.close();for(const suffix of ['', '-wal','-shm'])await unlink(filename+suffix).catch(e=>{if(e.code!=='ENOENT')throw e});await rmdir(directory)}
})
test('home projects follow the shared sequence, ignore client prices and persist per wallet',async t=>{
  const f=await fixture(t),a=await f.login()
  await f.request('/world/work',{},a.cookie);f.advance(15*60000)
  assert.equal((await f.request('/world/build',{projectId:'gallery',supplies:0},a.cookie)).status,409)
  assert.equal((await f.request('/world/build',{projectId:'__proto__'},a.cookie)).status,400)
  for(const id of ['lantern','bench','gallery'])assert.equal((await f.request('/world/build',{projectId:id,supplies:0,glowstones:0},a.cookie)).status,200)
  assert.equal((await f.request('/world/build',{projectId:'gallery'},a.cookie)).status,409)
  const again=await f.login(a.wallet),response=await f.request('/world',undefined,again.cookie)
  assert.deepEqual([response.data.home.supplies,response.data.home.glowstones,response.data.home.memories],[0,0,45])
  assert.ok(response.data.home.lantern&&response.data.home.bench&&response.data.home.gallery)
  const other=await f.login(),separate=await f.request('/world',undefined,other.cookie)
  assert.equal(separate.data.home.gallery,false)
})

test('automatic homes build and help together without client actions; concurrent polls cannot double credit',async t=>{
  const f=await fixture(t),a=await f.login(),b=await f.login()
  for(const user of [a,b])assert.equal((await f.request('/world/auto',{light:999999},user.cookie)).status,200)
  f.setMarket('fog');await f.tick()
  f.advance(8*60000);await Promise.all([f.tick(),f.request('/market'),f.request('/world',undefined,a.cookie)])
  let one=(await f.request('/world',undefined,a.cookie)).data, two=(await f.request('/world',undefined,b.cookie)).data
  assert.equal(one.defense.id,two.defense.id)
  assert.deepEqual([one.defense.light,one.defense.target,one.defense.yours,one.defense.contributors],[16,16,8,2])
  assert.equal(one.home.memories,24);assert.ok(one.home.lantern&&one.home.bench)
  assert.equal((await f.request('/world/work',{},a.cookie)).status,409)
  f.advance(12*60000);await f.tick()
  one=(await f.request('/world',undefined,a.cookie)).data
  assert.ok(one.home.gallery);assert.equal(one.defense.result,'lit');assert.equal(one.defense.wins,1)
  assert.equal(one.home.journal.filter(e=>e.kind==='defense').length,1)
  const round=one.defense.id
  f.setMarket('aurora');f.advance(30*60000);await f.tick()
  one=(await f.request('/world',undefined,a.cookie)).data
  assert.equal(one.defense.id,round);assert.equal(one.defense.wins,1)
  assert.equal(one.home.journal.filter(e=>e.kind==='defense').length,1)
})
test('offline lease settles once, does not earn forever, and restarts with the saved event',async t=>{
  const f=await fixture(t),a=await f.login()
  await f.request('/world/auto',{},a.cookie);f.setMarket('fog');await f.tick()
  f.advance(3*3600000)
  // A second service instance represents a process restart against the same store.
  const second=createBetaServer({store:f.store,origin,readHolder:async()=>({eligible:true}),now:f.now,marketFeed:f.marketFeed})
  await second.tickWorld()
  let one=(await f.request('/world',undefined,a.cookie)).data
  assert.equal(one.home.days,120);assert.equal(one.defense.result,'lit');assert.equal(one.defense.wins,1)
  assert.equal(one.defense.light,20)
  await second.tickWorld();assert.equal((await f.request('/world',undefined,a.cookie)).data.home.days,120)
  f.advance(60000);one=(await f.request('/world',undefined,a.cookie)).data;assert.equal(one.home.days,121)
  f.advance(6*3600000);f.setMarket('fog','stale');await f.tick()
  const oldRound=one.defense.id
  assert.equal((await f.request('/world',undefined,a.cookie)).data.defense.id,oldRound)
  f.setMarket('aurora');await f.tick()
  one=(await f.request('/world',undefined,a.cookie)).data
  assert.notEqual(one.defense.id,oldRound);assert.equal(one.defense.wins,1);assert.equal(one.defense.light,0)
})
