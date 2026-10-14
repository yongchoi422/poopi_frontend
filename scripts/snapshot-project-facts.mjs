// Public, read-only evidence for the landing page. Never signs or sends a transaction.
import {readFileSync,writeFileSync} from 'node:fs'
import {Contract,JsonRpcProvider,FetchRequest,keccak256} from 'ethers'
const {contract:token}=JSON.parse(readFileSync(new URL('../src/lighthouse/public-souls.json',import.meta.url)))
const request=new FetchRequest(process.env.BASE_READ_RPC||'https://base-rpc.publicnode.com');request.timeout=20000
const provider=new JsonRpcProvider(request,8453,{staticNetwork:true})
try {
  if(BigInt(await provider.send('eth_chainId',[]))!==8453n)throw Error('Expected Base')
  const height=await provider.getBlockNumber(),at={blockTag:height}
  const contract=new Contract(token,['function owner() view returns(address)','function decimals() view returns(uint8)','function totalSupply() view returns(uint256)'],provider)
  const [owner,decimals,supply,code,block]=await Promise.all([contract.owner(at),contract.decimals(at),contract.totalSupply(at),provider.getCode(token,height),provider.getBlock(height)])
  if(!block||code==='0x'||Number(decimals)!==9)throw Error('Unexpected token deployment')
  const facts={chainId:8453,token,block:height,blockTime:new Date(block.timestamp*1000).toISOString(),observedAt:new Date().toISOString(),owner,decimals:Number(decimals),totalSupplyUnits:String(supply),tokenRuntimeCodeHash:keccak256(code),readOnly:true}
  writeFileSync(new URL('../src/site/project-facts.json',import.meta.url),JSON.stringify(facts,null,2)+'\n')
  console.log(JSON.stringify(facts,null,2))
} finally {provider.destroy()}
