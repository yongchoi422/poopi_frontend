import { openStore } from './store.mjs'
import { createBetaServer } from './app.mjs'
import { createHolderReader } from './chain.mjs'
import { fileURLToPath } from 'node:url'
import { storeConfig } from './store-config.mjs'
const production=process.env.NODE_ENV==='production'
const origin=process.env.PUBLIC_ORIGIN||'http://127.0.0.1:5173'
const allowlist=(process.env.BETA_ALLOWLIST||'').split(',').map(a=>a.trim()).filter(Boolean)
const config=storeConfig()
// Validate public exposure settings before opening or initializing the database.
createBetaServer({store:null,readHolder:null,production,origin,allowlist})
const store=config.backend==='firestore'
  ? (await import('./firestore-store.mjs')).openFirestoreStore(config)
  : await openStore({databaseUrl:config.backend==='postgres'?config.databaseUrl:undefined,filename:process.env.SQLITE_PATH||fileURLToPath(new URL('./data/beta.sqlite',import.meta.url))})
await store.init()
const server=createBetaServer({store,readHolder:createHolderReader(process.env.BASE_RPC_URL),production,origin,allowlist,dist:production?fileURLToPath(new URL('../dist',import.meta.url)):null})
const port=Number(process.env.PORT||8787)
server.listen(port,process.env.HOST||'127.0.0.1',()=>console.log(`SOULI beta API listening on port ${port}; sales disabled.`))
let stopping=false
async function shutdown(){
  if(stopping)return;stopping=true
  const deadline=setTimeout(()=>{console.error('Shutdown deadline exceeded.');process.exit(1)},20000);deadline.unref()
  server.close(async()=>{try{await store.close();process.exit(0)}catch{console.error('Database shutdown failed.');process.exit(1)}})
}
process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown)
