const configuredOrigin=import.meta.env?.VITE_API_ORIGIN||''
if(configuredOrigin){
  const parsed=new URL(configuredOrigin)
  if(parsed.origin!==configuredOrigin||parsed.protocol!=='https:'||parsed.username||parsed.password)throw Error('Use a plain HTTPS origin for the saved-home service.')
}

export async function betaApi(path,body) {
  const response=await fetch(`${configuredOrigin}/api${path}`,{method:body===undefined?'GET':'POST',credentials:'include',headers:body===undefined?{}:{'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(30000)})
  let data
  try{data=await response.json()}catch{throw Error('The saved-home service is unavailable. Your local world still works.')}
  if(!response.ok){const error=new Error(data.error||'The saved-home service could not complete that request.');error.status=response.status;throw error}
  return data
}
