// This recognizes existing delegation only. Never requests a 7702 authorization,
// changes wallet code, relays calls, or signs on the user's behalf.
import {getAddress,keccak256} from 'ethers'
export const METAMASK_DELEGATE='0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B'
// Base block 52116227. Address published by MetaMask delegation-framework v1.3.0.
export const BASE_METAMASK_DELEGATE_HASH='0x6af675ac126c441bec5d5013da3331a52e7465fc0d5a662a8708a9f33ce497ba'
export function reviewedDeployerAccount(value,chainId,{allowTest=false}={}){
  if(value===undefined)return undefined // Historical EOA reviews retain exact serialization.
  if(!value||value.kind!=='existing-metamask-7702-direct'||Object.keys(value).sort().join(',')!=='implementation,implementationCodeHash,kind')throw Error('Unsupported deployer account review')
  if(getAddress(value.implementation)!==METAMASK_DELEGATE||!/^0x[0-9a-f]{64}$/i.test(value.implementationCodeHash)||value.implementationCodeHash==='0x'+'0'.repeat(64))throw Error('Invalid reviewed delegation')
  if(!(allowTest&&chainId===31337)&&value.implementationCodeHash.toLowerCase()!==BASE_METAMASK_DELEGATE_HASH)throw Error('Unreviewed MetaMask implementation code')
  return {kind:value.kind,implementation:METAMASK_DELEGATE,implementationCodeHash:value.implementationCodeHash.toLowerCase()}
}
export async function checkDeployerAccount(provider,address,policy,block){
  const code=(await provider.getCode(address,block)).toLowerCase()
  if(!policy){if(code!=='0x')throw Error('This review requires a direct EOA deployment; existing delegation needs its own pinned review');return}
  const expected='0xef0100'+policy.implementation.slice(2).toLowerCase()
  if(code!==expected)throw Error('Deployer delegation changed; regenerate and review before signing')
  const implementation=await provider.getCode(policy.implementation,block)
  if(implementation==='0x'||keccak256(implementation)!==policy.implementationCodeHash)throw Error('Deployer implementation code changed')
}
