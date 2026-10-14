import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { network } from 'hardhat'
import { BrowserProvider, ContractFactory, toQuantity } from 'ethers'
import { createLab, requireSepolia, matchesRuntime, readTestShop, STOCK, UNIT, PRICE } from '../../src/testnet/lab.mjs'
let connection, provider, accounts, artifacts
before(async () => {
  artifacts = JSON.parse(readFileSync(new URL('../artifacts/contracts.json', import.meta.url))).contracts
  connection = await network.create('sepoliaLab'); provider = new BrowserProvider(connection.provider, undefined, { cacheTimeout: -1 })
  accounts = await connection.provider.request({ method: 'eth_accounts' })
  await connection.provider.request({ method: 'hardhat_setCode', params: ['0x420000000000000000000000000000000000000F', '0x600060005260206000f3'] })
})
after(async () => { provider?.destroy(); await connection?.close() })
const memory = () => { const map = new Map(); return { getItem: key => map.get(key) || null, setItem: (k, v) => map.set(k, v), removeItem: k => map.delete(k) } }
function wallet(address) { return { request: ({ method, params = [] }) => method === 'eth_accounts' ? Promise.resolve([address]) : connection.provider.request({ method, params }) } }
async function mined(lab, action) { await lab.send(action); await connection.provider.request({ method: 'evm_mine' }); assert.equal((await lab.recover()).status, 'confirmed') }

test('Sepolia lab refuses mainnet, account changes and non-test compiled code', async () => {
  let sends = 0
  const fake = { async request({ method }) { if (method === 'eth_chainId') return '0x2105'; if (method === 'eth_accounts') return [accounts[0]]; sends++; throw Error('No transaction allowed') } }
  await assert.rejects(requireSepolia(fake), /Sepolia only/)
  await assert.rejects(createLab(fake, artifacts, memory(), accounts[0]).send('token'), /Sepolia only/)
  assert.equal(sends, 0)
  await assert.rejects(requireSepolia(wallet(accounts[1]), accounts[0]), /Wallet changed/)
  assert.equal(matchesRuntime('0x00', artifacts.SepoliaTestSouli), false)
})
test('test token and sale constructor guards reject non-Sepolia chains', async () => {
  const local = await network.create('default'), p = new BrowserProvider(local.provider, undefined, { cacheTimeout: -1 })
  try {
    const signer = await p.getSigner()
    await assert.rejects(new ContractFactory(artifacts.SepoliaTestSouli.abi, artifacts.SepoliaTestSouli.bytecode, signer).deploy())
    const test = await new ContractFactory(artifacts.TestToken.abi, artifacts.TestToken.bytecode, signer).deploy(); await test.waitForDeployment()
    const stamp = (await p.getBlock('latest')).timestamp
    await assert.rejects(new ContractFactory(artifacts.SepoliaTestSale.abi, artifacts.SepoliaTestSale.bytecode, signer).deploy(await test.getAddress(), await signer.getAddress(), await signer.getAddress(), 1n, 10n, 10n, stamp, stamp + 3600, '0x' + '11'.repeat(32)))
  } finally { p.destroy(); await local.close() }
})
test('reloaded public-testnet workflow: deploy, deposit, purchase, pause, recover stock, refill and withdraw ETH', async () => {
  const store = memory(), owner = wallet(accounts[0])
  let lab = createLab(owner, artifacts, store, accounts[0])
  await lab.send('token')
  await assert.rejects(createLab(owner, artifacts, store, accounts[0]).send('token'), /earlier test/)
  const key = `souli-sepolia-lab-v1:${accounts[0].toLowerCase()}`
  const lostHash = JSON.parse(store.getItem(key)); lostHash.pending.hash = null; store.setItem(key, JSON.stringify(lostHash))
  lab = createLab(owner, artifacts, store, accounts[0])
  await connection.provider.request({ method: 'evm_mine' }); assert.equal((await lab.findDeployment()).status, 'confirmed')
  await mined(lab, 'sale'); await mined(lab, 'approve'); await mined(lab, 'deposit'); await mined(lab, 'start')
  const buyerStore = memory(), buyerLab = createLab(wallet(accounts[1]), artifacts, buyerStore, accounts[1])
  await buyerLab.loadSale(lab.state().sale)
  await assert.rejects(buyerLab.send('pause'), /owner wallet/)
  await assert.rejects(buyerLab.send('proceeds'), /treasury/)
  const buyer = await buyerLab.purchaseClient(), quote = await buyer.quote('210')
  await buyer.buy(quote); await connection.provider.request({ method: 'evm_mine' })
  const savedShop = buyerLab.state().sale
  await assert.rejects(buyerLab.loadSale(accounts[4]), /pending purchase/)
  assert.equal(buyerLab.state().sale, savedShop, 'A pending receipt cannot be stranded by selecting another shop')
  assert.equal((await buyer.checkReceipt()).status, 'success')
  assert.equal((await buyerLab.snapshot()).tokenBalance, 210n * UNIT)
  // Another tab can change admin history while this tab still holds old state.
  const buyerKey = `souli-sepolia-lab-v1:${accounts[1].toLowerCase()}`, saved = buyerStore.getItem(buyerKey)
  buyerStore.setItem(buyerKey, JSON.stringify({ ...JSON.parse(saved), pending: { action: 'pause' } }))
  await assert.rejects(buyerLab.loadSale(savedShop), /another tab/)
  buyerStore.setItem(buyerKey, saved)
  await assert.rejects(lab.send('withdraw'), /Pause/)
  await mined(lab, 'pause'); await mined(lab, 'withdraw')
  assert.equal((await lab.snapshot()).inventory, 0n)
  await mined(lab, 'approve'); await mined(lab, 'deposit'); await mined(lab, 'start')
  assert.equal((await lab.snapshot()).inventory, (STOCK - 210n) * UNIT)
  await mined(lab, 'proceeds'); assert.equal((await lab.snapshot()).saleEth, 0n)
  const publicView = await readTestShop({request: args => { assert.notEqual(args.method, 'eth_accounts'); return connection.provider.request(args) }}, artifacts, lab.state().sale)
  assert.equal(publicView.proceedsWei, 210n * PRICE, 'Cumulative sales survive a proceeds withdrawal')
  assert.equal(publicView.saleEth, 0n, 'Current contract balance is separately reported')
  assert.equal(publicView.sold, 210n)
  assert.equal(publicView.inventory, (STOCK - 210n) * UNIT)
  assert.ok(lab.state().receipts.every(x => x.status === 'confirmed'))
})
test('wallet rejection clears only the unsent request; ambiguous errors block another deployment', async () => {
  for (const code of [4001, -32000]) {
    const store = memory(), base = wallet(accounts[2]), rejecting = { request: args => args.method === 'eth_sendTransaction' ? Promise.reject(Object.assign(Error('wallet test'), { code })) : base.request(args) }
    const lab = createLab(rejecting, artifacts, store, accounts[2])
    await assert.rejects(lab.send('token'))
    assert.equal(!!lab.state().pending, code !== 4001)
    if (code !== 4001) await assert.rejects(lab.send('token'), /earlier test/)
  }
})

test('numeric wallet nonce is normalized before sending and still supports receipt recovery', async () => {
  const base = wallet(accounts[3]), store = memory()
  const injected = { async request(args) {
    if (args.method === 'eth_getTransactionCount') return Number(BigInt(await base.request(args)))
    if (args.method === 'eth_sendTransaction') {
      for (const field of ['nonce', 'gas', 'value', 'chainId']) {
        assert.equal(typeof args.params[0][field], 'string', `${field} must be a JSON-RPC hex string`)
        assert.match(args.params[0][field], /^0x(?:0|[1-9a-f][0-9a-f]*)$/)
      }
    }
    return base.request(args)
  } }
  const lab = createLab(injected, artifacts, store, accounts[3])
  await mined(lab, 'token')
  assert.ok(lab.state().token)
  await mined(lab, 'sale')
  assert.ok(lab.state().sale)
})

test('relayed admin actions require exact contract events; a substituted event cannot clear the request', async () => {
  const base=wallet(accounts[4]), store=memory()
  let relay=false, corrupt=false
  const injected={async request(args){
    const result=await base.request(args)
    if(relay&&args.method==='eth_getTransactionByHash'&&result)return {...result,from:accounts[5],to:accounts[5],input:'0x12345678',value:'0x0'}
    if(corrupt&&args.method==='eth_getTransactionReceipt'&&result)return {...result,logs:result.logs.map(l=>({...l,address:accounts[5]}))}
    return result
  }}
  const lab=createLab(injected,artifacts,store,accounts[4])
  await mined(lab,'token');await mined(lab,'sale');relay=true
  await lab.send('approve');await connection.provider.request({method:'evm_mine'});corrupt=true
  await assert.rejects(lab.recover(),/expected test action is missing/)
  assert.ok(lab.state().pending)
  corrupt=false;assert.equal((await lab.recover()).status,'confirmed')
  await mined(lab,'deposit');await mined(lab,'start');await mined(lab,'pause');await mined(lab,'withdraw')
  assert.equal((await lab.snapshot()).inventory,0n)
  assert.ok(lab.state().receipts.slice(2).every(r=>r.execution==='smart-account'))
})

test('public RPC handles reads while signatures and account checks stay in the wallet', async () => {
  const base=wallet(accounts[6]), signed=[], reads=[]
  const injected={request:args=>{assert.ok(['eth_accounts','eth_chainId','eth_sendTransaction'].includes(args.method));signed.push(args.method);return base.request(args)}}
  const reader={request:args=>{assert.ok(!['eth_accounts','eth_sendTransaction'].includes(args.method));reads.push(args.method);return base.request(args)}}
  const lab=createLab(injected,artifacts,memory(),accounts[6],{readProvider:reader})
  await mined(lab,'token');await mined(lab,'sale');await lab.snapshot()
  assert.equal(signed.filter(m=>m==='eth_sendTransaction').length,2)
  assert.ok(reads.includes('eth_call')&&reads.includes('eth_getCode'))
})
