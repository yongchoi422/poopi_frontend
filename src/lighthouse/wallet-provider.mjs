// MetaMask-only launch. Discovery never requests accounts or falls back to an
// arbitrary installed wallet. Wallet identity flags are not an authenticity proof.
export function discoverWallet(target, legacy = () => target.ethereum) {
  const providers = new Map()
  const announce = event => {
    const detail = event.detail
    if (detail?.info?.uuid && typeof detail.provider?.request === 'function') providers.set(detail.info.uuid, detail)
  }
  target.addEventListener('eip6963:announceProvider', announce)
  target.dispatchEvent(new Event('eip6963:requestProvider'))
  return {
    resolve: () => {
      const announced = [...providers.values()]
      const metamask = announced.find(p => p.info.rdns === 'io.metamask')?.provider
      if (metamask) return metamask
      const injected = legacy()
      const candidates = Array.isArray(injected?.providers) ? injected.providers : [injected]
      return candidates.find(p => p?.isMetaMask === true && typeof p.request === 'function'
        && !p.isRabby && !p.isCoinbaseWallet && !p.isBraveWallet
        && !announced.some(a => a.provider === p && a.info.rdns !== 'io.metamask')) || null
    },
    destroy: () => { target.removeEventListener('eip6963:announceProvider', announce); providers.clear() },
  }
}
