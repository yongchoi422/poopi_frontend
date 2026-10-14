// Used by the local pilot review only; never enables public checkout.
import { Interface, getBytes, keccak256, toUtf8Bytes, toQuantity } from 'ethers'
import { preflightController, inspectControllerDeployment } from '../../contracts/scripts/three-wallet-release-tools.mjs'
const same=(a,b)=>String(a).toLowerCase()===String(b).toLowerCase()
const hash=/^0x[0-9a-f]{64}$/i
const oracle=new Interface(['function getL1FeeUpperBound(uint256) view returns(uint256)'])
export function createDeploymentClient(review,artifacts,getWallet,reader,storage,{allowTest=false,now=()=>Date.now()}={}) {
  review=JSON.parse(JSON.stringify(review))
  const fingerprint=keccak256(toUtf8Bytes(JSON.stringify(review)))
  const direct7702=!!review.input.deployerAccount
  const key=`souli-deployment-v1:${review.terms.chainId}:${review.input.deployer.toLowerCase()}`
  let busy=false,plan=null,memory=null
  const empty=()=>({fingerprint,pending:null,completed:null})
  function state(){
    if(memory)return memory
    const s=JSON.parse(storage.getItem(key)||'null')||empty()
    if(s.fingerprint!==fingerprint){
      if(s.pending||!s.completed||!['verified','failed'].includes(s.completed.status)||!hash.test(s.completed.hash||''))throw Error('A different deployment review is saved. Reconcile it before continuing.')
      return empty() // Completed older rounds are archived before the next send.
    }
    if(s.pending){const tx=s.pending.tx
      if(direct7702&&(BigInt(tx.type??-1)!==2n||tx.authorizationList))throw Error('Saved request is not the reviewed direct transaction.')
      if(!same(tx.from,review.input.deployer)||tx.to||!same(tx.data,review.transaction.data)||BigInt(tx.value)!==0n||BigInt(tx.chainId)!==BigInt(review.terms.chainId)||BigInt(tx.nonce)!==BigInt(review.input.nonce)||(s.pending.hash&&!hash.test(s.pending.hash)))throw Error('Saved request differs from this deployment. Do not send again.')
    }
    return s
  }
  function save(s,broadcast=false){
    try{
      const previous=JSON.parse(storage.getItem(key)||'null')
      if(previous&&previous.fingerprint!==fingerprint){
        if(previous.pending||!previous.completed||!['verified','failed'].includes(previous.completed.status)||!hash.test(previous.completed.hash||''))throw Error('Unresolved previous review')
        const archiveKey=key+':archive:'+previous.fingerprint,archived=JSON.stringify(previous)
        storage.setItem(archiveKey,archived);if(storage.getItem(archiveKey)!==archived)throw Error('Archive failed')
      }
      const value=JSON.stringify(s);storage.setItem(key,value);if(storage.getItem(key)!==value)throw Error();memory=null
    }
    catch{if(broadcast){memory={...s,storageWarning:true};return}throw Error('Could not save recovery. No wallet request sent.')}
  }
  async function context(){
    const w=getWallet();if(!w?.request)throw Error('Connect the deployment wallet.')
    const [chain,accounts]=await Promise.all([w.request({method:'eth_chainId'}),w.request({method:'eth_accounts'})])
    if(BigInt(chain)!==BigInt(review.terms.chainId)||!same(accounts?.[0],review.input.deployer)||getWallet()!==w)throw Error('Select the reviewed wallet and network, then reconnect.')
    return w
  }
  async function estimate(){
    const pre=await preflightController(reader,review,artifacts,{allowTest})
    const gas=(BigInt(pre.estimatedGas)*120n+99n)/100n
    const [price,l1]=await Promise.all([reader.send('eth_gasPrice',[]),review.terms.chainId===31337?0n:reader.call({to:'0x420000000000000000000000000000000000000F',data:oracle.encodeFunctionData('getL1FeeUpperBound',[getBytes(review.transaction.data).length+200])}).then(x=>oracle.decodeFunctionResult('getL1FeeUpperBound',x)[0])])
    return {gas:toQuantity(gas),estimatedFeeWei:String(gas*BigInt(price)+l1),block:pre.block}
  }
  async function prepare(){
    plan=null
    if(busy||state().pending||state().completed)throw Error('Resolve the existing deployment first.')
    await context();const fee=await estimate();await context()
    plan=Object.freeze({...fee,fingerprint,expiresAt:now()+300000})
    return plan
  }
  async function send(proposal){
    const run=async()=>{
      if(busy||state().pending||state().completed)throw Error('Resolve the existing deployment first.')
      if(!proposal||proposal!==plan||now()>proposal.expiresAt)throw Error('Review deployment again.')
      busy=true;let asked=false
      try{
        const w=await context(),fee=await estimate()
        if(BigInt(fee.estimatedFeeWei)>BigInt(proposal.estimatedFeeWei)*150n/100n)throw Error('Estimated fees increased. Review again.')
        if(await reader.getBalance(review.input.deployer)<BigInt(fee.estimatedFeeWei))throw Error('Not enough Base ETH for estimated fees.')
        if(await context()!==w||now()>proposal.expiresAt)throw Error('Wallet or review changed.')
        const tx={from:review.input.deployer,chainId:toQuantity(review.terms.chainId),nonce:toQuantity(BigInt(review.input.nonce)),value:'0x0',data:review.transaction.data,gas:fee.gas}
        if(direct7702)tx.type='0x2'
        if(state().pending||state().completed)throw Error('Another deployment is already saved.')
        const intent={tx,hash:null,at:now()}
        save({...empty(),pending:intent});asked=true;plan=null
        const id=await w.request({method:'eth_sendTransaction',params:[tx]})
        if(!hash.test(id))throw Error('No hash returned. Check MetaMask Activity; do not resend.')
        save({...empty(),pending:{...intent,hash:id}},true)
        return id
      }catch(e){if(asked&&Number(e.code)===4001)save(empty());throw e}
      finally{busy=false}
    }
    const locks=globalThis.navigator?.locks
    if(locks)return locks.request(key,{ifAvailable:true},lock=>{if(!lock)throw Error('Another tab is deploying.');return run()})
    if(typeof window!=='undefined')throw Error('A secure browser with transaction locking is required.')
    return run()
  }
  async function recover(id){
    const s=state();if(!s.pending)return s.completed
    id=id||s.pending.hash;if(!hash.test(id||''))throw Error('Paste the deployment hash from MetaMask Activity.')
    const [tx,receipt]=await Promise.all([reader.getTransaction(id),reader.getTransactionReceipt(id)])
    if(!tx||!receipt)return {status:'pending'}
    if(direct7702&&(tx.type!==2||tx.authorizationList?.length))throw Error('Receipt is not the reviewed direct type-2 deployment.')
    if(!same(tx.from,review.input.deployer)||tx.to||!same(tx.data,review.transaction.data)||tx.value!==0n||BigInt(tx.nonce)!==BigInt(review.input.nonce)||Number(tx.chainId)!==review.terms.chainId)throw Error('Receipt does not match this exact deployment.')
    if((await reader.getBlockNumber())-receipt.blockNumber+1<2)return {status:'confirming'}
    if(!same((await reader.getBlock(receipt.blockNumber)).hash,receipt.blockHash))return {status:'confirming'}
    if(receipt.status!==1){const result={status:'failed',hash:id};save({...s,pending:null,completed:result},true);return result}
    if(!same(receipt.contractAddress,review.controller))throw Error('Unexpected deployed address.')
    const verified=await inspectControllerDeployment(reader,review,artifacts,{allowTest})
    const result={status:'verified',hash:id,controller:review.controller,sale:review.sale,verification:verified}
    save({...s,pending:null,completed:result},true);return result
  }
  async function clearUnsent(checked){
    if(!checked||busy||state().pending?.hash||state().completed)throw Error('Cancel the request in MetaMask and check Activity first.')
    await context();await preflightController(reader,review,artifacts,{allowTest});save(empty());plan=null
  }
  return {state,prepare,send,recover,clearUnsent}
}
