// Prepare localhost-only stock and purchase screens; no wallet requests.
import {readFileSync,writeFileSync} from 'node:fs'
const dir=new URL('./',import.meta.url),pilot=new URL('../mainnet-pilot/',dir)
for(const filename of ['manage.html','manage.js','buy.html','buy.js']){
 let source=readFileSync(new URL(filename,pilot),'utf8')
 source=source.replaceAll('Mainnet pilot','Commercial V2 check').replaceAll('Local pilot only','Local V2 check only')
 writeFileSync(new URL(filename,dir),source)
}
let source=readFileSync(new URL('PilotBuy.vue',pilot),'utf8')
source=source.replaceAll('/tmp/mainnet-pilot/','/tmp/commercial-v2/').replace('Pilot manager ↗','Check manager ↗').replace('LOCAL PILOT · REAL BASE ETH + ORIGINAL SOULI','LOCAL V2 CHECK · REAL BASE ETH + ORIGINAL SOULI').replace('42-token mainnet pilot · 10 per wallet.','Small mainnet check · 42 SOULI stock planned.').replace('Real payment. This is separate from the public commercial sale.','Real payment at the fixed V2 price. The public checkout remains closed; this contract has a lifetime 4.2M cap.')
writeFileSync(new URL('PilotBuy.vue',dir),source)
console.log('Local check UI prepared. Verified manifests must exist before opening; no public checkout changed.')
