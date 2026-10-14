import { Contract, ContractFactory, Interface, isAddress, getAddress, getBytes, keccak256, toUtf8Bytes, ZeroAddress } from 'ethers'
import { validateSaleConfig } from '../../src/lighthouse/native-sale.mjs'
export const BASE_SOULI='0xb43eA104c7ec75038Ac8EcA57107Eefc8B039aFF'
export const BASE_TOKEN_CODE_HASH='0x9afd2c3834d86fbf79beb22fd67e02e95f616e7606250f8b7d6e1cc6ff36574c'
export function selectSaleArtifact(artifacts,version=1){
  if(![1,2].includes(version))throw Error('Unsupported sale version')
  const artifact=artifacts[version===2?'SouliEthSaleV2':'SouliEthSale']
  if(!artifact)throw Error('Compile the reviewed contract version first')
  return artifact
}
export function termsFor(input,{allowTest=false}={}){
  const chainId=Number(input.chainId)
  if(chainId!==8453&&(!allowTest||![84532,31337].includes(chainId)))throw Error('Only reviewed Base mainnet or explicit test deployments are supported')
  for(const a of [input.owner,input.treasury,input.token])if(!isAddress(a)||getAddress(a)===ZeroAddress)throw Error('Valid owner, treasury and token addresses are required')
  if(chainId===8453&&getAddress(input.token)!==BASE_SOULI)throw Error('Wrong Base SOULI token')
  if(getAddress(input.owner)===getAddress(input.token)||getAddress(input.treasury)===getAddress(input.token))throw Error('Token contract cannot administer or receive sale proceeds')
  const version=input.version??1
  if(![1,2].includes(version))throw Error('Unsupported sale version')
  const terms={version,chainId,token:getAddress(input.token),treasury:getAddress(input.treasury)}
  for(const k of ['unitPriceWei','saleCap','walletCap','startsAt','endsAt']){
    if(typeof input[k]!=='string'||! /^(0|[1-9]\d*)$/.test(input[k]))throw Error(k+' must be an exact decimal string')
    terms[k]=input[k]
  }
  Object.assign(terms,{immediateDelivery:true,automaticLiquidity:false,refundable:false})
  if(version===2)Object.assign(terms,{endPolicy:terms.endsAt==='0'?'sellout':'dated',useOfProceeds:{lpBps:5000,operationsBps:5000,enforcedOnChain:false}})
  return {owner:getAddress(input.owner),terms,termsHash:keccak256(toUtf8Bytes(JSON.stringify(terms)))}
}
export async function prepareDeployment(input,artifact,{allowTest=false}={}){
  const review=termsFor(input,{allowTest}),t=review.terms
  if(artifact.source!==`src/SouliEthSale${t.version===2?'V2':''}.sol`)throw Error('Sale artifact version differs from the reviewed terms')
  validateSaleConfig({enabled:true,mode:t.chainId===8453?'live':'test',chainId:t.chainId,address:review.owner,runtimeCodeHash:'0x'+'11'.repeat(32),terms:t,termsHash:review.termsHash},{allowTest})
  const args=[t.token,review.owner,t.treasury,t.unitPriceWei,t.saleCap,t.walletCap,t.startsAt,t.endsAt,review.termsHash]
  const tx=await new ContractFactory(artifact.abi,artifact.bytecode).getDeployTransaction(...args)
  return {...review,constructorArgs:args,creationCodeHash:keccak256(artifact.bytecode),transaction:{chainId:t.chainId,value:'0x0',data:tx.data},note:'Unsigned data only. Initially paused. Does not deposit inventory or enable the website.'}
}
export function matchesCompiledRuntime(code,artifact){
  const actual=getBytes(code),expected=getBytes(artifact.runtime)
  if(actual.length!==expected.length)return false
  // All uses of one immutable must agree before getter checks can bind its
  // value to the review. Masking each occurrence independently accepts a
  // counterfeit runtime whose getter and executable payout constant differ.
  for(const locations of Object.values(artifact.immutableReferences)){
    let reference
    for(const {start,length}of locations){
      if(!Number.isSafeInteger(start)||!Number.isSafeInteger(length)||start<0||length<=0||start+length>actual.length)return false
      const value=actual.slice(start,start+length)
      if(reference&&(value.length!==reference.length||!value.every((byte,i)=>byte===reference[i])))return false
      reference??=value
    }
    for(const {start,length}of locations){actual.fill(0,start,start+length);expected.fill(0,start,start+length)}
  }
  return actual.every((value,index)=>value===expected[index])
}
export async function inspectDeployment(provider,address,review,artifact,{allowTest=false,blockTag}={}){
  const t=review.terms,chainId=Number((await provider.getNetwork()).chainId)
  if(chainId!==t.chainId)throw Error('Wrong verification chain')
  const block=blockTag??await provider.getBlockNumber()
  if(!Number.isSafeInteger(block)||block<0)throw Error('Invalid verification block')
  const code=await provider.getCode(address,block)
  if(!matchesCompiledRuntime(code,artifact))throw Error('Deployed bytecode differs from this compiled sale')
  const c=new Contract(address,artifact.abi,provider),overrides={blockTag:block}
  const fields=['unitPriceWei','saleCap','walletCap','startsAt','endsAt']
  for(const name of fields)if(String(await c[name](overrides))!==t[name])throw Error('On-chain '+name+' differs')
  for(const [name,value]of [['owner',review.owner],['treasury',t.treasury],['souli',t.token]])if(getAddress(await c[name](overrides))!==getAddress(value))throw Error('On-chain '+name+' differs')
  if(await c.termsHash(overrides)!==review.termsHash||await c.VERSION(overrides)!==BigInt(t.version))throw Error('On-chain terms/version differs')
  const token=new Contract(t.token,['function decimals() view returns(uint8)'],provider)
  if(await token.decimals(overrides)!==9n)throw Error('Wrong SOULI decimals')
  if(chainId===8453&&keccak256(await provider.getCode(t.token,block))!==BASE_TOKEN_CODE_HASH)throw Error('SOULI code differs from tested Base snapshot')
  const manifest={enabled:true,mode:chainId===8453?'live':'test',chainId,address:getAddress(address),runtimeCodeHash:keccak256(code),terms:t,termsHash:review.termsHash}
  validateSaleConfig(manifest,{allowTest})
  return {block,paused:await c.paused(overrides),available:String(await c.available(overrides)),candidateManifest:manifest,note:'Candidate only. This check does not approve a launch or modify LIVE_SALE.'}
}
export function inventoryTransactions(address,review,wholeSouli,artifact){
  if(!isAddress(address)||getAddress(address)===ZeroAddress||! /^[1-9]\d*$/.test(wholeSouli)||BigInt(wholeSouli)>BigInt(review.terms.saleCap))throw Error('Invalid inventory plan')
  const sale=new Interface(artifact.abi),token=new Interface(['function approve(address,uint256) returns(bool)']),chainId=review.terms.chainId
  return [
    {purpose:'Approve only this inventory amount',from:review.owner,to:review.terms.token,chainId,value:'0x0',data:token.encodeFunctionData('approve',[address,BigInt(wholeSouli)*1000000000n])},
    {purpose:'Deposit stock; may change the owner wallet artwork',from:review.owner,to:address,chainId,value:'0x0',data:sale.encodeFunctionData('deposit',[wholeSouli])},
    {purpose:'Unpause only after review and delivery checks',from:review.owner,to:address,chainId,value:'0x0',data:sale.encodeFunctionData('unpause')},
  ]
}
