// Read-only public renderer examples. No signer, wallet, transaction or product edits.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { Contract, JsonRpcProvider, FetchRequest } from 'ethers';
const out = new URL('./cast/', import.meta.url); mkdirSync(out,{recursive:true});
const abi = JSON.parse(readFileSync(new URL('../../../../src/assets/abis/token.json',import.meta.url),'utf8'));
const request = new FetchRequest('https://base-rpc.publicnode.com'); request.timeout=20000;
const provider=new JsonRpcProvider(request,8453,{staticNetwork:true});
const token='0xb43eA104c7ec75038Ac8EcA57107Eefc8B039aFF';
const contract=new Contract(token,abi,provider);
const seeds=[42001, 170212, 620413, 2900614, 42765, 170976, 621177, 2901378, 43529, 171740, 621941, 2902142, 44293, 172504, 622705, 2902906, 45057, 173268, 623469, 2903670, 45821, 174032, 624233, 2904434, 46585, 174796, 624997, 2905198, 47349, 175560, 625761, 2905962, 48113, 176324, 626525, 2906726, 48877, 177088, 627289, 2907490];
try {
  const block=await provider.getBlockNumber(); const cast=[];
  for(let i=0;i<seeds.length;i++){
    const id=String(i+81).padStart(2,'0'); const seed=seeds[i];
    const file=new URL(`soul-${id}.svg`,out);
    const svg=existsSync(file)?readFileSync(file,'utf8'):await contract.getSvg([seed,0],{blockTag:block});
    if(!svg.startsWith('<svg')||/<(?:script|image|foreignObject)|\bon\w+=/i.test(svg))throw Error('Unexpected renderer content');
    writeFileSync(file,svg);
    cast.push({id,seed:String(seed),extra:'0',svg:`soul-${id}.svg`,png:`soul-${id}.png`,source:'deployed renderer example; not a claimed holder asset'});
    console.log(`Saved soul ${id}, seed ${seed}`);
  }
  writeFileSync(new URL('cast-manifest-batch4.json',out),JSON.stringify({chainId:8453,contract:token,block,fetchedAt:new Date().toISOString(),cast},null,2));
}finally{provider.destroy()}


