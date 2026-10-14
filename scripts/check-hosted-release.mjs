// Read-only smoke test against a chosen HTTPS deployment. No wallet or session writes.
import assert from 'node:assert/strict'
import { HERO_FILMS } from '../src/site/hero-films.mjs'
const input=process.argv[2]
if(!input)throw Error('Usage: node scripts/check-hosted-release.mjs https://<site-host> [https://<api-host>]')
const origin=new URL(input)
assert.equal(origin.protocol,'https:','Use the actual HTTPS deployment.')
assert.equal(origin.href,origin.origin+'/','Supply only an origin.')
assert.ok(!origin.username&&!origin.password,'No credentials in URLs.')
const apiOrigin=new URL(process.argv[3]||input)
assert.equal(apiOrigin.protocol,'https:')
assert.equal(apiOrigin.href,apiOrigin.origin+'/')
assert.ok(!apiOrigin.username&&!apiOrigin.password)
async function read(path){return fetch(new URL(path,path.startsWith('/api/')?apiOrigin:origin),{headers:path.startsWith('/api/')?{Origin:origin.origin}:undefined,redirect:'manual',signal:AbortSignal.timeout(60000)})}
for(const path of ['/','/lighthouse.html','/soul','/soul/','/soul/index.html','/pilot','/pilot/','/pilot/index.html','/pilot-v2','/pilot-v2/','/pilot-v2/index.html','/testnet','/testnet/','/testnet/index.html','/whitepaper','/whitepaper/','/whitepaper/index.html','/buy','/buy/','/buy/index.html','/manage','/manage/','/manage/index.html']){
  const r=await read(path);assert.equal(r.status,200,`${path} status`)
  assert.match(r.headers.get('content-type')||'',/text\/html/)
  assert.match(r.headers.get('content-security-policy')||'',/frame-ancestors 'none'/)
  assert.ok(r.headers.get('strict-transport-security'))
  const html=await r.text();assert.ok(!html.includes('/src/'),'Vite development entry must not be public.')
  if(path.startsWith('/testnet')||path.startsWith('/manage')||path.startsWith('/pilot')){
    assert.match(html,/noindex,\s*nofollow/,'Testnet must be marked non-indexable.')
    assert.match(r.headers.get('x-robots-tag')||'',/noindex/)
    assert.match(r.headers.get('cache-control')||'',/no-store/)
    assert.ok(r.headers.get('content-security-policy').includes('https://sepolia.base.org'))
  }
  // Resolve relative paths against each actual URL, including the slashless route.
  const assets=[...html.matchAll(/(?:src|href)="([^"?#]+\.(?:js|css))"/g)].map(m=>new URL(m[1],new URL(path,origin)))
  assert.ok(assets.some(url=>url.pathname.endsWith('.js')),`${path} must load a built script`)
  for(const asset of assets){assert.equal(asset.origin,origin.origin);const a=await read(asset.pathname);assert.equal(a.status,200,`Asset ${asset.pathname}`);assert.match(a.headers.get('content-type')||'',/javascript|text\/css/,`Asset must not be an HTML fallback: ${asset.pathname}`)}
}
for(const film of HERO_FILMS){
  for(const [path,type] of [[film.video,'video/mp4'],[film.poster,'image/jpeg']]){
    const response=await fetch(new URL(path,origin),{method:'HEAD',signal:AbortSignal.timeout(60000)})
    assert.equal(response.status,200,`${path} status`)
    assert.equal(response.headers.get('content-type')?.split(';')[0],type,`${path} media type`)
    assert.match(response.headers.get('cache-control')||'',/max-age=31536000.*immutable/,`${path} cache`)
  }
}
const range=await fetch(new URL(HERO_FILMS[0].video,origin),{headers:{Range:'bytes=0-1023'},signal:AbortSignal.timeout(60000)})
assert.equal(range.status,206,'MP4 byte-range playback')
assert.equal((await range.arrayBuffer()).byteLength,1024)
const statusResponse=await read('/api/status');assert.equal(statusResponse.status,200)
if(apiOrigin.origin!==origin.origin){
  assert.equal(statusResponse.headers.get('access-control-allow-origin'),origin.origin)
  assert.equal(statusResponse.headers.get('access-control-allow-credentials'),'true')
}
const status=await statusResponse.json()
assert.equal(status.mode,'private-beta');assert.equal(status.chainId,8453)
assert.equal(status.sales,false);assert.equal(status.allowlistRequired,true)
assert.equal((await read('/api/health/ready')).status,200)
for(const path of ['/purchase-lab.html','/.env','/server/index.mjs','/api/not-an-endpoint'])assert.equal((await read(path)).status,404,`${path} must not be served`)
assert.equal((await read('/api/world')).status,401)
console.log('PASS: HTTPS main/game/testnet routes/assets, six media pairs/types/cache/range playback, testnet noindex/no-store, security headers, durable-store readiness, private beta, disabled legacy API sales and nonpublic files. The API sales flag is separate from on-chain V2 availability. Actual MetaMask and save/restore require separate verification.')
