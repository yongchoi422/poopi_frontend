// Disposable test assets. No key, wallet, or RPC from the live Base network.
import { network } from 'hardhat'
import { JsonRpcProvider, ContractFactory, keccak256, toUtf8Bytes } from 'ethers'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
const artifacts=JSON.parse(readFileSync(new URL('../artifacts/contracts.json',import.meta.url))).contracts
const server=await network.createServer('default','127.0.0.1',18545);await server.listen()
const p=new JsonRpcProvider('http://127.0.0.1:18545',31337,{cacheTimeout:-1})
if((await p.getNetwork()).chainId!==31337n)throw Error('Local test network required')
const [owner,,treasury]=await p.listAccounts(),sent=async promise=>(await promise).wait()
const token=await new ContractFactory(artifacts.TestToken.abi,artifacts.TestToken.bytecode,owner).deploy();await token.waitForDeployment()
const now=(await p.getBlock('latest')).timestamp
const terms={version:1,chainId:31337,token:await token.getAddress(),treasury:await treasury.getAddress(),unitPriceWei:'1000000000000',saleCap:'10000000',walletCap:'5000000',startsAt:String(now-1),endsAt:String(now+86400),immediateDelivery:true,automaticLiquidity:false,refundable:false}
const termsHash=keccak256(toUtf8Bytes(JSON.stringify(terms)))
const sale=await new ContractFactory(artifacts.SouliEthSale.abi,artifacts.SouliEthSale.bytecode,owner).deploy(terms.token,await owner.getAddress(),terms.treasury,terms.unitPriceWei,terms.saleCap,terms.walletCap,terms.startsAt,terms.endsAt,termsHash);await sale.waitForDeployment()
await sent(token.approve(await sale.getAddress(),BigInt(terms.saleCap)*1000000000n));await sent(sale.deposit(terms.saleCap));await sent(sale.unpause())
const manifest={enabled:true,mode:'test',chainId:31337,address:await sale.getAddress(),terms,termsHash,runtimeCodeHash:keccak256(await p.getCode(await sale.getAddress()))}
const dir=new URL('../../logs/sale-demo/',import.meta.url);mkdirSync(dir,{recursive:true});writeFileSync(new URL('manifest.json',dir),JSON.stringify(manifest,null,2))
// Additional blocks allow the same confirmation UI to run without another tx.
const interval=setInterval(()=>p.send('evm_mine',[]).catch(()=>{}),3000)
console.log('LOCAL TEST ONLY. RPC: 127.0.0.1:18545. Open http://127.0.0.1:5173/purchase-lab.html after npm run dev. Test wallets have NO real assets.')
async function close(){clearInterval(interval);p.destroy();await server.close();process.exit(0)}
process.on('SIGINT',close);process.on('SIGTERM',close);await server.afterClosed()
