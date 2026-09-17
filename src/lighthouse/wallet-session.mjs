import { findInjectedWallet, readPurchaseWallet, walletError, PURCHASE } from './purchase.mjs'

const empty = () => ({ address: '', chainId: '', usdcUnits: null, soulUnits: null, busy: false, reading: false, error: '', notice: '' })

// One read-only session shared by the SVG library and the purchase preview.
// This module exposes no signing, approval, arbitrary RPC or payment function.
export function createWalletSession(resolveEthereum, onChange = () => {}) {
  let state = empty(), provider = null, epoch = 0, readId = 0, destroyed = false
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
    publish({ address: accounts?.[0] || '', error: '', notice: '' })
    refresh()
  }
  function chainChanged(chainId) { publish({ chainId, error: '', notice: '' }); refresh() }
  function disconnected() { clear(false) }
  function clear(showNotice = true) {
    epoch++; readId++; bind(null)
    publish({ ...empty(), notice: showNotice ? 'Session cleared here. Site permissions and any earlier token approvals must be managed in your wallet.' : '' })
  }
  async function connect() {
    if (destroyed || state.busy) return ''
    if (state.address) return state.address
    const injected = findInjectedWallet(resolveEthereum())
    if (!injected) { publish({ error: 'No browser wallet found. Open this page in a browser with MetaMask or another compatible wallet. Public address lookup and the demo still work.' }); return '' }
    bind(injected)
    const currentEpoch = epoch
    publish({ busy: true, error: '', notice: '' })
    try {
      const accounts = await injected.request({ method: 'eth_requestAccounts' })
      if (destroyed || currentEpoch !== epoch) return ''
      publish({ address: accounts?.[0] || '' })
      await refresh()
      return currentEpoch === epoch ? state.address : ''
    } catch (error) {
      if (!destroyed && currentEpoch === epoch) publish({ error: walletError(error) })
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
    get state() { return state }, connect, refresh, switchBase, disconnect: clear,
    destroy() { clear(false); destroyed = true },
  }
}
