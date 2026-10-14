// Local review UI, reusing the tested deployment client. No wallet or RPC calls.
import {readFileSync,writeFileSync,existsSync} from 'node:fs'
const dir=new URL('./',import.meta.url),root=new URL('../../',dir)
const read=name=>readFileSync(new URL(name,dir),'utf8')
for(const [source,target] of [['review.json','deployment-review.json'],['context.json','deployment-context.json']]){
 const value=read(source),path=new URL(target,dir)
 if(existsSync(path)&&readFileSync(path,'utf8')!==value)throw Error('Frozen deployment files already exist; reconcile before replacing')
 writeFileSync(path,value)
}
const compiled=JSON.parse(readFileSync(new URL('contracts/artifacts/contracts.json',root))).contracts
writeFileSync(new URL('artifacts.json',dir),JSON.stringify(Object.fromEntries(['SouliEthSaleV2','SouliThreeWalletControllerV2'].map(name=>[name,compiled[name]]))))
let source=readFileSync(new URL('tmp/mainnet-pilot/PilotApp.vue',root),'utf8')
const replacements=[
 ["import review from './review.json'","import review from './deployment-review.json'"],
 ["import context from './context.json'","import context from './deployment-context.json'"],
 ['LOCAL PILOT REVIEW','LOCAL V2 DEPLOYMENT'],
 ['A small real-world check.','Your new SOULI sale.'],
 ['42 SOULI for the pilot. The public sale stays closed.','4.2M SOULI capacity. Deploy paused, then check with just 42 SOULI.'],
 ['<small>Pilot maximum</small><strong>42 SOULI</strong>','<small>Round maximum</small><strong>4,200,000 SOULI</strong>'],
 ['<small>Per wallet</small><strong>10 SOULI</strong>','<small>Per wallet</small><strong>4,200,000 SOULI</strong>'],
 ['<dt>Pilot window</dt><dd>{{date(review.terms.startsAt)}}<br>to {{date(review.terms.endsAt)}}','<dt>Sale window</dt><dd>From {{date(review.terms.startsAt)}}<br>No calendar end · lifetime cap applies'],
 ['A, B or C can act independently. Manual LP. No automatic LP or purchase refund.','A, B or C can act independently. 50% purchase ETH for manual LP + separate SOULI; 50% operations. This is a plan, not an on-chain spending restriction. No purchase refund. LP principal lock: 1 year planned, not deployed.'],
 ]
for(const [from,to]of replacements){if(!source.includes(from))throw Error('Missing UI anchor: '+from);source=source.replace(from,to)}
writeFileSync(new URL('CommercialDeploy.vue',dir),source)
writeFileSync(new URL('deploy.html',dir),'<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>SOULI · Commercial V2 deployment</title></head><body><div id="app"></div><script type="module" src="./deploy.js"></script></body></html>\n')
writeFileSync(new URL('deploy.js',dir),"import {createApp} from 'vue'\nimport App from './CommercialDeploy.vue'\nimport '../../src/styles/souli-typography.css'\nif(!import.meta.env.DEV||!['127.0.0.1','localhost'].includes(location.hostname))throw Error('Local deployment review only')\ncreateApp(App).mount('#app')\n")
console.log('Frozen deployment review and local UI prepared; no transaction sent.')
