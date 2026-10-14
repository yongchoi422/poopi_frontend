import { test } from 'node:test'
import assert from 'node:assert/strict'
import { openStore } from '../store.mjs'
import { repository } from '../repository.mjs'
import { createWorldWeather, CHECKPOINT_MS } from '../world-weather.mjs'
import { createSanctuary, enableAutomation } from '../../src/lighthouse/sanctuary.mjs'
import { storeConfig } from '../store-config.mjs'

async function fixture(t){
  const sql=await openStore({filename:':memory:'});await sql.init();t.after(()=>sql.close())
  const statements=[]
  const store={transaction:fn=>sql.transaction(q=>fn((statement,args)=>{statements.push(statement);return q(statement,args)}))}
  let time=1_800_000_000_000,reads=0,kind='fog'
  const feed={read:async()=>{reads++;return {asset:'ETH',status:'live',kind,change24h:kind==='fog'?-5:5,observedAt:time}}}
  const weather=()=>createWorldWeather({store,feed,now:()=>time})
  return {sql,store,db:repository(store),statements,weather,advance:ms=>time+=ms,now:()=>time,reads:()=>reads,setKind:value=>kind=value}
}
test('market requests share a persistent cache across instances; they never sweep game saves',async t=>{
  const f=await fixture(t),one=f.weather(),two=f.weather()
  await Promise.all([one.refresh(),two.refresh()]);assert.equal(f.reads(),1)
  await two.refresh();f.advance(CHECKPOINT_MS-1);await f.weather().refresh();assert.equal(f.reads(),1)
  assert.ok(f.statements.every(sql=>!/(homes|villages|village_roster|home_watch)/.test(sql)))
  f.advance(2);await f.weather().refresh();assert.equal(f.reads(),2)
})
test('a crashed quote refresh releases its lease, and stale data cannot start a crisis',async t=>{
  const f=await fixture(t)
  await f.db.run(tx=>tx.put('weather_state',{id:'eth',state:JSON.stringify({leaseOwner:'crashed',leaseUntil:f.now()+15000})}))
  assert.equal((await f.weather().refresh()).market.status,'unavailable');assert.equal(f.reads(),0)
  f.advance(15001);await f.weather().refresh();assert.equal(f.reads(),1)
  f.advance(6*3600000)
  const offline=createWorldWeather({store:f.store,now:f.now,feed:{read:async()=>({asset:'ETH',kind:'aurora',status:'live',observedAt:f.now()-3600000,change24h:5})}})
  const old=await offline.refresh();assert.equal(old.market.status,'stale');assert.equal(old.event.kind,'fog')
})
test('unattended town catches its eligible observed round months later without writing other homes or duplicating stories',async t=>{
  const f=await fixture(t),weather=f.weather(),start=f.now()
  const village={id:'town_a',members:2,supplies:0,glowstones:0}
  const home=createSanctuary(start);enableAutomation(home,start)
  await f.db.run(async tx=>{
    await tx.put('villages',village)
    for(const address of ['alice','bob']){
      await tx.put('homes',{address,village:village.id,state:JSON.stringify(home)})
      await tx.put('home_watch',{address,since_at:start,until_at:start+2*3600000})
    }
    await tx.put('village_roster',{id:village.id,state:JSON.stringify({settledAt:start,members:{alice:{from:start,until:start+2*3600000},bob:{from:start,until:start+2*3600000}}})})
  })
  f.advance(60000);await weather.refresh()
  // Other towns observe later rounds. Neither resident of this town returns.
  for(let i=0;i<10;i++){f.advance(6*3600000);await f.weather().refresh()}
  f.advance(90*24*3600000);await f.weather().refresh()
  const before=await f.db.run(tx=>tx.get('homes','bob'));f.statements.length=0
  async function visit(address){return f.db.run(async tx=>{
    const town=await weather.town(tx,village)
    const own=JSON.parse((await tx.get('homes',address)).state)
    const result=await weather.saveTown(tx,village.id,address,own,town)
    await tx.put('homes',{address,village:village.id,state:JSON.stringify(own)})
    return {own,result}
  })}
  const first=await visit('alice')
  assert.equal(first.result.defense.wins,1)
  assert.equal(first.own.journal.filter(e=>e.kind==='defense').length,1)
  assert.ok(!f.statements.some(sql=>/FROM villages$/.test(sql)))
  assert.deepEqual(await f.db.run(tx=>tx.get('homes','bob')),before)
  assert.equal((await visit('bob')).own.journal.filter(e=>e.kind==='defense').length,1)
  assert.equal((await visit('alice')).own.journal.filter(e=>e.kind==='defense').length,1)
})
test('production storage is explicit and never falls back to disposable files or the emulator',()=>{
  assert.throws(()=>storeConfig({NODE_ENV:'production'}),/Production requires/)
  assert.throws(()=>storeConfig({STORE_BACKEND:'postgres'}),/DATABASE_URL/)
  assert.throws(()=>storeConfig({STORE_BACKEND:'firestore'}),/PROJECT_ID/)
  assert.throws(()=>storeConfig({NODE_ENV:'production',STORE_BACKEND:'firestore',FIRESTORE_PROJECT_ID:'demo-tests',FIRESTORE_EMULATOR_HOST:'localhost:8080'}),/emulator/)
  assert.equal(storeConfig({NODE_ENV:'production',STORE_BACKEND:'firestore',FIRESTORE_PROJECT_ID:'demo-tests'}).backend,'firestore')
})
