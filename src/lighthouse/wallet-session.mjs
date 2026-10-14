import { findInjectedWallet, readPurchaseWallet, walletError, PURCHASE } from './purchase.mjs'

const empty = () => ({ address: '', chainId: '', usdcUnits: null, soulUnits: null, busy: false, reading: false, error: '', notice: '' })

// One read-only session shared by the SVG library and the purchase preview.
// This module exposes no signing, approval, arbitrary RPC or payment function.
export function createWalletSession(resolveEthereum, onChange = () => {}) {
  let state = empty(), provider = null, epoch = 0, readId = 0, accountRevision = 0, destroyed = false, synchronizing = false
  const publish = update => { if (!destroyed) { state = { ...state, ...update }; onChange(state) } }
  function bind(next) {
    provider?.removeListener?.('accountsChanged', accountsChanged)
    provider?.removeListener?.('chainChanged', chainChanged)
    provider?.removeListener?.('disconnect', disconnected)
    provider = next
    provider?.on?.('accountsChanged', accountsChanged)
    provider?.on?.('chainChanged', chainChanged)
    provider?.on?.('disconnect', disconnected)
  }
  async function refresh() {
    const id = ++readId, currentEpoch = epoch, account = state.address, currentProvider = provider
    publish({ usdcUnits: null, soulUnits: null, reading: Boolean(account && currentProvider) })
    if (!account || !currentProvider) return
    try {
      const result = await readPurchaseWallet(currentProvider, account)
      if (destroyed || id !== readId || currentEpoch !== epoch) return
      publish({ ...result, reading: false })
    } catch {
      if (!destroyed && id === readId && currentEpoch === epoch) publish({ reading: false, error: 'Balance could not be read. Your quote preview still works.' })
    }
  }
  function accountsChanged(accounts) {
    accountRevision++
    publish({ address: /^0x[\da-f]{40}$/i.test(accounts?.[0]) ? accounts[0] : '', usdcUnits: null, soulUnits: null, error: '', notice: '' })
    refresh()
  }
  function chainChanged(chainId) { publish({ chainId, error: '', notice: '' }); refresh() }
  function disconnected() { clear(false) }
  function clear(showNotice = true) {
    epoch++; readId++; bind(null)
    publish({ ...empty(), notice: showNotice ? 'Disconnected here. Any earlier token approvals remain unchanged.' : '' })
  }
  async function disconnect(revoke) {
    clear()
    if (typeof revoke !== 'function') return
    const currentEpoch = epoch
    publish({ busy: true })
    let revoked = false
    try { revoked = await revoke() } catch { /* local session is already cleared */ }
    if (!destroyed && currentEpoch === epoch) publish({ busy: false, notice: revoked ? 'Disconnected. Choose an account in MetaMask, then connect again. Earlier token approvals are unchanged.' : 'Disconnected here. If reconnecting fails, refresh this page or remove SOULI in MetaMask’s connected sites. Earlier token approvals are unchanged.' })
  }
  async function synchronize() {
    if (synchronizing || destroyed || state.busy || !state.address || !provider) return
    synchronizing = true
    const currentEpoch = epoch, revision = accountRevision, currentProvider = provider
    try {
      const accounts = await currentProvider.request({ method: 'eth_accounts' })
      if (destroyed || currentEpoch !== epoch || revision !== accountRevision) return
      if (!accounts?.length) { clear(false); return }
      if (accounts[0].toLowerCase() !== state.address.toLowerCase()) accountsChanged(accounts)
      else await refresh()
    } catch { if (currentEpoch === epoch && !destroyed) publish({ error: 'Could not refresh your wallet. Check MetaMask before continuing.' }) }
    finally { synchronizing = false }
  }
  async function connect(silent = false) {
    if (destroyed || state.busy) return ''
    if (state.address) return state.address
    const currentEpoch = epoch
    publish({ busy: true, error: '', notice: '' })
    try {
      const candidate = resolveEthereum({ silent })
      const injected = findInjectedWallet(candidate?.then ? await candidate : candidate)
      if (destroyed || currentEpoch !== epoch) return ''
      if (!injected) { if(!silent)publish({ error: 'No browser wallet connection available. Try Connect MetaMask again. Public address lookup and the demo still work.' }); return '' }
      bind(injected)
      const revision = accountRevision
      const accounts = await injected.request({ method: silent ? 'eth_accounts' : 'eth_requestAccounts' })
      if (destroyed || currentEpoch !== epoch) return ''
      if (revision === accountRevision) publish({ address: /^0x[\da-f]{40}$/i.test(accounts?.[0]) ? accounts[0] : '' })
      await refresh()
      return currentEpoch === epoch ? state.address : ''
    } catch (error) {
      if (!silent && !destroyed && currentEpoch === epoch) publish({ error: walletError(error) })
      return ''
    } finally { if (!destroyed && currentEpoch === epoch) publish({ busy: false }) }
  }
  async function switchBase() {
    if (!provider || state.busy || destroyed) return
    const currentEpoch = epoch, currentProvider = provider
    publish({ busy: true, error: '', notice: '' })
    try {
      await currentProvider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: PURCHASE.chainId }] })
      if (!destroyed && currentEpoch === epoch) await refresh()
    } catch (error) {
      if (!destroyed && currentEpoch === epoch) publish({ error: Number(error.code) === 4902 ? 'Add Base in your wallet, then try again.' : Number(error.code) === 4001 ? 'Network switch cancelled. No funds moved.' : 'Could not switch networks. Select Base in your wallet.' })
    } finally { if (!destroyed && currentEpoch === epoch) publish({ busy: false }) }
  }
  return {
    get state() { return state }, getProvider: () => provider,
    connect: () => connect(false), restore: () => connect(true), refresh, synchronize, switchBase, disconnect,
    destroy() { clear(false); destroyed = true },
  }
}
