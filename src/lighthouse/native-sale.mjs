import { Interface, getAddress, isAddress, keccak256, toUtf8Bytes, toQuantity, formatEther } from 'ethers'
import { SALE_ABI, TOKEN_ABI } from './sale-config.mjs'
import { hasSaleEnded, saleQuoteDeadline } from './sale-window.mjs'
const saleInterface=new Interface(SALE_ABI), tokenInterface=new Interface(TOKEN_ABI)
const oracleInterface=new Interface(['function getL1FeeUpperBound(uint256) view returns(uint256)'])
const transferInterface=new Interface(['event Transfer(address indexed from,address indexed to,uint256 value)'])
const TOKEN='0xb43eA104c7ec75038Ac8EcA57107Eefc8B039aFF'
const HASH=/^0x[a-fA-F0-9]{64}$/
const same=(a,b)=>String(a).toLowerCase()===String(b).toLowerCase()
const fail=(message,code='SALE_CHECK_FAILED')=>{const error=new Error(message);error.code=code;throw error}
export const formatEth=value=>formatEther(BigInt(value))
export function parseWholeSouli(value){
  const text=String(value).trim()
  if(!/^[1-9]\d{0,14}$/.test(text))fail('Enter a whole number of SOULI, at least 1.')
  return BigInt(text)
}
export function validateSaleConfig(input,{allowTest=false}={}){
  if(!input?.enabled)return null
  const c=JSON.parse(JSON.stringify(input)), t=c.terms
  if(!t||!Number.isSafeInteger(c.chainId)||![8453,84532,31337].includes(c.chainId)
    ||(c.chainId===8453?c.mode!=='live':!allowTest||c.mode!=='test'))fail('This sale network is not enabled.')
  for(const address of [c.address,t.token,t.treasury])if(!isAddress(address)||/^0x0{40}$/i.test(address))fail('Sale configuration is incomplete.')
  if(c.chainId===8453&&!same(t.token,TOKEN))fail('Wrong SOULI token in sale configuration.')
  if(!HASH.test(c.runtimeCodeHash)||!HASH.test(c.termsHash)||keccak256(toUtf8Bytes(JSON.stringify(t)))!==c.termsHash)fail('Sale verification does not match the published terms.')
  if(![1,2].includes(t.version)||t.chainId!==c.chainId||t.immediateDelivery!==true||t.automaticLiquidity!==false||t.refundable!==false)fail('Unsupported sale terms.')
  for(const key of ['unitPriceWei','saleCap','walletCap','startsAt','endsAt'])if(!/^\d+$/.test(String(t[key])))fail('Invalid sale terms.')
  const noDeadline=t.version===2&&BigInt(t.endsAt)===0n
  if(BigInt(t.unitPriceWei)<=0n||BigInt(t.saleCap)<=0n||BigInt(t.walletCap)<=0n||BigInt(t.walletCap)>BigInt(t.saleCap)||(!noDeadline&&BigInt(t.endsAt)<=BigInt(t.startsAt)))fail('Invalid sale limits.')
  if(t.version===2&&(t.endPolicy!==(noDeadline?'sellout':'dated')||t.useOfProceeds?.lpBps!==5000||t.useOfProceeds?.operationsBps!==5000||t.useOfProceeds?.enforcedOnChain!==false))fail('Unsupported V2 funding or end policy.')
  const max=(1n<<256n)-1n
  if(BigInt(t.unitPriceWei)*BigInt(t.saleCap)>max||BigInt(t.saleCap)*1000000000n>max||[t.startsAt,t.endsAt].some(v=>BigInt(v)>8640000000000n))fail('Sale limits exceed supported units.')
  if(t.useOfProceeds)Object.freeze(t.useOfProceeds)
  Object.freeze(t);return Object.freeze(c)
}

const READ_METHODS=new Set(['eth_blockNumber','eth_getCode','eth_getBlockByNumber','eth_getBalance','eth_call','eth_estimateGas','eth_gasPrice','eth_getTransactionByHash','eth_getTransactionReceipt'])
export function createNativeSaleClient(input,getProvider,{allowTest=false,storage=null,now=()=>Date.now(),quoteTtlSeconds=120,reader=null}={}){
  if(!Number.isInteger(quoteTtlSeconds)||quoteTtlSeconds<30||quoteTtlSeconds>600)fail('Invalid quote approval window.')
  const config=validateSaleConfig(input,{allowTest})
  let prepared=null,sending=false,memoryPending=null
  const key=config?`souli-purchase-v1:${config.chainId}:${config.address.toLowerCase()}`:''
  function wallet(){const p=getProvider();if(!p?.request)fail('Connect your wallet first.');return p}
  async function request(p,method,params=[]){return (reader&&READ_METHODS.has(method)?reader:p).request({method,params})}
  async function context(p){
    if(!config)fail('Purchases are not open yet.')
    const [chain,accounts,readChain]=await Promise.all([request(p,'eth_chainId'),request(p,'eth_accounts'),reader?.request({method:'eth_chainId'})])
    if(reader&&BigInt(readChain)!==BigInt(config.chainId))fail('Wrong verification network. Purchase blocked.')
    if(BigInt(chain)!==BigInt(config.chainId))fail(config.chainId===8453?'Switch your wallet to Base.':'Select the test network shown here.','WRONG_CHAIN')
    if(!accounts?.[0]||!isAddress(accounts[0]))fail('Connect your wallet first.')
    return getAddress(accounts[0])
  }
  async function call(p,address,iface,name,args=[],block='latest'){
    const data=await request(p,'eth_call',[{to:address,data:iface.encodeFunctionData(name,args)},block])
    return iface.decodeFunctionResult(name,data)
  }
  function savePending(value,{broadcast=false}={}){
    if(!storage)fail('Purchase recovery storage is unavailable. Enable site storage before buying.')
    try{storage.setItem(key,JSON.stringify(value));if(storage.getItem(key)!==JSON.stringify(value))throw Error();memoryPending=null}
    catch{
      if(broadcast){memoryPending={...value,storageWarning:true};return}
      fail('Purchase recovery could not be saved. No new purchase was requested.')
    }
  }
  function pending(){
    if(memoryPending)return memoryPending
    if(!config||!storage)return null
    try{const raw=storage.getItem(key);if(!raw)return null;const v=JSON.parse(raw);
      if(!isAddress(v.account)||! /^[1-9]\d{0,14}$/.test(v.quantity)||!/^\d+$/.test(v.cost)
        ||BigInt(v.cost)!==BigInt(v.quantity)*BigInt(config.terms.unitPriceWei)
        ||!Number.isSafeInteger(v.deadline)||v.deadline<0||!Number.isSafeInteger(v.createdAt)
        ||!['wallet','pending','unknown'].includes(v.status)||(v.hash&&!HASH.test(v.hash))
        ||(v.originalHash&&!HASH.test(v.originalHash))
        ||(v.nonce!==undefined&&!/^0x[0-9a-f]+$/i.test(v.nonce))
        ||!same(v.data,saleInterface.encodeFunctionData('buy',[v.quantity,v.deadline])))return {status:'unknown',corrupt:true};return v
    }catch{return {status:'unknown',corrupt:true}}
  }
  function clearPending(){storage?.removeItem(key);memoryPending=null}
  async function read(){
    const p=wallet(),account=await context(p)
    const block=await request(p,'eth_blockNumber')
    const [code,chainBlock,balance,version,token,treasury,price,cap,walletCap,start,end,termsHash,paused,available,purchased,owner]=await Promise.all([
      request(p,'eth_getCode',[config.address,block]),request(p,'eth_getBlockByNumber',[block,false]),request(p,'eth_getBalance',[account,block]),
      ...['VERSION','souli','treasury','unitPriceWei','saleCap','walletCap','startsAt','endsAt','termsHash','paused','available'].map(n=>call(p,config.address,saleInterface,n,[],block)),
      call(p,config.address,saleInterface,'purchased',[account],block),call(p,config.address,saleInterface,'owner',[],block)
    ])
    if(code==='0x'||keccak256(code)!==config.runtimeCodeHash)fail('Sale code could not be verified. Purchases are blocked.')
    const t=config.terms
    if(version[0]!==BigInt(t.version)||!same(token[0],t.token)||!same(treasury[0],t.treasury)||termsHash[0]!==config.termsHash
       ||price[0]!==BigInt(t.unitPriceWei)||cap[0]!==BigInt(t.saleCap)||walletCap[0]!==BigInt(t.walletCap)||start[0]!==BigInt(t.startsAt)||end[0]!==BigInt(t.endsAt))fail('On-chain sale terms do not match this app.')
    const decimals=await call(p,t.token,tokenInterface,'decimals',[],block)
    if(decimals[0]!==9n)fail('Unexpected SOULI token units.')
    const stamp=Number(BigInt(chainBlock.timestamp)),local=Math.floor(now()/1000)
    if(config.chainId!==31337&&Math.abs(local-stamp)>120)fail('Base data is too old. Refresh before buying.')
    if(!same(await context(p),account)||p!==wallet())fail('Wallet changed. Review a new quote.')
    return {account,block,chainTime:stamp,balanceWei:BigInt(balance),unitPriceWei:price[0],available:available[0],walletRemaining:walletCap[0]-purchased[0],owner:owner[0],paused:paused[0],startsAt:Number(start[0]),endsAt:Number(end[0]),open:!paused[0]&&stamp>=Number(start[0])&&!hasSaleEnded(end[0],stamp)&&available[0]>0n}
  }
  async function estimate(p,tx){
    const [gas,gasPrice,l1]=await Promise.all([request(p,'eth_estimateGas',[tx]),request(p,'eth_gasPrice'),
      config.chainId===31337?0n:call(p,'0x420000000000000000000000000000000000000F',oracleInterface,'getL1FeeUpperBound',[1024]).then(x=>x[0])])
    const gasLimit=(BigInt(gas)*120n+99n)/100n
    return {gas:toQuantity(gasLimit),fee:gasLimit*BigInt(gasPrice)+BigInt(l1)}
  }
  async function quote(quantity){
    prepared=null;if(pending())fail('Check your earlier wallet request before buying again.')
    const q=parseWholeSouli(quantity),s=await read(),p=wallet()
    if(!s.open)fail(s.paused?'This sale is paused.':s.available===0n?'No SOULI stock is available right now.':'This sale is not open.')
    if(q>s.available)fail('There is not enough SOULI left for this amount.')
    if(q>s.walletRemaining)fail('This amount exceeds your remaining wallet limit.')
    const cost=q*s.unitPriceWei,deadline=saleQuoteDeadline(s.chainTime,s.endsAt,quoteTtlSeconds)
    const tx={from:s.account,to:config.address,value:toQuantity(cost),data:saleInterface.encodeFunctionData('buy',[q,deadline])}
    const estimateResult=await estimate(p,tx)
    if(s.balanceWei<cost+estimateResult.fee)fail('Not enough ETH for the purchase and estimated network fee.')
    if(!same(await context(p),s.account)||p!==wallet())fail('Wallet changed. Review a new quote.')
    const issuedAt=now()
    prepared=Object.freeze({account:s.account,quantity:q.toString(),cost:cost.toString(),deadline,issuedAt,validUntil:Math.min(issuedAt+quoteTtlSeconds*1000,config.chainId===31337?Infinity:deadline*1000),feeWei:estimateResult.fee.toString(),gas:estimateResult.gas,data:tx.data})
    return prepared
  }
  async function buy(q){
    // Hold a browser-wide lock through the wallet request. A different tab must
    // not pass the pending check before the first tab has recorded its intent.
    const locks=globalThis.navigator?.locks
    if(locks)return locks.request(key,{ifAvailable:true},lock=>{
      if(!lock)fail('A purchase is already being requested in another tab.')
      return buyLocked(q)
    })
    if(typeof window!=='undefined')fail('Use a browser with secure purchase recovery support.')
    return buyLocked(q)
  }
  async function buyLocked(q){
    if(sending)fail('A wallet request is already open.')
    if(q!==prepared||!q||now()>q.validUntil)fail('This quote expired. Review the amount again.')
    if(pending())fail('Check your earlier wallet request before buying again.')
    sending=true
    let asked=false
    try{
      const p=wallet(),s=await read()
      if(!same(s.account,q.account)||!s.open||BigInt(q.quantity)>s.available||BigInt(q.quantity)>s.walletRemaining||s.chainTime>q.deadline)fail('The wallet or sale changed. Review a new quote.')
      const tx={from:q.account,to:config.address,chainId:toQuantity(config.chainId),value:toQuantity(BigInt(q.cost)),data:q.data}
      const est=await estimate(p,tx)
      if(s.balanceWei<BigInt(q.cost)+est.fee)fail('Not enough ETH for the purchase and network fee.')
      if(!same(await context(p),q.account)||p!==wallet()||now()>q.validUntil)fail('Wallet or quote changed. Review again.')
      if(pending())fail('Check your earlier wallet request before buying again.')
      const intent={status:'wallet',account:q.account,quantity:q.quantity,cost:q.cost,deadline:q.deadline,data:q.data,createdAt:now()}
      savePending(intent);asked=true;prepared=null
      const hash=await request(p,'eth_sendTransaction',[{...tx,gas:est.gas}])
      if(!HASH.test(hash))fail('Wallet did not return a transaction hash. Check your wallet before trying again.')
      // Persist the hash immediately, even if the user switched wallets during
      // the prompt. Recovery must never depend on the current selected account.
      savePending({...intent,status:'pending',hash},{broadcast:true})
      // Wallets can replace a pending transaction; some RPCs then forget its
      // hash. Remember its nonce when the node already knows the transaction.
      try{
        const tx=await request(p,'eth_getTransactionByHash',[hash])
        if(tx&&same(tx.from,q.account)&&same(tx.to,config.address)&&same(tx.input||tx.data,q.data)&&BigInt(tx.value)===BigInt(q.cost))
          savePending({...intent,status:'pending',hash,nonce:tx.nonce},{broadcast:true})
      }catch{/* The hash above remains sufficient to recover a normal receipt. */}
      return pending()
    }catch(e){
      if(asked&&Number(e.code)===4001){clearPending();fail('Purchase cancelled in your wallet.','USER_REJECTED')}
      if(asked){const v=pending();if(v&&!v.hash){try{savePending({...v,status:'unknown'})}catch{}}}
      throw e
    }finally{sending=false}
  }
  async function checkReceipt(alternateHash){
    const v=pending();if(!v)return null
    if(v.corrupt)fail('Saved purchase needs manual review. Check wallet activity before clearing it.')
    const p=wallet();await context(p)
    const hash=alternateHash||v.hash
    if(!HASH.test(hash||''))return {...v,status:'unknown'}
    const [receipt,tx]=await Promise.all([request(p,'eth_getTransactionReceipt',[hash]),request(p,'eth_getTransactionByHash',[hash])])
    if(!tx)return {...v,status:'pending',hash}
    // A pasted/replacement hash must come from the same buyer. Never trust a
    // hash, explorer link or local success flag as proof of token delivery.
    const originalHash=v.originalHash||v.hash
    const envelopeExact=same(tx.from,v.account)&&same(tx.to,config.address)&&BigInt(tx.value)===BigInt(v.cost)&&same(tx.input||tx.data,v.data)
    const relayed=!envelopeExact&&originalHash&&same(hash,originalHash)
    if(!same(tx.from,v.account)&&!relayed)fail('This transaction belongs to a different wallet.')
    if(originalHash&&!same(hash,originalHash)){
      const original=await request(p,'eth_getTransactionByHash',[originalHash])
      const nonce=original?.nonce??v.nonce
      if(nonce===undefined||BigInt(nonce)!==BigInt(tx.nonce))fail('Use a replacement transaction with the same wallet nonce.')
    }
    const exact=envelopeExact
    if(!exact&&!relayed&&(!originalHash||same(hash,originalHash)))fail('This is not the reviewed SOULI purchase.')
    if(alternateHash&&!same(hash,v.hash))savePending({...v,status:'pending',hash,originalHash},{broadcast:true})
    if(!receipt)return {...v,status:'pending',hash}
    const confirmations=Number(BigInt(await request(p,'eth_blockNumber'))-BigInt(receipt.blockNumber)+1n)
    if(confirmations<2)return {...v,status:'confirming',hash,confirmations}
    const canonical=await request(p,'eth_getBlockByNumber',[receipt.blockNumber,false])
    if(!same(canonical?.hash,receipt.blockHash))return {...v,status:'pending',hash}
    if(!exact&&!relayed){clearPending();return {...v,status:'replaced',hash}}
    if(BigInt(receipt.status)!==1n){clearPending();return {...v,status:'failed',hash}}
    const match=receipt.logs.some(log=>{
      if(!same(log.address,config.address))return false
      try{const e=saleInterface.parseLog(log);return e?.name==='Purchased'&&same(e.args.buyer,v.account)&&e.args.wholeSouli===BigInt(v.quantity)&&e.args.paidWei===BigInt(v.cost)}catch{return false}
    })
    if(!match)fail('Transaction confirmed, but the expected SOULI receipt is missing. Contact support before buying again.')
    if(relayed){
      const code=await request(p,'eth_getCode',[config.address,receipt.blockNumber])
      if(keccak256(code)!==config.runtimeCodeHash)fail('Smart purchase receipt comes from unexpected sale code.')
      const delivered=receipt.logs.some(log=>{
        if(!same(log.address,config.terms.token))return false
        try{const e=transferInterface.parseLog(log);return e?.name==='Transfer'&&same(e.args.from,config.address)&&same(e.args.to,v.account)&&e.args.value===BigInt(v.quantity)*1000000000n}catch{return false}
      })
      if(!delivered)fail('Smart purchase receipt is missing the matching token delivery. Keep it for review.')
    }
    clearPending();return {...v,status:'success',hash,confirmations,blockNumber:Number(BigInt(receipt.blockNumber))}
  }
  return {config,read,quote,buy,pending,checkReceipt,
    // Explicit user acknowledgement only, never automatic after an RPC error.
    clearUnknown(){const v=pending();if(v?.hash)fail('Check the submitted transaction before clearing it.');clearPending();prepared=null},
    invalidateQuote(){prepared=null},
  }
}
