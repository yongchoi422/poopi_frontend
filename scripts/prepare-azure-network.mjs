// No Azure writes. Converts observed IPv4 egress addresses to lossless contiguous ranges.
import {readFile,writeFile} from 'node:fs/promises'
import {isIP} from 'node:net'
import assert from 'node:assert/strict'
const [input,output]=process.argv.slice(2)
assert.ok(input&&output,'Usage: node scripts/prepare-azure-network.mjs <observed-ips.json> <parameters.json>')
const ips=JSON.parse((await readFile(input,'utf8')).replace(/^\uFEFF/,''))
assert.ok(Array.isArray(ips)&&ips.length>0&&ips.length<=200)
assert.ok(ips.every(ip=>isIP(ip)===4&&!ip.startsWith('0.')&&!ip.startsWith('127.')&&!ip.startsWith('10.')&&!ip.startsWith('192.168.')&&!/^172\.(1[6-9]|2\d|3[01])\./.test(ip)))
const number=ip=>ip.split('.').reduce((v,p)=>v*256+Number(p),0)
const address=n=>[24,16,8,0].map(shift=>Math.floor(n/2**shift)%256).join('.')
const values=[...new Set(ips.map(number))].sort((a,b)=>a-b),ranges=[]
for(const n of values){const last=ranges.at(-1);if(last&&last.end+1===n)last.end=n;else ranges.push({start:n,end:n})}
assert.equal(ranges.reduce((n,r)=>n+r.end-r.start+1,0),values.length,'Never include an unobserved address.')
const rules=ranges.map(r=>({name:'souli-aca-'+address(r.start).replaceAll('.','-'),start:address(r.start),end:address(r.end)}))
await writeFile(output,JSON.stringify({$schema:'https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#',contentVersion:'1.0.0.0',parameters:{serverName:{value:'pg-yeinai-fd2b58'},ranges:{value:rules}}},null,2)+'\n')
console.log(JSON.stringify({observedAddresses:values.length,exactRanges:rules.length,extraAddresses:0,cloudChanges:false}))
