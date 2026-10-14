import { ref, shallowRef, computed, onUnmounted } from 'vue'
import { getAddress, toQuantity } from 'ethers'
import { createWalletConnector, WALLET_RPC } from './wallet-connect.mjs'
import { walletRequestMessage } from './wallet-errors.mjs'

// Shared connection lifecycle for the standalone buyer and operator pages.
// Connecting only exposes the chosen address; each transaction needs its own request.
export function useWallet(chainId = 8453) {
  const expected = toQuantity(chainId), account = ref(''), chain = ref(''), provider = shallowRef(null)
  const busy = ref(false), error = ref(''), notice = ref(''), relay = ref({ busy: false, link: '' })
  let epoch = 0, connecting = false, disposed = false
  const correctChain = computed(() => { try { return BigInt(chain.value || 0) === BigInt(chainId) } catch { return false } })
  const connector = createWalletConnector(window, { chainId: expected, onChange: s => { relay.value = s }, onDisconnect: changed })
  function bind(p) {
    provider.value?.removeListener?.('accountsChanged', changed); provider.value?.removeListener?.('chainChanged', changed); provider.value?.removeListener?.('disconnect', changed)
    provider.value = p
    p?.on?.('accountsChanged', changed); p?.on?.('chainChanged', changed); p?.on?.('disconnect', changed)
  }
  function changed() {
    if (connecting) return
    epoch++; bind(null); account.value = ''; chain.value = ''; busy.value = false
    notice.value = 'Wallet changed. Reconnect to continue. Saved requests are kept.'
  }
  async function connect() {
    if (busy.value || relay.value.busy) return
    const version = ++epoch; connecting = true; busy.value = true; error.value = ''; notice.value = ''
    const current = () => !disposed && epoch === version
    try {
      const next = await connector.resolve(); if (!current()) return
      bind(next)
      await next.request({ method: 'eth_requestAccounts' }); if (!current()) return
      let selected = await next.request({ method: 'eth_chainId' })
      if (!current()) return
      if (BigInt(selected) !== BigInt(chainId)) {
        try { await next.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: expected }] }) }
        catch (e) {
          if (Number(e.code) !== 4902) throw e
          if (!current()) return
          await next.request({ method: 'wallet_addEthereumChain', params: [{ chainId: expected, chainName: chainId === 8453 ? 'Base' : 'Base Sepolia', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: [WALLET_RPC[expected]], blockExplorerUrls: [chainId === 8453 ? 'https://basescan.org' : 'https://sepolia.basescan.org'] }] })
          if (!current()) return
          await next.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: expected }] })
        }
      }
      if (!current()) return
      const [accounts, actual] = await Promise.all([next.request({ method: 'eth_accounts' }), next.request({ method: 'eth_chainId' })])
      if (!current()) return
      if (BigInt(actual) !== BigInt(chainId) || !accounts?.[0]) throw Error('Connect a wallet on the displayed network.')
      account.value = getAddress(accounts[0]); chain.value = actual
    } catch (e) { if (current()) { bind(null); account.value = ''; chain.value = ''; error.value = walletRequestMessage(e) } }
    finally { if (current()) { connecting = false; busy.value = false } }
  }
  async function disconnect() {
    if (busy.value || relay.value.busy) return
    epoch++; connecting = false; bind(null); account.value = ''; chain.value = ''; busy.value = true
    try { await connector.disconnect(); notice.value = 'Disconnected. Choose an account in MetaMask, then reconnect.' }
    finally { if (!disposed) busy.value = false }
  }
  onUnmounted(() => { disposed = true; epoch++; bind(null); connector.destroy() })
  return { account, chain, provider, busy, error, notice, relay, correctChain, connect, disconnect, getProvider: () => provider.value }
}
