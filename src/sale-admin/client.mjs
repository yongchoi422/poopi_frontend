import { Interface, ZeroAddress, getAddress, isAddress, keccak256, toQuantity } from 'ethers'
import { validateSaleConfig, parseWholeSouli } from '../lighthouse/native-sale.mjs'
import { SALE_ABI, TOKEN_ABI } from '../lighthouse/sale-config.mjs'
import { CONTROLLER_ABI, BASE_TOKEN_HASH } from './config.mjs'
import { hasSaleEnded } from '../lighthouse/sale-window.mjs'

const ci = new Interface(CONTROLLER_ABI)
const si = new Interface([...SALE_ABI, 'function sold() view returns(uint256)', 'function proceedsWei() view returns(uint256)', 'event Paused(address account)', 'event Unpaused(address account)'])
const ti = new Interface([...TOKEN_ABI, 'function allowance(address,address) view returns(uint256)', 'function approve(address,uint256) returns(bool)', 'event Approval(address indexed owner,address indexed spender,uint256 value)'])
const oracle = new Interface(['function getL1FeeUpperBound(uint256) view returns(uint256)'])
const UNIT = 1000000000n, HASH = /^0x[\da-f]{64}$/i
const same = (a, b) => String(a).toLowerCase() === String(b).toLowerCase()
const fail = message => { throw Error(message) }
const validAddress = x => isAddress(x) && !same(x, ZeroAddress)
const rpc = (reader, method, params = []) => reader.request({ method, params })
const call = async (reader, to, iface, name, args, block) => iface.decodeFunctionResult(name, await rpc(reader, 'eth_call', [{ to, data: iface.encodeFunctionData(name, args) }, block]))[0]

export function validateAdminConfig(input, { allowTest = false } = {}) {
  if (!input?.enabled) return null
  const c = JSON.parse(JSON.stringify(input))
  c.sale = validateSaleConfig(c.sale, { allowTest })
  if (!c.sale || c.chainId !== c.sale.chainId || !validAddress(c.controller) || !same(c.controller, c.sale.terms.treasury)
    || same(c.controller, c.sale.address) || same(c.controller, c.sale.terms.token)) fail('Invalid controller configuration.')
  if (!HASH.test(c.controllerRuntimeCodeHash) || !HASH.test(c.tokenRuntimeCodeHash)) fail('Contract hashes are missing.')
  if (c.chainId === 8453 && c.tokenRuntimeCodeHash !== BASE_TOKEN_HASH) fail('Unexpected original SOULI code hash.')
  if (!Array.isArray(c.operators) || c.operators.length !== 3 || c.operators.some(a => !validAddress(a))
    || new Set(c.operators.map(a => a.toLowerCase())).size !== 3
    || c.operators.some(a => [c.controller, c.sale.address, c.sale.terms.token].some(b => same(a, b)))) fail('Invalid registered operators.')
  Object.freeze(c.operators)
  return Object.freeze(c)
}

export async function readAdminState(reader, input, { account = '', allowTest = false, now = () => Date.now() } = {}) {
  const config = validateAdminConfig(input, { allowTest })
  if (!config) fail('Mainnet management is not configured yet.')
  if (BigInt(await rpc(reader, 'eth_chainId')) !== BigInt(config.chainId)) fail('Wrong read network.')
  const block = await rpc(reader, 'eth_blockNumber'), { sale, controller } = config, token = sale.terms.token
  const [codes, stamp, operators, linkedToken, linkedSale, values, inventory, heldTokens, saleEth, controllerEth] = await Promise.all([
    Promise.all([controller, sale.address, token].map(a => rpc(reader, 'eth_getCode', [a, block]))),
    rpc(reader, 'eth_getBlockByNumber', [block, false]),
    Promise.all([0, 1, 2].map(i => call(reader, controller, ci, 'operators', [i], block))),
    call(reader, controller, ci, 'token', [], block), call(reader, controller, ci, 'sale', [], block),
    Promise.all(['VERSION', 'souli', 'owner', 'treasury', 'unitPriceWei', 'saleCap', 'walletCap', 'startsAt', 'endsAt', 'termsHash', 'paused', 'available', 'sold', 'proceedsWei'].map(n => call(reader, sale.address, si, n, [], block))),
    call(reader, token, ti, 'balanceOf', [sale.address], block), call(reader, token, ti, 'balanceOf', [controller], block),
    rpc(reader, 'eth_getBalance', [sale.address, block]), rpc(reader, 'eth_getBalance', [controller, block]),
  ])
  if (codes.some((code, i) => code === '0x' || keccak256(code) !== [config.controllerRuntimeCodeHash, sale.runtimeCodeHash, config.tokenRuntimeCodeHash][i])) fail('Contract code does not match the reviewed release.')
  if (operators.some((a, i) => !same(a, config.operators[i])) || !same(linkedToken, token) || !same(linkedSale, sale.address)) fail('Controller permissions or linked contracts changed.')
  const [version, actualToken, owner, treasury, price, cap, walletCap, start, end, termsHash, paused, available, sold, proceedsWei] = values
  const t = sale.terms
  if (version !== BigInt(t.version) || !same(actualToken, token) || !same(owner, controller) || !same(treasury, controller)
    || price !== BigInt(t.unitPriceWei) || cap !== BigInt(t.saleCap) || walletCap !== BigInt(t.walletCap)
    || start !== BigInt(t.startsAt) || end !== BigInt(t.endsAt) || termsHash !== sale.termsHash) fail('Sale terms differ from the reviewed release.')
  if (await call(reader, token, ti, 'decimals', [], block) !== 9n) fail('Unexpected token units.')
  const time = Number(BigInt(stamp.timestamp))
  if (config.chainId !== 31337 && Math.abs(Math.floor(now() / 1000) - time) > 120) fail('Network data is stale. Refresh before continuing.')
  if (sold > cap || proceedsWei !== sold * price) fail('Sales accounting does not reconcile.')
  const expectedAvailable = cap - sold < inventory / UNIT ? cap - sold : inventory / UNIT
  if (available !== expectedAvailable) fail('Sale inventory does not reconcile.')
  const hasAccount = validAddress(account)
  const [walletTokens, allowance] = hasAccount ? await Promise.all([
    call(reader, token, ti, 'balanceOf', [account], block), call(reader, token, ti, 'allowance', [account, controller], block),
  ]) : [0n, 0n]
  return { block: Number(BigInt(block)), time, paused, available, sold, proceedsWei, inventory, heldTokens,
    saleEth: BigInt(saleEth), controllerEth: BigInt(controllerEth), walletTokens, allowance,
    remainingToFund: cap > sold + inventory / UNIT ? cap - sold - inventory / UNIT : 0n,
    isOperator: hasAccount && operators.some(a => same(a, account)),
    status: hasSaleEnded(end,time) ? 'Ended' : sold === cap ? 'Sold out' : paused ? 'Paused' : time < Number(start) ? 'Scheduled' : available === 0n ? 'Out of stock' : 'Open' }
}

const methods = { deposit: 'depositStock', recover: 'recoverInventory', collect: 'collectProceeds', held: 'recoverHeldTokens', pause: 'pauseSale', start: 'startSale' }
function transaction(config, action, quantity) {
  const q = ['approve', 'deposit', 'recover'].includes(action) ? parseWholeSouli(quantity) : null
  if (q !== null && q > BigInt(config.sale.terms.saleCap)) fail('Amount exceeds this sale’s total limit.')
  if (action === 'approve' || action === 'revoke') return { to: config.sale.terms.token, data: ti.encodeFunctionData('approve', [config.controller, q === null ? 0n : q * UNIT]), value: '0x0' }
  if (!methods[action]) fail('Unknown management action.')
  return { to: config.controller, data: ci.encodeFunctionData(methods[action], q === null ? [] : [q]), value: '0x0' }
}
function validateAction(action, quantity, view, config) {
  if (!view.isOperator) fail('This wallet is not a registered operator.')
  const q = ['approve', 'deposit', 'recover'].includes(action) ? parseWholeSouli(quantity) : 0n
  if (['approve', 'deposit'].includes(action)) {
    if (q > view.remainingToFund) fail('Amount exceeds the remaining inventory to fund.')
    if (q * UNIT > view.walletTokens) fail('Your wallet does not hold this amount of SOULI.')
    if (action === 'deposit' && view.allowance < q * UNIT) fail('Approve this amount before depositing stock.')
  }
  if (action === 'recover' && (!view.paused || q * UNIT > view.inventory)) fail('Pause the sale and choose an amount within its unsold stock.')
  if (action === 'collect' && view.saleEth + view.controllerEth === 0n) fail('No ETH is available to collect.')
  if (action === 'held' && view.heldTokens === 0n) fail('No accidentally sent tokens are held here.')
  if (action === 'pause' && view.paused) fail('The sale is already paused.')
  if (action === 'start' && (!view.paused || view.available === 0n || hasSaleEnded(config.sale.terms.endsAt,view.time))) fail('This sale cannot be opened now.')
}

// Effects are verified even for direct transactions. Wallet-returned smart
// transaction envelopes additionally need the same operator/action evidence.
export function adminActionEffect(receipt, pending, config, account) {
  const event = (address, iface, name, check) => (receipt.logs || []).some(log => {
    if (log.removed || !same(log.address, address)) return false
    try { const e = iface.parseLog(log); return e?.name === name && check(e.args) } catch { return false }
  })
  const q = BigInt(pending.quantity || 0), operator = a => same(a.operator, account)
  if (['approve', 'revoke'].includes(pending.action)) return event(config.sale.terms.token, ti, 'Approval', a => same(a.owner, account) && same(a.spender, config.controller) && a.value === q * UNIT)
  if (pending.action === 'deposit') return event(config.controller, ci, 'StockFunded', a => operator(a) && a.wholeSouli === q)
  if (pending.action === 'recover') return event(config.controller, ci, 'StockRecovered', a => operator(a) && a.tokenUnits === q * UNIT)
  if (pending.action === 'collect') return event(config.controller, ci, 'EtherCollected', a => operator(a) && a.amountWei > 0n)
  if (pending.action === 'held') return event(config.controller, ci, 'HeldTokensRecovered', a => operator(a) && a.tokenUnits > 0n)
  if (['pause', 'start'].includes(pending.action)) return event(config.sale.address, si, pending.action === 'pause' ? 'Paused' : 'Unpaused', a => same(a.account, config.controller))
  return false
}

export function createAdminClient(input, getWallet, reader, storage, account, { allowTest = false, now = () => Date.now() } = {}) {
  const config = validateAdminConfig(input, { allowTest })
  if (!config) fail('Mainnet management is not configured yet.')
  account = getAddress(account)
  const key = `souli-admin-v1:${config.chainId}:${config.controller.toLowerCase()}:${account.toLowerCase()}`
  let busy = false, reviewed = null, memory = null
  function state() {
    if (memory) return memory
    try {
      const data = storage.getItem(key), s = data ? JSON.parse(data) : { pending: null, receipts: [] }
      if (!Array.isArray(s.receipts)) throw Error()
      const p = s.pending
      if (p) {
        const tx = transaction(config, p.action, p.quantity)
        if (!same(p.tx.from, account) || !same(p.tx.to, tx.to) || !same(p.tx.data, tx.data) || BigInt(p.tx.value) !== 0n
          || BigInt(p.tx.chainId) !== BigInt(config.chainId) || !/^0x[\da-f]+$/i.test(p.tx.nonce) || (p.hash && !HASH.test(p.hash))) throw Error()
      }
      return s
    } catch { fail('Saved management request needs manual review. Do not send another transaction.') }
  }
  function save(s, broadcast = false) {
    try { const text = JSON.stringify(s); storage.setItem(key, text); if (storage.getItem(key) !== text) throw Error(); memory = null }
    catch { if (broadcast) { memory = { ...s, storageWarning: true }; return } fail('Could not save transaction recovery. No new request was sent.') }
  }
  async function context() {
    const w = getWallet()
    if (!w?.request) fail('Connect your registered wallet first.')
    const [chain, accounts] = await Promise.all([rpc(w, 'eth_chainId'), rpc(w, 'eth_accounts')])
    if (BigInt(chain) !== BigInt(config.chainId)) fail('Select the displayed network in MetaMask.')
    if (!same(accounts?.[0], account) || w !== getWallet()) fail('Wallet changed. Connect again and review the action.')
    return w
  }
  const read = () => readAdminState(reader, config, { account, allowTest, now })
  async function estimate(tx) {
    const [gas, price, l1] = await Promise.all([rpc(reader, 'eth_estimateGas', [tx]), rpc(reader, 'eth_gasPrice'),
      config.chainId === 31337 ? 0n : call(reader, '0x420000000000000000000000000000000000000F', oracle, 'getL1FeeUpperBound', [1600], 'latest')])
    const gasLimit = (BigInt(gas) * 120n + 99n) / 100n
    return { gas: toQuantity(gasLimit), estimatedFeeWei: String(gasLimit * BigInt(price) + l1) }
  }
  async function review(action, quantity = '') {
    reviewed = null
    if (busy || state().pending) fail('Resolve the earlier request before continuing.')
    await context()
    const view = await read(); validateAction(action, quantity, view, config)
    const tx = { ...transaction(config, action, quantity), from: account, chainId: toQuantity(config.chainId) }
    const fee = await estimate(tx)
    await context()
    reviewed = Object.freeze({ action, quantity: ['approve', 'deposit', 'recover'].includes(action) ? String(parseWholeSouli(quantity)) : '',
      account, tx: Object.freeze(tx), ...fee, expiresAt: now() + 120000,
      collectableWei: action === 'collect' ? String(view.saleEth + view.controllerEth) : null,
      destination: ['approve', 'revoke', 'deposit'].includes(action) ? config.controller : ['recover', 'held', 'collect'].includes(action) ? account : config.sale.address })
    return reviewed
  }
  async function send(plan) {
    const run = async () => {
      if (busy || state().pending) fail('Resolve the earlier request before continuing.')
      if (!plan || plan !== reviewed || now() > plan.expiresAt) fail('Review this action again before signing.')
      busy = true; let asked = false, intent, savedState
      try {
        const wallet = await context(), view = await read()
        validateAction(plan.action, plan.quantity, view, config)
        const [latest, pending] = await Promise.all(['latest', 'pending'].map(tag => rpc(reader, 'eth_getTransactionCount', [account, tag])))
        if (BigInt(latest) !== BigInt(pending)) fail('Another wallet transaction is pending. Confirm it before continuing.')
        const tx = { ...plan.tx, nonce: toQuantity(BigInt(pending)) }, fee = await estimate(tx)
        tx.gas = fee.gas
        if (BigInt(await rpc(reader, 'eth_getBalance', [account, 'latest'])) < BigInt(fee.estimatedFeeWei)) fail('Not enough ETH for the estimated network fee.')
        if (await context() !== wallet || now() > plan.expiresAt) fail('Wallet or review changed. Review again.')
        if (state().pending) fail('Another request is already saved.')
        intent = { action: plan.action, quantity: plan.quantity, tx, hash: null, at: now() }
        savedState = state(); save({ ...savedState, pending: intent }); asked = true; reviewed = null
        const hash = await rpc(wallet, 'eth_sendTransaction', [tx])
        if (!HASH.test(hash)) fail('No transaction hash returned. Check MetaMask Activity before retrying.')
        save({ ...savedState, pending: { ...intent, hash } }, true)
        return hash
      } catch (error) {
        if (asked && Number(error.code) === 4001) save({ ...state(), pending: null })
        throw error
      } finally { busy = false }
    }
    if (globalThis.navigator?.locks) return navigator.locks.request(key, { ifAvailable: true }, lock => {
      if (!lock) fail('Another tab is requesting a management transaction.')
      return run()
    })
    if (typeof window !== 'undefined') fail('A secure browser with transaction recovery support is required.')
    return run()
  }
  async function recover(alternateHash = '') {
    const s = state(), p = s.pending
    if (!p) return null
    if (BigInt(await rpc(reader, 'eth_chainId')) !== BigInt(config.chainId)) fail('Wrong receipt network.')
    const id = alternateHash || p.hash
    if (!HASH.test(id || '')) fail('Paste the transaction hash from MetaMask Activity.')
    const [tx, r] = await Promise.all([rpc(reader, 'eth_getTransactionByHash', [id]), rpc(reader, 'eth_getTransactionReceipt', [id])])
    if (!tx || !r) return { status: 'pending' }
    const exact = same(tx.from, account) && same(tx.to, p.tx.to) && same(tx.input || tx.data, p.tx.data) && BigInt(tx.value) === 0n && BigInt(tx.nonce) === BigInt(p.tx.nonce)
    const cancelled = same(tx.from, account) && same(tx.to, account) && (tx.input || tx.data) === '0x' && BigInt(tx.value) === 0n && BigInt(tx.nonce) === BigInt(p.tx.nonce)
    const relayed = !exact && !cancelled && p.hash && same(p.hash, id)
    if (!exact && !cancelled && !relayed) fail('Receipt does not match this request. Keep it for review.')
    if (BigInt(await rpc(reader, 'eth_blockNumber')) - BigInt(r.blockNumber) + 1n < 2n) return { status: 'confirming' }
    if (!same((await rpc(reader, 'eth_getBlockByNumber', [r.blockNumber, false]))?.hash, r.blockHash)) return { status: 'pending' }
    const success = BigInt(r.status) === 1n
    if (success && !cancelled) {
      const code = await rpc(reader, 'eth_getCode', [config.controller, r.blockNumber])
      if (keccak256(code) !== config.controllerRuntimeCodeHash || !adminActionEffect(r, p, config, account)) fail('Confirmed transaction is missing its expected effect. Do not repeat it.')
    }
    const result = { action: p.action, status: cancelled ? 'cancelled' : success ? 'confirmed' : 'failed', hash: id, at: now() }
    if (state().pending?.at !== p.at) fail('Recovery state changed in another tab.')
    save({ ...s, pending: null, receipts: [...s.receipts.slice(-29), result] }, true)
    return result
  }
  function clearUnsent(acknowledged = false) {
    const s = state()
    if (!acknowledged || busy || s.pending?.hash) fail('Verify submitted transactions first. Check MetaMask before clearing an unsent request.')
    save({ ...s, pending: null }); reviewed = null
  }
  return { config, account, state, read, review, send, recover, clearUnsent, invalidate: () => { reviewed = null } }
}
