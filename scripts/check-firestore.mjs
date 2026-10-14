// Local emulator only. No login, credentials, real project or cloud mutations.
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { open, readdir, access } from 'node:fs/promises'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'
const runtime=resolve('logs/firestore-runtime')
let java=process.env.SOULI_TEST_JAVA
if(!java){
  const [directory]=(await readdir(resolve(runtime,'java'))).filter(name=>name.startsWith('jdk-'))
  java=resolve(runtime,'java',directory,'bin',process.platform==='win32'?'java.exe':'java')
}
const jar=process.env.SOULI_TEST_FIRESTORE_JAR||resolve(runtime,'firestore.jar')
await access(java);await access(jar)
const listener=createServer();await new Promise(resolve=>listener.listen(0,'127.0.0.1',resolve))
const port=listener.address().port;await new Promise(resolve=>listener.close(resolve))
const log=await open(resolve(runtime,'emulator.log'),'w')
const emulator=spawn(java,['-jar',jar,'--host','127.0.0.1','--port',String(port),'--project_id','demo-souli-tests'],{windowsHide:true,stdio:['ignore',log.fd,log.fd]})
const stopped=new Promise(resolve=>emulator.once('exit',resolve))
let failed;emulator.on('error',error=>{failed=error})
try{
  let ready=false
  for(let i=0;i<120;i++){
    if(failed)throw failed
    if(emulator.exitCode!==null)throw Error('Firestore emulator exited; inspect logs/firestore-runtime/emulator.log')
    try{await fetch(`http://127.0.0.1:${port}/`,{signal:AbortSignal.timeout(500)});ready=true;break}catch{}
    await new Promise(resolve=>setTimeout(resolve,250))
  }
  assert.ok(ready,'Firestore emulator did not start')
  const env={...process.env,SOULI_TEST_FIRESTORE_HOST:`127.0.0.1:${port}`,FIRESTORE_EMULATOR_HOST:`127.0.0.1:${port}`,GOOGLE_CLOUD_PROJECT:'demo-souli-tests'}
  delete env.SOULI_TEST_DATABASE_URL;delete env.GOOGLE_APPLICATION_CREDENTIALS
  const test=spawn(process.execPath,['--test','server/test/beta.test.mjs','server/test/firestore.integration.mjs'],{windowsHide:true,stdio:'inherit',env})
  const status=await new Promise((resolve,reject)=>{test.on('error',reject);test.on('exit',resolve)})
  assert.equal(status,0,'Firestore integration failed')
  console.log('PASS: Firestore emulator wallet API, atomic deductions, session replay, shared events and client restart. Cloud IAM/index configuration still requires deployment verification.')
}finally{
  emulator.kill();await stopped;await log.close()
}
