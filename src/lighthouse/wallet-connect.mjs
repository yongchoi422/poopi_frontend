import { discoverWallet } from './wallet-provider.mjs'
import { normalizeWalletError } from './wallet-errors.mjs'

const REMEMBER = 'souli:metamask-relay:v1'
const DISCONNECTED = 'souli:wallet-disconnected:v1'
const loadSdk = () => import('@metamask/connect-evm')
export const WALLET_RPC = Object.freeze({
  '0x2105': 'https://base-rpc.publicnode.com',
  '0x14a34': 'https://sepolia.base.org',
})

// Relay links keep the dapp in its original browser. /dapp/ opens a different one.
export function isWalletRelayLink(value) {
  try {
    const url = new URL(value)
    return !url.username && !url.password && !url.port && (
      (url.protocol === 'metamask:' && url.hostname === 'connect' && url.pathname === '/mwp') ||
      (url.protocol === 'https:' && url.hostname === 'metamask.app.link' && ['/connect', '/connect/mwp'].includes(url.pathname))
    )
  } catch { return false }
}

const isInteractive = method => /^(eth_requestAccounts|eth_sendTransaction|eth_sign|eth_signTypedData.*|personal_sign|wallet_(switchEthereumChain|addEthereumChain|sendCalls|requestPermissions|watchAsset))$/.test(method)
const closed = () => Object.assign(Error('Wallet disconnected. Connect your wallet again first.'), { code: 4900 })

export function createWalletConnector(target, {
  chainId = '0x2105', discovery = discoverWallet(target), load = loadSdk,
  onChange = () => {}, onDisconnect = () => {}, disconnectTimeoutMs = 8000,
} = {}) {
  if (!WALLET_RPC[chainId]) throw Error('Unsupported SOULI network')
  let clientPromise, client, selected, activeInjected, destroyed = false, connectionEpoch = 0
  let activeRequest = null, disconnectPromise, reloadRequired = false
  const read = key => { try { return target.localStorage.getItem(key) } catch { return null } }
  const write = (key, value) => { try { target.localStorage.setItem(key, value) } catch { /* in-memory state still applies */ } }
  let locallyDisconnected = read(DISCONNECTED) === '1'
  const publish = state => { if (!destroyed) onChange(state) }
  const blocked = () => locallyDisconnected || read(DISCONNECTED) === '1'
  function clearLocal(notify = false) {
    connectionEpoch++; locallyDisconnected = true
    publish({ busy: false, link: '' })
    if (notify && !destroyed) onDisconnect()
  }
  function storageChanged(event) {
    if (event.key === null || (event.key === DISCONNECTED && event.newValue === '1')) clearLocal(true)
  }
  target.addEventListener?.('storage', storageChanged)

  function wrap(provider, sdk) {
    return {
      async request(args) {
        const connect = args.method === 'eth_requestAccounts'
        if (destroyed || disconnectPromise || (!connect && blocked())) throw closed()
        if (reloadRequired) throw Error('Disconnected here. Refresh this page before reconnecting.')
        const version = connectionEpoch, interactive = isInteractive(args.method)
        if (interactive && activeRequest) throw Object.assign(Error('A request is already open. Check MetaMask.'), { code: -32002 })
        const requestId = Symbol()
        if (interactive) { activeRequest = requestId; publish({ busy: true, link: '' }) }
        try {
          if (connect) {
            let accounts
            if (sdk) accounts = (await sdk.connect({ chainIds: [chainId], ...(blocked() ? { forceRequest: true } : {}) })).accounts
            else {
              if (blocked()) await provider.request({ method: 'wallet_requestPermissions', params: [{ eth_accounts: {} }] })
              if (version !== connectionEpoch || destroyed) return []
              accounts = await provider.request(args)
            }
            if (version !== connectionEpoch || destroyed) return []
            if (accounts?.length) {
              locallyDisconnected = false; write(DISCONNECTED, '0')
              if (sdk) write(REMEMBER, '1')
            }
            return accounts || []
          }
          // A sent transaction hash must reach its recovery store even after logout.
          return await provider.request(args)
        } catch (error) { throw normalizeWalletError(error, { connecting: connect }) }
        finally {
          if (activeRequest === requestId) { activeRequest = null; publish({ busy: false, link: '' }) }
        }
      },
      on: (name, listener) => provider.on?.(name, listener),
      removeListener: (name, listener) => provider.removeListener?.(name, listener),
    }
  }
  async function init() {
    if (!clientPromise) {
      clientPromise = load().then(({ createEVMClient }) => createEVMClient({
        dapp: { name: 'SOULI', url: target.location.origin, iconUrl: `${target.location.origin}/images/fungi/token-logo.png` },
        api: { supportedNetworks: WALLET_RPC }, analytics: { enabled: false },
        ui: { preferExtension: true, showInstallModal: false }, skipAutoAnnounce: true,
        mobile: {
          useDeeplink: true,
          preferredOpenLink(link) {
            if (destroyed || disconnectPromise || !activeRequest || !isWalletRelayLink(link)) return
            publish({ busy: true, link }); target.location.href = link
          },
        },
      })).then(value => { client = value; return value }).catch(error => { clientPromise = undefined; throw normalizeWalletError(error) })
    }
    const sdk = await clientPromise
    selected ||= wrap(sdk.getProvider(), sdk)
    return selected
  }
  return {
    async resolve({ silent = false } = {}) {
      if (destroyed || disconnectPromise || (silent && blocked())) return null
      if (reloadRequired) throw Error('Disconnected here. Refresh this page before reconnecting.')
      if (selected) return selected
      const injected = discovery.resolve()
      if (injected) { activeInjected = injected; return selected = wrap(injected) }
      if (silent && read(REMEMBER) !== '1') return null
      const version = connectionEpoch, result = await init()
      return destroyed || version !== connectionEpoch ? null : result
    },
    disconnect() {
      if (disconnectPromise) return disconnectPromise
      clearLocal(); write(DISCONNECTED, '1'); write(REMEMBER, '0')
      let timeout
      const revoke = async () => {
        if (clientPromise) await (client || await clientPromise).disconnect()
        else if (activeInjected) await activeInjected.request({ method: 'wallet_revokePermissions', params: [{ eth_accounts: {} }] })
        return true
      }
      disconnectPromise = Promise.race([
        // Do not retry a timed-out revoke against a newly connected session.
        revoke().catch(() => false),
        new Promise(resolve => { timeout = setTimeout(() => { reloadRequired = true; resolve(false) }, disconnectTimeoutMs) }),
      ]).finally(() => { clearTimeout(timeout); disconnectPromise = undefined })
      return disconnectPromise
    },
    destroy() {
      destroyed = true; connectionEpoch++
      target.removeEventListener?.('storage', storageChanged); discovery.destroy()
    },
  }
}
