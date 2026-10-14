// Read-only public renderer examples. No signer, wallet, transaction or product edits.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { Contract, JsonRpcProvider, FetchRequest } from 'ethers';
const out = new URL('./cast/', import.meta.url); mkdirSync(out,{recursive:true});
const abi = JSON.parse(readFileSync(new URL('../../../../src/assets/abis/token.json',import.meta.url),'utf8'));
const request = new FetchRequest('https://base-rpc.publicnode.com'); request.timeout=20000;
const provider=new JsonRpcProvider(request,8453,{staticNetwork:true});
const token='0xb43eA104c7ec75038Ac8EcA57107Eefc8B039aFF';
const contract=new Contract(token,abi,provider);
const seeds=[22301,151319,501337,2501351,22367,151389,501401,2501423,22441,151463,501487,2501511,22531,151553,501577,2501601,22621,151643,501667,2501693];
try {
  const block=await provider.getBlockNumber(); const cast=[];
  for(let i=0;i<seeds.length;i++){
    const id=String(i+21).padStart(2,'0'); const seed=seeds[i];
    const file=new URL(`soul-${id}.svg`,out);
    const svg=existsSync(file)?readFileSync(file,'utf8'):await contract.getSvg([seed,0],{blockTag:block});
    if(!svg.startsWith('<svg')||/<(?:script|image|foreignObject)|\bon\w+=/i.test(svg))throw Error('Unexpected renderer content');
    writeFileSync(file,svg);
    cast.push({id,seed:String(seed),extra:'0',svg:`soul-${id}.svg`,png:`soul-${id}.png`,source:'deployed renderer example; not a claimed holder asset'});
    console.log(`Saved soul ${id}, seed ${seed}`);
  }
  writeFileSync(new URL('cast-manifest-batch2.json',out),JSON.stringify({chainId:8453,contract:token,block,fetchedAt:new Date().toISOString(),cast},null,2));
}finally{provider.destroy()}

