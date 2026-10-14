// Optional Windows integration run. Install the isolated test runtime first:
// npm install --prefix logs/pg-runtime --no-audit --no-fund embedded-postgres@18.4.0-beta.17
// No Windows service, OS user, public listener, or production database is used.
import { mkdtemp, writeFile, unlink } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { createServer } from 'node:net'
import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import assert from 'node:assert/strict'
import { openStore } from '../server/store.mjs'
const { pg_ctl, initdb } = await import('../logs/pg-runtime/node_modules/@embedded-postgres/windows-x64/dist/index.js')
const directory = await mkdtemp(resolve('logs', 'pg-check-'))
const password = randomBytes(32).toString('hex'), passwordFile = join(directory, 'password.tmp')
const data = join(directory, 'data')
const port = await new Promise(resolve => { const server = createServer(); server.listen(0,'127.0.0.1',()=>{const p=server.address().port;server.close(()=>resolve(p))}) })
const url = `postgresql://postgres:${password}@127.0.0.1:${port}/souli_test_release`
const execute = (file,args) => new Promise((resolve,reject)=>{
  const child=spawn(file,args,{windowsHide:true,stdio:'ignore',timeout:60000})
  child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(Error(`PostgreSQL utility failed (${code}); inspect ${directory}`)))
})
let started=false, store
try {
  await writeFile(passwordFile,password,{mode:0o600})
  await execute(initdb,['-D',data,'-U','postgres','--auth=scram-sha-256',`--pwfile=${passwordFile}`,'--locale=C','--encoding=UTF8'])
  await unlink(passwordFile)
  await execute(pg_ctl,['-D',data,'-l',join(directory,'postgres.log'),'-o',`-p ${port} -h 127.0.0.1`,'-w','start']);started=true
  const {default:pg}=await import('../server/node_modules/pg/lib/index.js')
  const admin=new pg.Client({connectionString:url.replace('/souli_test_release','/postgres')})
  await admin.connect();await admin.query('CREATE DATABASE souli_test_release');await admin.end()
  console.log('Running API suite against an isolated PostgreSQL database.')
  const code=await new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,['--test','server/test/beta.test.mjs'],{stdio:'inherit',windowsHide:true,env:{...process.env,SOULI_TEST_DATABASE_URL:url}})
    child.on('error',reject);child.on('exit',resolve)
  })
  assert.equal(code,0,'PostgreSQL API suite failed')
  store=await openStore({databaseUrl:url});await store.init()
  await store.transaction(q=>q('INSERT INTO homes(address,state,village) VALUES($1,$2,$3)',['restart-check','{"memories":42}','test']))
  await store.close();store=null
  await execute(pg_ctl,['-D',data,'-w','stop','-m','fast']);started=false
  await execute(pg_ctl,['-D',data,'-l',join(directory,'postgres.log'),'-o',`-p ${port} -h 127.0.0.1`,'-w','start']);started=true
  store=await openStore({databaseUrl:url});await store.init()
  const [row]=await store.transaction(q=>q('SELECT state FROM homes WHERE address=$1',['restart-check']))
  assert.equal(JSON.parse(row.state).memories,42)
  console.log('PASS: PostgreSQL server stop/start preserves committed state. Test cluster will stop.')
} finally {
  await store?.close()
  if(started)await execute(pg_ctl,['-D',data,'-w','stop','-m','fast'])
  await unlink(passwordFile).catch(e=>{if(e.code!=='ENOENT')throw e})
}
