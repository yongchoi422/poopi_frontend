import assert from 'node:assert/strict'
import { createSanctuary, enableAutomation, OFFLINE_MS } from '../src/lighthouse/sanctuary.mjs'
import { projectCloudHome, projectDefense, CLOUD_POLL_MS } from '../src/lighthouse/cloud-checkpoint.mjs'
const home=createSanctuary(1000000);enableAutomation(home,1000000)
const checkpoint={home,serverTime:1000000,leaseUntil:1000000+OFFLINE_MS}
const original=JSON.stringify(checkpoint)
assert.equal(projectCloudHome(checkpoint,-1).days,0)
assert.equal(projectCloudHome(checkpoint,60000).days,1)
assert.ok(projectCloudHome(checkpoint,60000).lantern)
assert.equal(projectCloudHome(checkpoint,10*OFFLINE_MS).days,120)
assert.equal(projectCloudHome(checkpoint,NaN).days,0)
assert.equal(JSON.stringify(checkpoint),original,'Projection must never mutate the saved checkpoint')
assert.equal(CLOUD_POLL_MS,300000)
const defense={startAt:1000000,endAt:2200000,light:4,target:8,result:null}
assert.equal(projectDefense(defense,1400000).phase,'guard')
assert.deepEqual(projectDefense(defense,2300000),{...defense,phase:'recover'})
console.log('PASS: smooth cloud projection respects the verified lease and never invents cooperative rewards.')
