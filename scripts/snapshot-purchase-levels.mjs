// Read-only snapshot of the deployed renderer. Source fixtures have different
// thresholds; never use them to advertise the minimum amounts on Base.
import { readFileSync, writeFileSync } from 'node:fs'
import { Contract, JsonRpcProvider, FetchRequest, keccak256 } from 'ethers'
const token='0xb43eA104c7ec75038Ac8EcA57107Eefc8B039aFF'
const rpc=new FetchRequest(process.env.BASE_READ_RPC||'https://base-rpc.publicnode.com');rpc.timeout=20000
const provider=new JsonRpcProvider(rpc,8453,{staticNetwork:true,cacheTimeout:-1})
try{
  const abi=JSON.parse(readFileSync(new URL('../src/assets/abis/token.json',import.meta.url)))
  const contract=new Contract(token,abi,provider)
  const block=process.env.BASE_LEVEL_BLOCK?Number(process.env.BASE_LEVEL_BLOCK):await provider.getBlockNumber()
  const cache=new Map(),overrides={blockTag:block}
  async function level(seed){
    const key=String(seed)
    if(!cache.has(key))cache.set(key,Number((await contract.getSoul([seed,0],overrides)).lvl))
    return cache.get(key)
  }
  const max=BigInt(await contract.totalSupply(overrides))/1000000000n
  const first=await level(1n),last=await level(max),levels=[]
  if(first!==0||last!==4)throw Error('Renderer level range changed; review product labels before replacing samples.')
  for(let target=first;target<=last;target++){
    let low=1n,high=max
    while(low<high){const mid=(low+high)/2n;if(await level(mid)>=target)high=mid;else low=mid+1n}
    const below=low>1n?await level(low-1n):null,at=await level(low)
    if(at!==target||(below!==null&&below!==target-1))throw Error('Unexpected threshold boundary')
    // Curated example within each level. The purchase preset remains the minimum;
    // choosing an example never changes the quantity or promises that exact form.
    const seed=low+(target===4?21n:0n)
    if(await level(seed)!==target)throw Error('Curated inscription is outside its advertised level')
    const svg=await contract.getSvg([seed,0],overrides)
    if(!svg.startsWith('<svg')||/<(?:script|image|foreignObject)|\bon\w+=|(?:https?:)?\/\//i.test(svg.replace("http://www.w3.org/2000/svg",'')))throw Error('Unexpected SVG renderer content')
    levels.push({displayLevel:target+1,contractLevel:target,minimum:low.toString(),seed:seed.toString(),extra:'0',belowLevel:below,svg})
    console.log(`Level ${target+1} (contract ${target}): ${low} SOULI minimum`)
  }
  const snapshot={chainId:8453,contract:token,block,fetchedAt:new Date().toISOString(),tokenRuntimeCodeHash:keccak256(await provider.getCode(token,block)),basis:'A single inscription seed, not aggregate wallet balance. Samples are renderer examples, not guaranteed purchase outcomes. Display levels 1–5 correspond to contract levels 0–4.',levels}
  const output=new URL('../src/lighthouse/purchase-levels.json',import.meta.url)
  writeFileSync(output,JSON.stringify(snapshot,null,2)+'\n')
  console.log('Saved deployed renderer samples at block',block)
}finally{provider.destroy()}
