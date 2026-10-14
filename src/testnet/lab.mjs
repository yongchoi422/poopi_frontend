import { ContractFactory, Interface, getAddress, getCreateAddress, isAddress, keccak256, toUtf8Bytes, toQuantity } from 'ethers'
import { createNativeSaleClient } from '../lighthouse/native-sale.mjs'

export const CHAIN = 84532
export const NETWORK = Object.freeze({ chainId: '0x14a34', chainName: 'Base Sepolia', nativeCurrency: { name: 'Test Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: ['https://sepolia.base.org'], blockExplorerUrls: ['https://sepolia.basescan.org'] })
export const STOCK = 5_000_000n, PRICE = 100_000_000n, UNIT = 1_000_000_000n
const eq = (a, b) => String(a).toLowerCase() === String(b).toLowerCase()
const hashPattern = /^0x[0-9a-f]{64}$/i
const zero = /^0x0{40}$/i

export function matchesRuntime(actual, artifact) {
  if (typeof actual !== 'string' || actual.length !== artifact.runtime.length) return false
  let a = actual.slice(2).toLowerCase(), b = artifact.runtime.slice(2).toLowerCase()
  for (const refs of Object.values(artifact.immutableReferences || {})) for (const { start, length } of refs) {
    const mask = '0'.repeat(length * 2)
    a = a.slice(0, start * 2) + mask + a.slice((start + length) * 2)
    b = b.slice(0, start * 2) + mask + b.slice((start + length) * 2)
  }
  return a === b
}

export async function requireSepolia(provider, expectedAccount) {
  if (!provider?.request) throw Error('Connect your test wallet first.')
  const [chain, accounts] = await Promise.all([provider.request({ method: 'eth_chainId' }), provider.request({ method: 'eth_accounts' })])
  if (typeof chain !== 'string' || !/^0x[\da-f]+$/i.test(chain) || BigInt(chain) !== BigInt(CHAIN)) throw Error('Base Sepolia only. Select Base Sepolia in MetaMask and reconnect.')
  if (!isAddress(accounts?.[0])) throw Error('Connect your test wallet first.')
  if (expectedAccount && !eq(accounts[0], expectedAccount)) throw Error('Wallet changed. Reconnect before continuing.')
  return getAddress(accounts[0])
}

export async function readTestShop(provider, artifacts, address) {
    const raw = (method, params = []) => provider.request({ method, params })
    if (BigInt(await raw('eth_chainId')) !== BigInt(CHAIN)) throw Error('Base Sepolia only.')
    const tokenArt = artifacts.SepoliaTestSouli
    const si = new Interface(artifacts.SepoliaTestSale.abi), ti = new Interface(tokenArt.abi)
    const call = async (to, iface, method, args = [], block = 'latest') => iface.decodeFunctionResult(method, await raw('eth_call', [{ to, data: iface.encodeFunctionData(method, args) }, block]))[0]
    if (!isAddress(address) || zero.test(address)) throw Error('Deploy a test sale first.')
    const block = await raw('eth_blockNumber')
    const code = await raw('eth_getCode', [address, block])
    if (![artifacts.SepoliaTestSale, artifacts.SouliEthSale].filter(Boolean).some(art=>matchesRuntime(code,art))) throw Error('This address is not the compiled test sale.')
    const names = ['souli', 'owner', 'treasury', 'unitPriceWei', 'saleCap', 'walletCap', 'startsAt', 'endsAt', 'termsHash', 'VERSION', 'paused', 'available', 'sold', 'proceedsWei']
    const v = Object.fromEntries(await Promise.all(names.map(async name => [name, await call(address, si, name, [], block)])))
    if (!matchesRuntime(await raw('eth_getCode', [v.souli, block]), tokenArt)) throw Error('Wrong test token code.')
    if (await call(v.souli, ti, 'decimals', [], block) !== 9n) throw Error('Wrong test token units.')
    if (v.VERSION !== 1n || v.unitPriceWei !== PRICE || v.saleCap !== STOCK || v.walletCap !== STOCK) throw Error('Unexpected test sale limits or price.')
    const terms = { version: 1, chainId: CHAIN, token: getAddress(v.souli), treasury: getAddress(v.treasury), unitPriceWei: String(v.unitPriceWei), saleCap: String(v.saleCap), walletCap: String(v.walletCap), startsAt: String(v.startsAt), endsAt: String(v.endsAt), immediateDelivery: true, automaticLiquidity: false, refundable: false }
    if (keccak256(toUtf8Bytes(JSON.stringify(terms))) !== v.termsHash) throw Error('Test sale terms do not match.')
    const [inventory, balance, stamp] = await Promise.all([call(v.souli, ti, 'balanceOf', [address], block), raw('eth_getBalance', [address, block]), raw('eth_getBlockByNumber', [block, false])])
    return { ...v, inventory, saleEth: BigInt(balance), block: Number(BigInt(block)), chainTime: Number(BigInt(stamp.timestamp)), manifest: { enabled: true, mode: 'test', chainId: CHAIN, address: getAddress(address), runtimeCodeHash: keccak256(code), terms, termsHash: v.termsHash } }
  }

export function createLab(provider, artifacts, storage, account, { readProvider } = {}) {
  // Keep account selection and every signature in the injected wallet, but
  // avoid exhausting its RPC quota with public dashboard reads.
  if (readProvider) {
    const walletProvider = provider
    const readMethods = new Set(['eth_getCode','eth_getBalance','eth_call','eth_estimateGas','eth_blockNumber','eth_getBlockByNumber','eth_getTransactionCount','eth_getTransactionByHash','eth_getTransactionReceipt','eth_getLogs','eth_gasPrice'])
    provider = { request: args => (readMethods.has(args.method) ? readProvider : walletProvider).request(args) }
  }
  account = getAddress(account)
  const key = `souli-sepolia-lab-v1:${account.toLowerCase()}`
  const tokenArt = artifacts.SepoliaTestSouli, saleArt = artifacts.SepoliaTestSale
  const ti = new Interface(tokenArt.abi), si = new Interface(saleArt.abi)
  let state = { token: '', sale: '', pending: null, receipts: [] }, busy = false
  try { const saved = storage.getItem(key); if (saved) state = JSON.parse(saved) } catch { throw Error('Test history could not be read. Enable site storage before continuing.') }
  if (!state || !Array.isArray(state.receipts)) throw Error('Test history needs manual review.')
  const raw = (method, params = []) => provider.request({ method, params })
  const context = () => requireSepolia(provider, account)
  function save() {
    const value = JSON.stringify(state)
    storage.setItem(key, value)
    if (storage.getItem(key) !== value) throw Error('Could not save test transaction recovery. No new request is allowed.')
  }
  async function call(address, iface, name, args = [], block = 'latest') {
    return iface.decodeFunctionResult(name, await raw('eth_call', [{ to: address, data: iface.encodeFunctionData(name, args) }, block]))[0]
  }
  async function verifyToken(address) {
    if (!isAddress(address) || zero.test(address)) throw Error('Deploy a test token first.')
    if (!matchesRuntime(await raw('eth_getCode', [address, 'latest']), tokenArt)) throw Error('This is not the compiled Sepolia test token.')
    if (await call(address, ti, 'decimals') !== 9n) throw Error('Unexpected test-token units.')
  }
  async function inspectSale(address) {
    await context()
    return readTestShop(provider, artifacts, address)
  }
  async function snapshot() {
    await context()
    const result = { account, eth: BigInt(await raw('eth_getBalance', [account, 'latest'])), tokenBalance: 0n, inventory: 0n, allowance: 0n, saleEth: 0n }
    if (state.token) {
      await verifyToken(state.token)
      result.tokenBalance = await call(state.token, ti, 'balanceOf', [account])
    }
    if (state.sale) {
      result.sale = await inspectSale(state.sale)
      result.inventory = result.sale.inventory
      result.allowance = await call(result.sale.souli, ti, 'allowance', [account, state.sale])
      result.saleEth = result.sale.saleEth
    }
    await context()
    return result
  }
  async function loadSale(address) {
    function checkSwitch() {
      if (busy || state.pending) throw Error('Resolve the pending test transaction first.')
      const saved = storage.getItem(key)
      if (saved && JSON.stringify(JSON.parse(saved)) !== JSON.stringify(state)) throw Error('Test history changed in another tab. Reconnect before switching shops.')
      // Purchase recovery is scoped to the sale, separately from admin history.
      // Never strand a pending payment when selecting another shop.
      if (state.sale && !eq(state.sale, address) && storage.getItem(`souli-purchase-v1:${CHAIN}:${state.sale.toLowerCase()}`)) throw Error('Resolve the pending purchase in this shop before switching.')
    }
    checkSwitch()
    const verified = await inspectSale(address)
    checkSwitch()
    state.sale = getAddress(address); state.token = getAddress(verified.souli); save()
    return verified
  }
  async function prepare(action) {
    await context()
    if (action === 'token') {
      if (state.token) throw Error('A test token is already saved.')
      return { data: (await new ContractFactory(tokenArt.abi, tokenArt.bytecode).getDeployTransaction()).data }
    }
    await verifyToken(state.token)
    if (action === 'sale') {
      if (state.sale) throw Error('A test sale is already saved.')
      const block = await raw('eth_getBlockByNumber', ['latest', false]), start = BigInt(block.timestamp)
      const terms = { version: 1, chainId: CHAIN, token: getAddress(state.token), treasury: account, unitPriceWei: String(PRICE), saleCap: String(STOCK), walletCap: String(STOCK), startsAt: String(start), endsAt: String(start + 14n * 86400n), immediateDelivery: true, automaticLiquidity: false, refundable: false }
      const termsHash = keccak256(toUtf8Bytes(JSON.stringify(terms)))
      return { data: (await new ContractFactory(saleArt.abi, saleArt.bytecode).getDeployTransaction(state.token, account, account, PRICE, STOCK, STOCK, terms.startsAt, terms.endsAt, termsHash)).data }
    }
    const verified = await inspectSale(state.sale)
    if (!eq(state.token, verified.souli)) throw Error('Saved token differs from sale inventory.')
    if (action === 'proceeds') {
      if (!eq(verified.treasury, account)) throw Error('Only the test treasury wallet can withdraw test ETH.')
      return { to: state.sale, data: si.encodeFunctionData('withdrawProceeds') }
    }
    if (!eq(verified.owner, account)) throw Error('Switch to the test sale owner wallet for this action.')
    const inventory = await call(state.token, ti, 'balanceOf', [state.sale])
    // Refill only to the remaining sale cap. Never ask for unlimited approval.
    const remaining = STOCK - verified.sold - inventory / UNIT
    const amount = remaining > 0n ? remaining : 0n
    if (action === 'approve' || action === 'deposit') {
      if (!amount) throw Error('The remaining sale inventory is already funded.')
      return action === 'approve' ? { to: state.token, data: ti.encodeFunctionData('approve', [state.sale, amount * UNIT]) } : { to: state.sale, data: si.encodeFunctionData('deposit', [amount]) }
    }
    if (action === 'withdraw') {
      if (!verified.paused) throw Error('Pause the test sale before withdrawing unsold tokens.')
      return { to: state.sale, data: si.encodeFunctionData('withdrawInventory', [inventory / UNIT]) }
    }
    if (!['start', 'pause'].includes(action)) throw Error('Unknown test action.')
    return { to: state.sale, data: si.encodeFunctionData(action === 'start' ? 'unpause' : 'pause') }
  }
  async function send(action) {
    const locks = globalThis.navigator?.locks
    if (locks) return locks.request(key, { ifAvailable: true }, lock => {
      if (!lock) throw Error('Another tab is already requesting a test transaction.')
      return sendLocked(action)
    })
    if (typeof window !== 'undefined') throw Error('Use a browser with secure transaction recovery support.')
    return sendLocked(action)
  }
  async function sendLocked(action) {
    // A second tab must see the persisted intent before submitting anything.
    const saved = storage.getItem(key)
    if (saved) state = JSON.parse(saved)
    if (busy || state.pending) throw Error('Check the earlier test transaction before sending another.')
    busy = true
    let asked = false
    try {
      const tx = { ...(await prepare(action)), from: account, chainId: NETWORK.chainId, value: '0x0' }
      tx.gas = toQuantity((BigInt(await raw('eth_estimateGas', [tx])) * 120n + 99n) / 100n)
      // Some injected wallets return a number for this RPC. Transaction fields
      // still need canonical hex strings (MetaMask rejects a numeric nonce).
      tx.nonce = toQuantity(BigInt(await raw('eth_getTransactionCount', [account, 'pending'])))
      const requestedBlock = Number(BigInt(await raw('eth_blockNumber')))
      await context()
      state.pending = { action, tx, requestedAt: Date.now(), requestedBlock, hash: null }; save()
      asked = true
      const hash = await raw('eth_sendTransaction', [tx])
      if (!hashPattern.test(hash)) throw Error('Wallet returned no hash. Check wallet activity before retrying.')
      state.pending.hash = hash; save()
      return hash
    } catch (error) {
      if (!asked || Number(error.code) === 4001) { state.pending = null; save() }
      throw error
    } finally { busy = false }
  }
  async function recover(alternateHash) {
    await context()
    const pending = state.pending
    if (!pending) return null
    const hash = alternateHash || pending.hash
    if (!hashPattern.test(hash || '')) throw Error('Find the transaction hash in MetaMask Activity and paste it here.')
    const [tx, receipt] = await Promise.all([raw('eth_getTransactionByHash', [hash]), raw('eth_getTransactionReceipt', [hash])])
    if (!tx || !receipt) return { status: 'pending', hash }
    const exact = eq(tx.from, account) && eq(tx.to || '', pending.tx.to || '') && eq(tx.input || tx.data, pending.tx.data) && BigInt(tx.value) === 0n
    // Smart-account wallets may return a relayer's outer transaction hash.
    // Only the hash returned by the wallet is eligible; arbitrary pasted
    // relayer hashes cannot be used to clear a pending request.
    const relayed = !exact && pending.hash && eq(pending.hash, hash) && !['token', 'sale'].includes(pending.action)
    if (!eq(tx.from, account) && !relayed) throw Error('This transaction belongs to another wallet.')
    if (pending.hash && !eq(pending.hash, hash)) {
      const original = await raw('eth_getTransactionByHash', [pending.hash])
      if (BigInt(tx.nonce) !== BigInt(original?.nonce ?? pending.tx.nonce)) throw Error('Use a replacement with the same wallet nonce.')
    } else if (!exact && !relayed) throw Error('This transaction does not match the requested test action.')
    const height = BigInt(await raw('eth_blockNumber'))
    if (height - BigInt(receipt.blockNumber) + 1n < 2n) return { status: 'confirming', hash }
    const block = await raw('eth_getBlockByNumber', [receipt.blockNumber, false])
    if (!eq(block.hash, receipt.blockHash)) return { status: 'pending', hash }
    const succeeded = BigInt(receipt.status) === 1n
    if (relayed && succeeded) {
      if (!testActionEffect(receipt, pending, state.token, state.sale, account)) throw Error('Smart transaction confirmed, but the expected test action is missing. Keep this receipt for review.')
      await inspectSale(state.sale)
    }
    const success = (exact || relayed) && succeeded
    if (success && pending.action === 'token') { await verifyToken(receipt.contractAddress); state.token = getAddress(receipt.contractAddress) }
    if (success && pending.action === 'sale') { await inspectSale(receipt.contractAddress); state.sale = getAddress(receipt.contractAddress) }
    const result = { action: pending.action, hash, status: !exact && !relayed ? 'replaced' : success ? 'confirmed' : 'failed', ...(relayed ? { execution: 'smart-account' } : {}), at: new Date().toISOString() }
    state.receipts = [...state.receipts.slice(-29), result]; state.pending = null; save()
    return result
  }
  function clearUnsent() {
    if (busy || state.pending?.hash) throw Error('A submitted transaction must be checked on-chain.')
    state.pending = null; save()
  }
  async function findDeployment() {
    await context()
    const p = state.pending
    if (!p || !['token', 'sale'].includes(p.action) || p.tx.nonce === undefined) throw Error('Use the transaction hash to recover this action.')
    const address = getCreateAddress({from: account, nonce: BigInt(p.tx.nonce)})
    const code = await raw('eth_getCode', [address, 'latest'])
    if (code === '0x') throw Error('Deployment is not on-chain yet. Check the approval in MetaMask.')
    if (!matchesRuntime(code, p.action === 'token' ? tokenArt : saleArt)) throw Error('The deployed code differs from the requested test contract.')
    const latest = Number(BigInt(await raw('eth_blockNumber')))
    const first = p.requestedBlock ?? Math.max(0, latest - 5000)
    if (latest - first > 20000) throw Error('This request is old. Paste the deployment hash from MetaMask Activity.')
    // Deployment events let a reload recover an approved transaction without
    // reading wallet secrets or guessing success from the derived address.
    for (let from = first; from <= latest; from += 500) {
      const logs = await raw('eth_getLogs', [{address, fromBlock:toQuantity(from), toBlock:toQuantity(Math.min(from + 499, latest))}])
      for (const entry of logs) {
        const tx = await raw('eth_getTransactionByHash', [entry.transactionHash])
        if (tx && !tx.to && eq(tx.from, account) && eq(tx.input || tx.data, p.tx.data)) return recover(entry.transactionHash)
      }
    }
    throw Error('Deployment code found, but the original receipt was not found in this range. Paste its hash from MetaMask Activity.')
  }
  async function purchaseClient() {
    const { manifest } = await inspectSale(state.sale)
    return createNativeSaleClient(manifest, () => provider, { allowTest: true, storage, quoteTtlSeconds: 600 })
  }
  return { snapshot, send, recover, findDeployment, clearUnsent, loadSale, purchaseClient, state: () => JSON.parse(JSON.stringify(state)) }
}

export function testActionEffect(receipt, pending, token, sale, account) {
  const events = new Interface([
    'event Approval(address indexed owner,address indexed spender,uint256 value)',
    'event Transfer(address indexed from,address indexed to,uint256 value)',
    'event InventoryAdded(address indexed owner,uint256 tokenUnits)',
    'event InventoryRemoved(address indexed owner,uint256 tokenUnits)',
    'event Paused(address account)', 'event Unpaused(address account)',
    'event ProceedsWithdrawn(address indexed treasury,uint256 amountWei)',
    'function approve(address,uint256)', 'function deposit(uint256)',
    'function withdrawInventory(uint256)', 'function pause()', 'function unpause()', 'function withdrawProceeds()',
  ])
  const matches = (address, name, check) => (receipt.logs || []).some(log => {
    if (!eq(log.address, address)) return false
    try { const event = events.parseLog(log); return event?.name === name && check(event.args) } catch { return false }
  })
  try {
    const call = events.parseTransaction({data:pending.tx.data})
    if (pending.action === 'approve') return eq(pending.tx.to,token) && call?.name === 'approve' && eq(call.args[0],sale)
      && matches(token,'Approval',a=>eq(a.owner,account)&&eq(a.spender,sale)&&a.value===call.args[1])
    if (!eq(pending.tx.to,sale)) return false
    if (pending.action === 'deposit' || pending.action === 'withdraw') {
      const adding = pending.action === 'deposit'
      if (call?.name !== (adding ? 'deposit' : 'withdrawInventory')) return false
      const units = call.args[0] * UNIT
      return matches(sale,adding?'InventoryAdded':'InventoryRemoved',a=>eq(a.owner,account)&&a.tokenUnits===units)
        && matches(token,'Transfer',a=>eq(a.from,adding?account:sale)&&eq(a.to,adding?sale:account)&&a.value===units)
    }
    if (pending.action === 'pause' || pending.action === 'start') return call?.name === (pending.action==='pause'?'pause':'unpause')
      && matches(sale,pending.action==='pause'?'Paused':'Unpaused',a=>eq(a.account,account))
    if (pending.action === 'proceeds') return call?.name === 'withdrawProceeds'
      && matches(sale,'ProceedsWithdrawn',a=>eq(a.treasury,account)&&a.amountWei>0n)
  } catch { return false }
  return false
}
