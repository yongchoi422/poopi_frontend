import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { openFirestoreStore } from '../firestore-store.mjs'
import { repository } from '../repository.mjs'
import { createWorldWeather } from '../world-weather.mjs'
if(!/^127\.0\.0\.1:\d+$/.test(process.env.SOULI_TEST_FIRESTORE_HOST||'') || process.env.FIRESTORE_EMULATOR_HOST!==process.env.SOULI_TEST_FIRESTORE_HOST)throw Error('A loopback emulator is required')
test('Firestore transaction retries preserve exact increments; new SDK clients see persisted saves and market cache',async()=>{
  const config={projectId:'demo-souli-tests',namespace:`test_${randomUUID()}`}
  let store=openFirestoreStore(config),db=repository(store)
  try{
    await db.run(tx=>tx.put('villages',{id:'one',members:0,supplies:0,glowstones:0}))
    await Promise.all(Array.from({length:6},()=>db.run(async tx=>{
      const row=await tx.get('villages','one');await tx.put('villages',{...row,supplies:row.supplies+1})
      // Read after a staged write must see this transaction's value.
      assert.equal((await tx.get('villages','one')).supplies,row.supplies+1)
    })))
    assert.equal((await db.run(tx=>tx.get('villages','one'))).supplies,6)
    await assert.rejects(()=>db.run(async tx=>{await tx.put('villages',{id:'one',members:0,supplies:999,glowstones:0});throw Error('cancel')}),/cancel/)
    let reads=0;const time=Date.now(),feed={read:async()=>{reads++;return {asset:'ETH',status:'live',kind:'fog',observedAt:time,change24h:-5}}}
    const other=openFirestoreStore(config)
    try{
      await Promise.all([store,other].map(store=>createWorldWeather({store,feed,now:()=>time}).refresh()))
      assert.equal(reads,1)
    }finally{await other.close()}
    await store.close();store=openFirestoreStore(config);db=repository(store)
    assert.equal((await db.run(tx=>tx.get('villages','one'))).supplies,6)
    const weather=await createWorldWeather({store,feed,now:()=>time+60000}).refresh()
    assert.equal(reads,1);assert.equal(weather.event.kind,'fog')
  }finally{await store.close()}
})
