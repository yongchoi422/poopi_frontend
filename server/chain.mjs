import { JsonRpcProvider, Contract, FetchRequest } from 'ethers'
export const SOULI = '0xb43eA104c7ec75038Ac8EcA57107Eefc8B039aFF'
export function createHolderReader(rpc='https://base-rpc.publicnode.com') {
  const request=new FetchRequest(rpc);request.timeout=10000
  const provider=new JsonRpcProvider(request,8453,{staticNetwork:true})
  const token=new Contract(SOULI,['function balanceOf(address) view returns (uint256)','function dynamicInscription(address) view returns (uint256 seed,uint256 extra)','function inscriptionCount(address) view returns (uint256)'],provider)
  return async address => {
    const block=await provider.getBlockNumber()
    const [balance,dynamic,count]=await Promise.all([token.balanceOf(address,{blockTag:block}),token.dynamicInscription(address,{blockTag:block}),token.inscriptionCount(address,{blockTag:block})])
    return { eligible: balance>0n && (dynamic.seed>0n || count>0n), block, balanceUnits: balance.toString() }
  }
}
