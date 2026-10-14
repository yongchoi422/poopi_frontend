import { ContractFactory, Interface, getAddress, getCreateAddress, isAddress, keccak256, toUtf8Bytes, toQuantity } from 'ethers'
import { requireSepolia, matchesRuntime, readTestShop, NETWORK, CHAIN, STOCK, PRICE, UNIT } from './lab.mjs'
export const OPERATORS = Object.freeze(['0x4a4AA86208EcFdBACBaD551dF7baf5D3C84425BB','0x3cDF38407cE65966055aDDF8bfC5B17eF00397e1','0x9Bf15CD7Cc82655fAe3803663Ba1c6D5ED07D607'])
export const TEST_TOKEN = '0xD643520BfEb76e59250d56Df8B196F9c751Bc252'
const same=(a,b)=>String(a).toLowerCase()===String(b).toLowerCase()
const hash=/^0x[0-9a-f]{64}$/i
export async function readController(reader,artifacts,address,{operators=OPERATORS,token=TEST_TOKEN}={}) {
  if(!isAddress(address))throw Error('Enter a controller address.')
  const raw=(method,params=[])=>reader.request({method,params})
  if(BigInt(await raw('eth_chainId'))!==BigInt(CHAIN))throw Error('Base Sepolia only.')
  const block=await raw('eth_blockNumber'),art=artifacts.SepoliaThreeWalletController,ci=new Interface(art.abi)
  const code=await raw('eth_getCode',[address,block])
  if(!matchesRuntime(code,art))throw Error('This is not the compiled Base Sepolia controller.')
  const call=async(name,args=[])=>ci.decodeFunctionResult(name,await raw('eth_call',[{to:address,data:ci.encodeFunctionData(name,args)},block]))[0]
  const actual=await Promise.all([0,1,2].map(i=>call('operators',[i])))
  if(actual.some((a,i)=>!same(a,operators[i]))||!same(await call('token'),token))throw Error('Controller token or registered wallets differ from this test plan.')
  const sale=await readTestShop(reader,artifacts,await call('sale'))
  if(!same(sale.owner,address)||!same(sale.treasury,address)||!same(sale.souli,token))throw Error('Sale is not controlled by this contract.')
  return {address:getAddress(address),operators:actual,sale,block:Number(BigInt(block))}
}

export function createControllerLab(wallet,reader,artifacts,storage,account,{operators=OPERATORS,token=TEST_TOKEN}={}) {
  account=getAddress(account)
  const key=`souli-three-wallet-v1:${account.toLowerCase()}`
  const ci=new Interface(artifacts.SepoliaThreeWalletController.abi),ti=new Interface(artifacts.SepoliaTestSouli.abi)
  const raw=(method,params=[])=>reader.request({method,params})
  const context=()=>requireSepolia(wallet,account)
  let busy=false
  const state=()=>{const text=storage.getItem(key);return text?JSON.parse(text):{controller:'',pending:null,receipts:[]}}
  function save(value){const text=JSON.stringify(value);storage.setItem(key,text);if(storage.getItem(key)!==text)throw Error('Transaction recovery could not be stored.')}
  async function load(address){await context();if(state().pending)throw Error('Resolve the pending request first.');const view=await readController(reader,artifacts,address,{operators,token});save({...state(),controller:view.address});return view}
  async function send(action,quantity='210') {
    const run=async()=>{
      if(busy||state().pending)throw Error('Resolve the earlier wallet request first.')
      busy=true;let asked=false
      try{
        await context()
        if(!operators.some(a=>same(a,account)))throw Error('Only a registered operator can perform this action.')
        if(!matchesRuntime(await raw('eth_getCode',[token,'latest']),artifacts.SepoliaTestSouli))throw Error('Wrong test-token code.')
        let tx,expectedController=''
        const nonce=toQuantity(BigInt(await raw('eth_getTransactionCount',[account,'pending'])))
        if(action==='deploy'){
          if(state().controller)throw Error('A controller is already saved. Load that deployment first.')
          const start=BigInt((await raw('eth_getBlockByNumber',['latest',false])).timestamp)
          expectedController=getCreateAddress({from:account,nonce:BigInt(nonce)})
          const terms={version:1,chainId:CHAIN,token:getAddress(token),treasury:expectedController,unitPriceWei:String(PRICE),saleCap:String(STOCK),walletCap:String(STOCK),startsAt:String(start),endsAt:String(start+14n*86400n),immediateDelivery:true,automaticLiquidity:false,refundable:false}
          const deploy=await new ContractFactory(artifacts.SepoliaThreeWalletController.abi,artifacts.SepoliaThreeWalletController.bytecode).getDeployTransaction(token,operators,PRICE,STOCK,STOCK,terms.startsAt,terms.endsAt,keccak256(toUtf8Bytes(JSON.stringify(terms))))
          tx={data:deploy.data}
        }else{
          const view=await readController(reader,artifacts,state().controller,{operators,token})
          const names={pause:'pauseSale',start:'startSale',withdraw:'recoverInventory',proceeds:'collectProceeds',deposit:'depositStock',held:'recoverHeldTokens'}
          if(!['approve',...Object.keys(names)].includes(action))throw Error('Unknown controller action.')
          if(['approve','deposit','withdraw'].includes(action)&&(!/^[1-9]\d{0,7}$/.test(quantity)||BigInt(quantity)>STOCK))throw Error('Enter a whole quantity between 1 and 5,000,000.')
          const q=['approve','deposit','withdraw'].includes(action)?BigInt(quantity):null
          if(action==='withdraw'&&!view.sale.paused)throw Error('Pause this sale before withdrawing stock.')
          if(['approve','deposit'].includes(action)&&q>view.sale.saleCap-view.sale.sold-view.sale.inventory/UNIT)throw Error('Amount exceeds the remaining unfunded inventory.')
          tx=action==='approve'?{to:token,data:ti.encodeFunctionData('approve',[view.address,q*UNIT])}:{to:view.address,data:ci.encodeFunctionData(names[action],q===null?[]:[q])}
        }
        tx={...tx,from:account,chainId:NETWORK.chainId,value:'0x0',nonce}
        tx.gas=toQuantity((BigInt(await raw('eth_estimateGas',[tx]))*120n+99n)/100n)
        await context()
        save({...state(),pending:{action,tx,expectedController,hash:null,at:Date.now()}});asked=true
        const id=await wallet.request({method:'eth_sendTransaction',params:[tx]})
        if(!hash.test(id))throw Error('No transaction hash returned. Check MetaMask Activity before retrying.')
        const s=state();s.pending.hash=id;save(s);return id
      }catch(e){if(!asked||Number(e.code)===4001)save({...state(),pending:null});throw e}finally{busy=false}
    }
    const locks=globalThis.navigator?.locks
    if(locks)return locks.request(key,{ifAvailable:true},lock=>{if(!lock)throw Error('Another tab is requesting a transaction.');return run()})
    if(typeof window!=='undefined')throw Error('A secure browser with transaction recovery support is required.')
    return run()
  }
  async function recover(id){
    await context();const s=state(),p=s.pending;if(!p)return null
    id=id||p.hash;if(!hash.test(id||''))throw Error('Paste the transaction hash from MetaMask Activity.')
    const [tx,r]=await Promise.all([raw('eth_getTransactionByHash',[id]),raw('eth_getTransactionReceipt',[id])])
    if(!tx||!r)return {status:'pending'}
    const exact=same(tx.from,account)&&same(tx.to||'',p.tx.to||'')&&same(tx.input||tx.data,p.tx.data)&&BigInt(tx.value)===0n&&BigInt(tx.nonce)===BigInt(p.tx.nonce)
    // MetaMask smart transactions can return a relayer's outer transaction.
    // Accept only the wallet-returned hash and prove the requested inner effect.
    // A pasted, unrelated relayer hash must never clear a pending request.
    const relayed=!exact&&p.action!=='deploy'&&!!p.hash&&same(id,p.hash)
    if(!exact&&!relayed)throw Error('Receipt does not match this exact request. Keep it for review; do not send again.')
    const height=BigInt(await raw('eth_blockNumber'))
    if(height-BigInt(r.blockNumber)+1n<2n)return {status:'confirming'}
    if(!same((await raw('eth_getBlockByNumber',[r.blockNumber,false])).hash,r.blockHash))return {status:'pending'}
    const ok=BigInt(r.status)===1n
    if(relayed&&ok){
      const view=await readController(reader,artifacts,s.controller,{operators,token})
      if(!controllerActionEffect(r,p,artifacts,token,view.address,view.sale.manifest.address,account))throw Error('Smart transaction confirmed, but its expected action is missing. Keep this receipt for review; do not send again.')
    }
    if(ok&&p.action==='deploy'){
      if(!same(r.contractAddress,p.expectedController))throw Error('Unexpected controller address.')
      const view=await readController(reader,artifacts,r.contractAddress,{operators,token});s.controller=view.address
    }
    const result={action:p.action,status:ok?'confirmed':'failed',hash:id,...(relayed?{execution:'smart-account'}:{})}
    s.receipts=[...s.receipts.slice(-19),result];s.pending=null;save(s);return result
  }
  function clearUnsent(){if(busy||state().pending?.hash)throw Error('Verify a submitted transaction first.');save({...state(),pending:null})}
  return {state,load,send,recover,clearUnsent}
}

export function controllerActionEffect(receipt,pending,artifacts,token,controller,sale,account){
  const ci=new Interface(artifacts.SepoliaThreeWalletController.abi),ti=new Interface(artifacts.SepoliaTestSouli.abi),si=new Interface(artifacts.SouliEthSale.abi)
  const event=(address,iface,name,check)=>(receipt.logs||[]).some(log=>{
    if(log.removed||!same(log.address,address))return false
    try{const decoded=iface.parseLog(log);return decoded?.name===name&&check(decoded.args)}catch{return false}
  })
  try{
    if(BigInt(pending.tx.value||0)!==0n)return false
    if(pending.action==='approve'){
      const call=ti.parseTransaction({data:pending.tx.data})
      return same(pending.tx.to,token)&&call?.name==='approve'&&same(call.args[0],controller)&&event(token,ti,'Approval',a=>same(a.owner,account)&&same(a.spender,controller)&&a.value===call.args[1])
    }
    if(!same(pending.tx.to,controller))return false
    const call=ci.parseTransaction({data:pending.tx.data})
    const names={deposit:'depositStock',withdraw:'recoverInventory',proceeds:'collectProceeds',held:'recoverHeldTokens',pause:'pauseSale',start:'startSale'}
    if(call?.name!==names[pending.action])return false
    const operator=a=>same(a.operator,account)
    if(pending.action==='deposit')return event(controller,ci,'StockFunded',a=>operator(a)&&a.wholeSouli===call.args[0])
    if(pending.action==='withdraw')return event(controller,ci,'StockRecovered',a=>operator(a)&&a.tokenUnits===call.args[0]*UNIT)
    if(pending.action==='proceeds')return event(controller,ci,'EtherCollected',a=>operator(a)&&a.amountWei>0n)
    if(pending.action==='held')return event(controller,ci,'HeldTokensRecovered',a=>operator(a)&&a.tokenUnits>0n)
    if(pending.action==='pause'||pending.action==='start')return event(sale,si,pending.action==='pause'?'Paused':'Unpaused',a=>same(a.account,controller))
    return false
  }catch{return false}
}
