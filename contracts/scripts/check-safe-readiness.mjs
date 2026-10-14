// Read-only Base Sepolia deployment prerequisites. Never creates a Safe or signs.
import { getSafeL2SingletonDeployment, getProxyFactoryDeployment } from '@safe-global/safe-deployments'
import { JsonRpcProvider, getAddress, keccak256, formatEther } from 'ethers'
import { mkdirSync, writeFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const owners=process.argv.slice(2).map(getAddress)
assert.equal(owners.length,3,'Pass three public owner addresses; never keys')
assert.equal(new Set(owners.map(x=>x.toLowerCase())).size,3,'Owners must be distinct')
assert.ok(owners.every(x=>!/^0x0{40}$/i.test(x)),'Zero owner rejected')
const provider=new JsonRpcProvider(process.env.BASE_SEPOLIA_READ_RPC || 'https://sepolia.base.org')
try {
  assert.equal((await provider.getNetwork()).chainId,84532n)
  const block=await provider.getBlockNumber(),contracts={}
  for(const [name,lookup] of [['SafeL2',getSafeL2SingletonDeployment],['SafeProxyFactory',getProxyFactoryDeployment]]){
    const deployment=lookup({network:'84532',version:'1.4.1'})
    assert.ok(deployment,`${name} official deployment missing`)
    const address=deployment.networkAddresses['84532'],code=await provider.getCode(address,block)
    const match=Object.values(deployment.deployments).find(x=>x.address.toLowerCase()===address.toLowerCase())
    assert.ok(match,`${name} not in official registry`);assert.notEqual(code,'0x');assert.equal(keccak256(code),match.codeHash)
    contracts[name]={address,codeHash:keccak256(code),version:deployment.version}
  }
  const balances=await Promise.all(owners.map(async address=>({address,testEth:formatEther(await provider.getBalance(address,block)),hasCode:(await provider.getCode(address,block))!=='0x'})))
  const report={checkedAt:new Date().toISOString(),chainId:84532,block,threshold:2,owners:balances,contracts,publicTransactionsSent:0,safeAddress:null,
    status:'READ_ONLY_PREREQUISITES_ONLY',note:'No alias, seed or key stored. Delegated EOA code is possible; actual wallet signing remains unverified.'}
  const dir=new URL('../../logs/sale-checks/',import.meta.url);mkdirSync(dir,{recursive:true});writeFileSync(new URL('safe-readiness.json',dir),JSON.stringify(report,null,2)+'\n')
  console.log(JSON.stringify(report,null,2))
} finally {provider.destroy()}
