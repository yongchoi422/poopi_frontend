import { createServer } from 'node:http'
import { randomBytes, createHash } from 'node:crypto'
import { readFile, stat } from 'node:fs/promises'
import { resolve, extname, sep } from 'node:path'
import { SiweMessage } from 'siwe'
import { getAddress } from 'ethers'
import { createSanctuary, advanceSanctuary, toggleSanctuary, buildHomeProject, HOME_PROJECTS } from '../src/lighthouse/sanctuary.mjs'
import { enableAutomation, advanceAutomatic } from '../src/lighthouse/sanctuary.mjs'
import { createMarketFeed } from './market.mjs'
import { createWorldWeather, CHECKPOINT_MS } from './world-weather.mjs'
import { repository } from './repository.mjs'

const token=()=>randomBytes(32).toString('hex')
const hash=value=>createHash('sha256').update(value).digest('hex')
const fail=(status,message)=>{const error=new Error(message);error.status=status;throw error}
const PROJECT={name:'The shared garden',supplies:320,glowstones:160}
const statement='Sign in to your SOULI beta home. This is not a transaction and grants no token spending permission.'

export function createBetaServer({store,readHolder,origin='http://127.0.0.1:5173',production=false,allowlist=[],now=()=>Date.now(),dist=null,marketFeed=null,onError=entry=>console.error(JSON.stringify(entry))}) {
  const base=new URL(origin)
  if(base.origin!==origin||!['http:','https:'].includes(base.protocol))throw Error('PUBLIC_ORIGIN must be a single origin without a path.')
  if(production&&(base.protocol!=='https:'||!allowlist.length))throw Error('Production beta requires HTTPS and BETA_ALLOWLIST.')
  const allowed=new Set(allowlist.map(a=>getAddress(a).toLowerCase()))
  const cookieName=production?'__Host-souli_session':'souli_session'
  const challengeCookieName=production?'__Host-souli_challenge':'souli_challenge'
  const readCookie=(req,name)=>(req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith(`${name}=`))?.slice(name.length+1)
  const challengeCookie=(id,age)=>`${challengeCookieName}=${id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${age}${production?'; Secure':''}`
  const cookie=(id,age)=>`${cookieName}=${id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${age}${production?'; Secure':''}`
  const limits=new Map()
  const db=repository(store)
  const weatherWorld=createWorldWeather({store,feed:marketFeed||createMarketFeed({now}),now})
  function rate(req,maximum=600,suffix='api'){
    const key=`${req.socket.remoteAddress}:${suffix}`, time=now(), bucket=limits.get(key)
    if(!bucket||bucket.until<time)limits.set(key,{until:time+60000,count:1})
    else if(++bucket.count>maximum)fail(429,'Too many requests. Please wait a minute.')
    if(limits.size>10000)for(const [id,b]of limits)if(b.until<time)limits.delete(id)
  }
  async function body(req){
    let size=0;const parts=[]
    for await(const chunk of req){size+=chunk.length;if(size>8192)fail(413,'Request is too large.');parts.push(chunk)}
    let data
    try{data=JSON.parse(Buffer.concat(parts).toString()||'{}')}catch{fail(400,'Invalid JSON.')}
    if(!data||typeof data!=='object'||Array.isArray(data))fail(400,'Send a JSON object.')
    return data
  }
  async function auth(req){
    const raw=readCookie(req,cookieName)
    if(!raw||!/^[a-f0-9]{64}$/.test(raw))fail(401,'Sign in to your beta home first.')
    const session=await db.run(tx=>tx.get('sessions',hash(raw)))
    if(!session||Number(session.expires)<=now())fail(401,'Your session has expired. Please sign in again.')
    if(allowed.size&&!allowed.has(session.address))fail(403,'This wallet is not on the private beta list.')
    return session
  }
  async function holder(address){
    let proof
    try{proof=await readHolder(address)}catch{fail(503,'Base could not be reached. Your saved home is safe. Please try again.')}
    if(!proof.eligible)fail(403,'A current SOULI holding is needed to settle. The free local world is still available.')
    return proof
  }
  async function world(address,action,input={}){
    const proof=await holder(address)
    const weather=await weatherWorld.refresh()
    const newVillageId=token().slice(0,12)
    return db.run(async tx=>{
      let row=await tx.get('homes',address)
      if(!row){
        let [village]=await tx.find('villages','members','<',32,1)
        if(!village)village={id:newVillageId,members:0,supplies:0,glowstones:0}
        const initial=createSanctuary(now())
        row={address,state:JSON.stringify(initial),village:village.id}
        await tx.put('homes',row)
        await tx.put('villages',{...village,members:village.members+1})
      }
      let village=await tx.get('villages',row.village)
      const town=await weatherWorld.town(tx,village)
      const home={...createSanctuary(now()),...JSON.parse(row.state)}
      if(home.automation){
        const watch=await tx.get('home_watch',address)
        advanceAutomatic(home,Math.min(now(),Number(watch?.until_at??home.lastAt)))
        if(!watch||Number(watch.until_at)<now())home.lastAt=now()
      }else advanceSanctuary(home,now())
      if(action==='auto')enableAutomation(home,now())
      if(action==='work'){
        if(home.automation)fail(409,'Your soul already helps automatically.')
        toggleSanctuary(home,now())
      }
      if(action==='build'){
        const projectId=input.projectId??'lantern'
        if(!HOME_PROJECTS.some(project=>project.id===projectId))fail(400,'Choose an available home project.')
        if(!buildHomeProject(home,projectId))fail(409,'Finish the earlier project and gather its materials first. Completed projects cannot be built twice.')
      }
      if(action==='contribute'){
        const supplies=Math.min(8,PROJECT.supplies-village.supplies), glowstones=Math.min(4,PROJECT.glowstones-village.glowstones)
        if(!supplies&&!glowstones)fail(409,'The shared garden is already complete.')
        if(home.supplies<supplies||home.glowstones<glowstones)fail(409,'Gather more supplies before helping the garden.')
        home.supplies-=supplies;home.glowstones-=glowstones
        village={...village,supplies:village.supplies+supplies,glowstones:village.glowstones+glowstones}
        await tx.put('villages',village)
        const previous=await tx.get('contributions',address)||{supplies:0,glowstones:0}
        await tx.put('contributions',{address,supplies:previous.supplies+supplies,glowstones:previous.glowstones+glowstones})
        home.journal.unshift({day:home.days,kind:'build',text:`You brought ${supplies} supplies and ${glowstones} glowstones to the shared garden.`});home.journal=home.journal.slice(0,12)
      }
      const shared=await weatherWorld.saveTown(tx,row.village,address,home,town)
      await tx.put('homes',{...row,state:JSON.stringify(home)})
      const contribution=await tx.get('contributions',address)
      return {address,home,serverTime:now(),checkpointMs:CHECKPOINT_MS,proof,...shared,market:weather.market,event:weather.event,project:{...PROJECT,...village,targetSupplies:PROJECT.supplies,targetGlowstones:PROJECT.glowstones,contribution:contribution||{supplies:0,glowstones:0}}}
    })
  }
  async function route(req,res,path){
    if(path==='/api/health/live'&&req.method==='GET')return {ok:true}
    if(path==='/api/health/ready'&&req.method==='GET'){
      try{await db.ready()}catch{fail(503,'Database is unavailable.')}
      return {ok:true,sales:false}
    }
    if(path==='/api/market'&&req.method==='GET')return weatherWorld.refresh({cached:true})
    if(path==='/api/status'&&req.method==='GET')return {mode:production?'private-beta':'local-development',walletAuth:'SIWE',chainId:8453,sales:false,sharedGarden:true,allowlistRequired:allowed.size>0}
    if(path==='/api/auth/challenge'&&req.method==='POST'){
      rate(req,20,'signin')
      const input=await body(req);let address
      try{address=getAddress(input.address)}catch{fail(400,'Enter a valid wallet address.')}
      if(allowed.size&&!allowed.has(address.toLowerCase()))fail(403,'This wallet is not on the private beta list.')
      const id=token(),issued=now(),expires=issued+5*60000
      const message=new SiweMessage({domain:base.host,address,statement,uri:origin,version:'1',chainId:8453,nonce:token().slice(0,24),issuedAt:new Date(issued).toISOString(),expirationTime:new Date(expires).toISOString()}).prepareMessage()
      await db.run(async tx=>{
        // Bounded cleanup for SQL installations; Firestore can also use TTL.
        for(const table of ['challenges','sessions'])for(const row of await tx.find(table,'expires','<',issued,8))await tx.remove(table,row.id)
        await tx.put('challenges',{id,message,expires})
      })
      res.setHeader('Set-Cookie',challengeCookie(id,300))
      return {id,message}
    }
    if(path==='/api/auth/verify'&&req.method==='POST'){
      const input=await body(req)
      if(typeof input.id!=='string'||typeof input.signature!=='string'||input.signature.length>1024)fail(400,'Invalid sign-in response.')
      if(!/^[a-f0-9]{64}$/.test(input.id)||readCookie(req,challengeCookieName)!==input.id)fail(401,'Sign in from the browser that requested the signature.')
      // Consume first: a challenge has one attempt, including invalid signatures.
      const challenge=await db.run(async tx=>{
        const row=await tx.get('challenges',input.id)
        if(row)await tx.remove('challenges',input.id)
        return row&&Number(row.expires)>now()?row:null
      })
      if(!challenge)fail(401,'Sign-in expired or was already used. Request a new signature.')
      const message=new SiweMessage(challenge.message)
      let verified
      try{verified=await message.verify({signature:input.signature,domain:base.host,nonce:message.nonce,time:new Date(now()).toISOString()})}catch{fail(401,'Signature could not be verified. Use a MetaMask EOA account for this beta.')}
      if(!verified.success||message.uri!==origin||message.chainId!==8453)fail(401,'Invalid sign-in scope.')
      const address=message.address.toLowerCase(),id=token()
      if(allowed.size&&!allowed.has(address))fail(403,'This wallet is not on the private beta list.')
      await db.run(tx=>tx.put('sessions',{id:hash(id),address,expires:now()+24*3600000}))
      res.setHeader('Set-Cookie',[cookie(id,86400),challengeCookie('',0)])
      return {address}
    }
    if(path==='/api/auth/session'&&req.method==='GET'){const session=await auth(req);return {address:session.address}}
    if(path==='/api/auth/logout'&&req.method==='POST'){
      const raw=readCookie(req,cookieName)
      if(raw)await db.run(tx=>tx.remove('sessions',hash(raw)))
      res.setHeader('Set-Cookie',cookie('',0));return {signedOut:true}
    }
    if(path==='/api/world'&&req.method==='GET'){const session=await auth(req);return world(session.address)}
    if(/^\/api\/world\/(work|build|contribute|auto)$/.test(path)&&req.method==='POST'){
      const session=await auth(req),input=await body(req)
      if(!input||typeof input!=='object'||Array.isArray(input))fail(400,'Invalid game action.')
      return world(session.address,path.split('/').at(-1),input)
    }
    fail(404,'This beta endpoint is not available.')
  }
  const server=createServer(async(req,res)=>{
    const requestId=token().slice(0,16)
    res.setHeader('X-Request-Id',requestId)
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin')
    res.setHeader('Cache-Control','no-store');res.setHeader('X-Frame-Options','DENY')
    res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()')
    if(production){
      res.setHeader('Strict-Transport-Security','max-age=31536000')
      res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://mainnet.base.org https://base-rpc.publicnode.com https://sepolia.base.org wss://mm-sdk-relay.api.cx.metamask.io; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'")
    }
    try{
      const path=new URL(req.url,'http://localhost').pathname
      if(!path.startsWith('/api/')){
        if(!dist||!['GET','HEAD'].includes(req.method))fail(404,'Not found.')
        let decoded
        try{decoded=decodeURIComponent(path==='/'?'index.html':path.slice(1))}catch{fail(400,'Invalid path.')}
        if(decoded.includes('\0'))fail(400,'Invalid path.')
        const root=resolve(dist),file=resolve(root,decoded)
        if(!file.startsWith(root+sep))fail(404,'Not found.')
        const info=await stat(file).catch(e=>{if(e.code==='ENOENT')fail(404,'Not found.');throw e})
        if(!info.isFile())fail(404,'Not found.')
        res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.ttf':'font/ttf'})[extname(file)]||'application/octet-stream')
        if(/^assets\/[\w.-]+-[\w-]+\.[\w]+$/.test(decoded))res.setHeader('Cache-Control','public, max-age=31536000, immutable')
        res.setHeader('Content-Length',info.size)
        res.end(req.method==='HEAD'?undefined:await readFile(file));return
      }
      rate(req)
      res.setHeader('Vary','Origin')
      if(req.headers['sec-fetch-site']==='cross-site'||(req.headers.origin&&req.headers.origin!==origin))fail(403,'This request must come from the SOULI app.')
      // The static site and API may use separate HTTPS hosts within souli.net.
      // Only the configured website may read credentialed responses; no wildcard.
      if(req.headers.origin===origin){
        res.setHeader('Access-Control-Allow-Origin',origin)
        res.setHeader('Access-Control-Allow-Credentials','true')
      }
      if(req.method==='OPTIONS'){
        const requested=(req.headers['access-control-request-headers']||'').toLowerCase().split(',').map(x=>x.trim()).filter(Boolean)
        if(req.headers.origin!==origin||!['GET','POST'].includes(req.headers['access-control-request-method'])||requested.some(x=>x!=='content-type'))fail(403,'This request must come from the SOULI app.')
        res.setHeader('Access-Control-Allow-Methods','GET, POST')
        res.setHeader('Access-Control-Allow-Headers','Content-Type')
        res.setHeader('Access-Control-Max-Age','600')
        res.statusCode=204;res.end();return
      }
      // Origin checks and strict host-only cookies still protect every write.
      if(req.method!=='GET'&&(req.headers.origin!==origin||!req.headers['content-type']?.startsWith('application/json')))fail(403,'This request must come from the SOULI app.')
      const result=await route(req,res,path)
      res.setHeader('Content-Type','application/json');res.end(JSON.stringify(result))
    }catch(e){
      if(!e.status)onError({event:'request_failed',requestId,method:req.method,error:e.name,code:e.code||'internal'})
      res.statusCode=e.status||500;if(e.status===429)res.setHeader('Retry-After','60')
      res.setHeader('Content-Type','application/json');res.end(JSON.stringify({error:e.status?e.message:'The beta service could not complete this request. Please try again.',requestId}))
    }
  })
  server.requestTimeout=15000;server.headersTimeout=10000
  // Explicit maintenance/test hook only. There is no background timer.
  server.tickWorld=()=>weatherWorld.refresh({cached:false})
  return server
}
