import reviewed from './mainnet.json' with { type: 'json' }
// Exact deployed V2. This enables the management UI, not the on-chain sale.
// Every write requires a registered operator, fresh verification and a signature.
Object.freeze(reviewed.operators)
Object.freeze(reviewed.sale.terms.useOfProceeds)
Object.freeze(reviewed.sale.terms)
Object.freeze(reviewed.sale)
export const MAINNET_ADMIN = Object.freeze(reviewed)
export const BASE_TOKEN_HASH = '0x9afd2c3834d86fbf79beb22fd67e02e95f616e7606250f8b7d6e1cc6ff36574c'
export const CONTROLLER_ABI = [
  'function token() view returns(address)', 'function sale() view returns(address)',
  'function operators(uint256) view returns(address)', 'function isOperator(address) view returns(bool)',
  'function pauseSale()', 'function startSale()', 'function depositStock(uint256)',
  'function recoverInventory(uint256)', 'function collectProceeds()', 'function recoverHeldTokens()',
  'event StockFunded(address indexed operator,uint256 wholeSouli)',
  'event StockRecovered(address indexed operator,uint256 tokenUnits)',
  'event EtherCollected(address indexed operator,uint256 amountWei)',
  'event HeldTokensRecovered(address indexed operator,uint256 tokenUnits)',
]
