// Owner-proposed fixed-price terms, not a market price or a live offering.
export const PURCHASE = Object.freeze({
  fdvUsd: 15_000_000,
  supply: 210_000_000,
  tokenDecimals: 9,
  paymentDecimals: 6,
  chainId: '0x2105',
  token: '0xb43eA104c7ec75038Ac8EcA57107Eefc8B039aFF',
  usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  supplyVerifiedBlock: 51_427_751,
  saleContract: null,
  liquidityPercent: 100,
  teamProceedsPercent: 0,
})

export function parseUsdc(raw) {
  const text = String(raw).trim()
  if (!/^\d+(?:\.\d{1,6})?$/.test(text)) throw new Error('Enter a USDC amount with up to 6 decimal places.')
  if (text.length > 30) throw new Error('That amount is too large.')
  const [whole, fraction = ''] = text.split('.')
  const units = BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(6, '0'))
  if (units <= 0n) throw new Error('Enter an amount greater than zero.')
  return units
}

export function quotePurchase(raw) {
  const usdcUnits = parseUsdc(raw)
  // Exact rational pricing: $15M / 210M = 1/14 USD per SOULI.
  // A USDC accounting unit is assumed to equal USD 1 for this proposal.
  const soulUnits = usdcUnits * BigInt(PURCHASE.supply) * 10n ** BigInt(PURCHASE.tokenDecimals)
    / (BigInt(PURCHASE.fdvUsd) * 10n ** BigInt(PURCHASE.paymentDecimals))
  const matchingSoulUnits = soulUnits
  const requiredSoulUnits = soulUnits + matchingSoulUnits
  if (requiredSoulUnits > BigInt(PURCHASE.supply) * 10n ** BigInt(PURCHASE.tokenDecimals)) throw new Error('Buyer tokens plus matching liquidity would exceed the total supply. Sale inventory is still to be set.')
  return { usdcUnits, soulUnits, matchingSoulUnits, requiredSoulUnits }
}

export function formatUnits(value, decimals, maxFraction = decimals) {
  const units = BigInt(value), scale = 10n ** BigInt(decimals)
  const whole = (units / scale).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const fraction = (units % scale).toString().padStart(decimals, '0').slice(0, maxFraction).replace(/0+$/, '')
  return `${whole}${fraction ? `.${fraction}` : ''}`
}

export function walletError(error) {
  if (Number(error?.code) === 4001) return 'Connection cancelled. Your funds have not moved.'
  if (Number(error?.code) === -32002) return 'A wallet request is already open. Check MetaMask.'
  return 'Could not connect to the wallet. Open MetaMask and try again.'
}

export function findInjectedWallet(ethereum) {
  if (!ethereum) return null
  const providers = Array.isArray(ethereum.providers) ? ethereum.providers : [ethereum]
  return providers.find(provider => provider.isMetaMask && !provider.isBraveWallet && typeof provider.request === 'function') || providers.find(provider => typeof provider.request === 'function') || null
}

// This adapter only reads account/network/balance. It cannot sign or transfer funds.
export async function readPurchaseWallet(provider, address) {
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) throw new Error('Invalid wallet address.')
  const chainId = await provider.request({ method: 'eth_chainId' })
  if (chainId.toLowerCase() !== PURCHASE.chainId) return { chainId, usdcUnits: null, soulUnits: null }
  const data = `0x70a08231${address.slice(2).toLowerCase().padStart(64, '0')}`
  const block = await provider.request({ method: 'eth_blockNumber' })
  const balances = await Promise.all([PURCHASE.usdc, PURCHASE.token].map(to => provider.request({ method: 'eth_call', params: [{ to, data }, block] })))
  return { chainId, usdcUnits: BigInt(balances[0]), soulUnits: BigInt(balances[1]), block }
}
