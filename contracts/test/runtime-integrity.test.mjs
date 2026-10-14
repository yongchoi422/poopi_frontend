import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {network} from 'hardhat'
import {BrowserProvider,ContractFactory,getBytes,hexlify,id} from 'ethers'
import {matchesCompiledRuntime} from '../scripts/release-tools.mjs'

test('runtime verification rejects a changed immutable use even if another occurrence still matches its getter',async()=>{
 const connection=await network.create('default'),p=new BrowserProvider(connection.provider,undefined,{cacheTimeout:-1})
 try{
  assert.equal((await p.getNetwork()).chainId,31337n)
  const arts=JSON.parse(readFileSync(new URL('../artifacts/contracts.json',import.meta.url))).contracts
  const [a,b,c]=await p.listAccounts(),token=await new ContractFactory(arts.TestToken.abi,arts.TestToken.bytecode,a).deploy();await token.waitForDeployment()
  const now=(await p.getBlock('latest')).timestamp
  for(const version of [1,2]){
   const art=arts[version===1?'SouliEthSale':'SouliEthSaleV2']
   const sale=await new ContractFactory(art.abi,art.bytecode,a).deploy(await token.getAddress(),a.address,b.address,100,42,42,now-1,version===1?now+10000:0,id('runtime consistency regression'))
   await sale.waitForDeployment();const good=await p.getCode(await sale.getAddress())
   assert.equal(matchesCompiledRuntime(good,art),true)
   let tested=0
   for(const refs of Object.values(art.immutableReferences).filter(x=>x.length>1)){
    for(const {start,length}of refs){
     const altered=getBytes(good);altered[start+length-1]^=1
     assert.equal(matchesCompiledRuntime(hexlify(altered),art),false);tested++
    }
   }
   assert.ok(tested>10)
  }
 }finally{p.destroy();await connection.close()}
})
