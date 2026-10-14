import {createState,valid} from './miniature-rules.mjs';
export async function openMiniatureStore(){
  const DB_NAME='souli-white-neighborhood-v1';
  const fresh=()=>createState(Date.now());
  const db=await new Promise((resolve,reject)=>{
    const request=indexedDB.open(DB_NAME,1);
    request.onupgradeneeded=()=>request.result.createObjectStore('saves');
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
    request.onblocked=()=>reject(Error('Another tab is holding an older save. Close it and reload.'));
  });
  db.onversionchange=()=>db.close();
  const read=()=>new Promise((resolve,reject)=>{
    const request=db.transaction('saves').objectStore('saves').get('home');
    request.onsuccess=()=>{const value=request.result;if(value&&!valid(value))reject(Error('This save needs recovery. It has not been replaced.'));else resolve(value||null);};
    request.onerror=()=>reject(request.error);
  });
  const update=(transform,expectedRevision)=>new Promise((resolve,reject)=>{
    const tx=db.transaction('saves','readwrite'),store=tx.objectStore('saves'),request=store.get('home');let next,error;
    request.onsuccess=()=>{
      try{
        const old=request.result||fresh();
        if(!valid(old))throw Error('This save needs recovery. It has not been replaced.');
        if(expectedRevision!==undefined&&old.revision!==expectedRevision)throw Error('Another tab changed this neighborhood. Reload to continue from its latest save.');
        next=transform(structuredClone(old));
        next.revision=old.revision+1;
        if(!valid(next))throw Error('Save validation failed. The previous save is intact.');
        store.put(next,'home');
      }catch(cause){error=cause;tx.abort();}
    };
    tx.oncomplete=()=>resolve(next);tx.onerror=()=>reject(error||tx.error);tx.onabort=()=>reject(error||tx.error||Error('Save interrupted'));
  });
  let state=await read();if(!state)state=await update(s=>s);
  return {state,read,update,close:()=>db.close()};
}
