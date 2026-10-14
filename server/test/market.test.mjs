import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseEthMarket, createMarketFeed } from '../market.mjs'
import { marketKind, freshMarket, createDefense, settleDefense, defensePhase, MINUTE } from '../../src/lighthouse/market-world.mjs'
import { createSanctuary, enableAutomation, advanceAutomatic, restoreSanctuary, OFFLINE_MS } from '../../src/lighthouse/sanctuary.mjs'
import { advanceLocalWeather, restoreLocalWeather } from '../../src/lighthouse/local-weather.mjs'

test('ETH boundaries, malformed data and stale ticks cannot create false weather', () => {
  assert.deepEqual([-4,-3.99,-1,-.99,0,3.99,4].map(marketKind), ['fog','rain','rain','calm','calm','calm','aurora'])
  const now = Date.now(), stats = {open:'2000'}, ticker = {price:'1900',time:new Date(now).toISOString()}
  const sample = parseEthMarket(stats,ticker,now)
  assert.equal(sample.asset,'ETH');assert.equal(sample.kind,'fog');assert.ok(freshMarket(sample,now))
  assert.equal(freshMarket(sample,now+16*MINUTE),false)
  for (const bad of ['0','NaN','',Infinity]) assert.throws(()=>parseEthMarket({open:bad},ticker,now))
  assert.throws(()=>parseEthMarket(stats,{...ticker,time:new Date(now-16*MINUTE).toISOString()},now))
  assert.throws(()=>parseEthMarket(stats,{...ticker,time:new Date(now+2*MINUTE).toISOString()},now))
})
test('public feed coalesces callers, caches for five minutes and falls back on failure',async()=>{
  let now=Date.now(),calls=0,fail=false
  const feed=createMarketFeed({now:()=>now,fetcher:async url=>{
    calls++;if(fail)throw Error('offline')
    return {ok:true,headers:new Headers({date:new Date(now).toUTCString()}),json:async()=>url.endsWith('stats')?{open:'2000'}:{price:'2100',time:new Date(now).toISOString()}}
  }})
  const responses=await Promise.all(Array.from({length:8},()=>feed.read()))
  assert.equal(calls,2);assert.ok(responses.every(r=>r.kind==='aurora'&&r.status==='live'))
  await feed.read();assert.equal(calls,2)
  now+=5*MINUTE;fail=true
  const failed=await feed.read();assert.equal(failed.status,'stale');assert.equal(failed.kind,'calm')
  await feed.read();assert.equal(calls,4)
  now+=5*MINUTE;fail=false;assert.equal((await feed.read()).status,'live')
})
test('auto life migrates without deleting progress, builds three projects and caps catch-up',()=>{
  const state=createSanctuary(0);state.memories=17
  enableAutomation(state,0);advanceAutomatic(state,15*MINUTE)
  assert.ok(state.lantern&&state.bench&&state.gallery)
  assert.deepEqual([state.memories,state.supplies,state.glowstones],[62,0,0])
  assert.equal(advanceAutomatic(state,15*MINUTE),0)
  const restored=restoreSanctuary(JSON.stringify(state),15*MINUTE)
  assert.equal(restored.automation,true)
  advanceAutomatic(restored,15*MINUTE+3*OFFLINE_MS)
  assert.equal(restored.days,135)
})
test('cooperation is equal per home, idempotent, bounded by leases and never punitive',()=>{
  const event=createDefense('fog',0,2), homes=[{id:'a',from:0,until:10*MINUTE},{id:'b',from:2*MINUTE,until:60*MINUTE}]
  assert.equal(defensePhase(event,0),'prepare')
  settleDefense(event,homes,8*MINUTE);assert.equal(event.light,14)
  settleDefense(event,homes,8*MINUTE);assert.equal(event.light,14)
  settleDefense(event,homes,7*MINUTE);assert.equal(event.light,14)
  settleDefense(event,homes,25*MINUTE);assert.equal(event.light,28);assert.equal(event.result,'lit')
  assert.equal(defensePhase(event,25*MINUTE),'recover');assert.equal(defensePhase(event,31*MINUTE),'rest')
  settleDefense(event,homes,50*MINUTE);assert.equal(event.light,28)
  const empty=createDefense('aurora',0,2);settleDefense(empty,[],21*MINUTE);assert.equal(empty.result,'recovering')
})
test('solo events use only observed time and persist one story and one lasting light',()=>{
  const state=createSanctuary(0), signal=createDefense('fog',0)
  let local=advanceLocalWeather(null,signal,state,6*MINUTE)
  local=restoreLocalWeather(JSON.stringify(local),6*MINUTE)
  assert.ok(local);assert.equal(local.event.light,0)
  local=advanceLocalWeather(local,signal,state,20*MINUTE)
  assert.equal(local.event.light,14);assert.equal(local.event.wins,1)
  assert.equal(state.journal.length,1)
  local=restoreLocalWeather(JSON.stringify(local),20*MINUTE)
  advanceLocalWeather(local,signal,state,21*MINUTE)
  assert.equal(state.journal.length,1);assert.equal(local.event.wins,1)
  assert.equal(restoreLocalWeather('{"event":{"kind":"fog","startAt":"bad"}}',MINUTE),null)
  const next=createDefense('aurora',360*MINUTE)
  local=advanceLocalWeather(local,next,state,360*MINUTE)
  assert.equal(local.event.wins,1);assert.equal(local.event.light,0)
})
