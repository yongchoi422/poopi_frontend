// Disposable local containers only. Requires a running Linux Docker engine.
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, writeFile, unlink } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { randomBytes } from 'node:crypto'
import assert from 'node:assert/strict'
const localDocker=join(process.env.LOCALAPPDATA||'', 'Programs/DockerDesktop/resources/bin/docker.exe')
const docker=process.env.SOULI_DOCKER||(process.platform==='win32'&&existsSync(localDocker)?localDocker:'docker')
async function run(args,{visible=false,optional=false,timeout=600000}={}){
  return new Promise((resolve,reject)=>{
    const child=spawn(docker,args,{windowsHide:true,stdio:visible?'inherit':['ignore','pipe','pipe']})
    const timer=setTimeout(()=>{child.kill();reject(Error(`Docker ${args[0]} timed out.`))},timeout)
    let output='';child.stdout?.on('data',data=>output+=data);child.stderr?.on('data',()=>{})
    child.on('error',error=>{clearTimeout(timer);reject(error)})
    child.on('exit',code=>{clearTimeout(timer);code===0||optional?resolve({code,output:output.trim()}):reject(Error(`Docker ${args[0]} failed. Confirm the Linux engine is running.`))})
  })
}
try{await run(['info','--format','{{.ServerVersion}}'],{timeout:15000})}
catch{console.error('Docker Linux engine is not ready. Finish Windows WSL/Virtual Machine Platform setup, restart if requested, then start Docker Desktop. No test containers were created.');process.exit(1)}
const id=`souli-check-${randomBytes(6).toString('hex')}`,network=id,dbName=`${id}-db`,appName=`${id}-app`,image=`${id}:local`
await mkdir('logs',{recursive:true});const dir=await mkdtemp(resolve('logs','docker-check-'))
const password=randomBytes(24).toString('hex'),dbEnv=join(dir,'database.env'),appEnv=join(dir,'app.env')
await writeFile(dbEnv,`POSTGRES_USER=souli_test\nPOSTGRES_DB=souli_test_release\nPOSTGRES_PASSWORD=${password}\n`,{mode:0o600})
await writeFile(appEnv,`PUBLIC_ORIGIN=https://souli.test\nBETA_ALLOWLIST=0x0000000000000000000000000000000000000001\nSTORE_BACKEND=postgres\nDATABASE_URL=postgresql://souli_test:${password}@${dbName}:5432/souli_test_release\n`,{mode:0o600})
async function waitUntil(fn){for(let i=0;i<90;i++){if(await fn())return;await new Promise(resolve=>setTimeout(resolve,1000))}throw Error('Container readiness timed out')}
try{
  await run(['build','-f','Dockerfile','-t',image,'.'],{visible:true})
  await run(['network','create',network])
  await run(['run','-d','--name',dbName,'--network',network,'--env-file',dbEnv,'postgres:18-bookworm'])
  await waitUntil(async()=>(await run(['exec',dbName,'pg_isready','-U','souli_test','-d','souli_test_release'],{optional:true})).code===0)
  await run(['run','-d','--name',appName,'--network',network,'--env-file',appEnv,'-p','127.0.0.1::8080',image])
  const {output}=await run(['port',appName,'8080/tcp'])
  const base=`http://${output}`
  await waitUntil(async()=>{try{return (await fetch(base+'/api/health/ready',{signal:AbortSignal.timeout(1500)})).ok}catch{return false}})
  const response=await fetch(base+'/lighthouse.html',{method:'HEAD'})
  assert.equal(response.status,200);assert.ok(response.headers.get('content-security-policy'))
  assert.equal((await (await fetch(base+'/api/status')).json()).sales,false)
  await waitUntil(async()=>(await run(['inspect','--format','{{.State.Health.Status}}',appName])).output==='healthy')
  console.log('PASS: Docker image built, production app and PostgreSQL started, static HEAD/security headers/health verified. No cloud deployment or wallet transaction.')
}finally{
  // Remove only resources created for this invocation, never global prune.
  for(const name of [appName,dbName])await run(['rm','-f','-v',name],{optional:true}).catch(()=>{})
  await run(['network','rm',network],{optional:true}).catch(()=>{})
  await run(['image','rm',image],{optional:true}).catch(()=>{})
  await unlink(dbEnv);await unlink(appEnv)
}
