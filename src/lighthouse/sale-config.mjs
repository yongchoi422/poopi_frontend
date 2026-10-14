import reviewedV2 from '../pilot-v2/sale.json' with { type: 'json' }
// Configuration is enabled; purchases still require fresh on-chain open/stock
// checks. Only a registered operator's signed transaction can open the sale.
// Never accept replacement contracts or terms from URL, storage or a remote API.
Object.freeze(reviewedV2.terms.useOfProceeds)
Object.freeze(reviewedV2.terms)
export const LIVE_SALE = Object.freeze(reviewedV2)

export const SALE_ABI = [
  'function VERSION() view returns(uint256)',
  'function souli() view returns(address)', 'function treasury() view returns(address)',
  'function owner() view returns(address)', 'function paused() view returns(bool)',
  'function unitPriceWei() view returns(uint256)', 'function saleCap() view returns(uint256)',
  'function walletCap() view returns(uint256)', 'function startsAt() view returns(uint256)',
  'function endsAt() view returns(uint256)', 'function termsHash() view returns(bytes32)',
  'function available() view returns(uint256)', 'function purchased(address) view returns(uint256)',
  'function buy(uint256 wholeSouli,uint256 deadline) payable',
  'event Purchased(address indexed buyer,uint256 wholeSouli,uint256 paidWei)',
]
export const TOKEN_ABI = [
  'function balanceOf(address) view returns(uint256)', 'function decimals() view returns(uint8)',
  'function dynamicInscription(address) view returns(uint256 seed,uint256 extra)',
  'function inscriptionCount(address) view returns(uint256)', 'function pool() view returns(address)',
]
