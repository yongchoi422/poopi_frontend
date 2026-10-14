import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {formatEther} from 'ethers'
import {LIVE_SALE} from '../src/lighthouse/sale-config.mjs'
import {MAINNET_ADMIN} from '../src/sale-admin/config.mjs'
import {PILOT_V2_SALE} from '../src/lighthouse/sale-profile.mjs'
const read=p=>readFileSync(p,'utf8'),proof=JSON.parse(read('src/site/commercial-proof.json'))
assert.equal(proof.sale,PILOT_V2_SALE.address);assert.equal(proof.termsHash,PILOT_V2_SALE.termsHash)
assert.deepEqual(proof.terms,PILOT_V2_SALE.terms)
assert.equal(proof.unitPriceEth,formatEther(proof.terms.unitPriceWei))
assert.equal(proof.purchaseEth,proof.collectedEth);assert.equal(proof.saleEth,'0.0');assert.equal(proof.controllerEth,'0.0')
assert.equal(BigInt(proof.sold)+BigInt(proof.remainingToFund),BigInt(proof.terms.saleCap))
assert.equal(proof.receipts.length,4);assert.ok(proof.receipts.every(r=>r.block<=proof.block&&/^0x[0-9a-f]{64}$/.test(r.hash)))
assert.equal(new Set(proof.operators.map(x=>x.toLowerCase())).size,3)
for(const value of [proof.lpCreated,proof.lpLocked,proof.independentAuditPublished,proof.commercialCheckoutOpen])assert.equal(value,false)
assert.equal(LIVE_SALE.enabled,true);assert.equal(MAINNET_ADMIN.enabled,true)
assert.deepEqual(LIVE_SALE,PILOT_V2_SALE);assert.deepEqual(MAINNET_ADMIN.sale,LIVE_SALE)
for(const file of ['src/site/LiquidityReceipts.vue','src/whitepaper/Whitepaper.vue','src/buy/BuyPage.vue'])assert.match(read(file),/<SaleProof(?:\s|\s*\/?>)/,file)
assert.doesNotMatch(read('src/whitepaper/Whitepaper.vue'),/locally tested but not deployed|Final ETH pricing.*pending|V2 is locally tested/)
assert.doesNotMatch(read('src/site/LiquidityReceipts.vue'),/commercial sale is not deployed|Not deployed/)
assert.ok(!read('src/site/commercial-proof.json').includes('walletTokens'),'Only explicit public fields are exported')
console.log('PASS: public V2 facts, receipt/cap reconciliation, shared disclosure, and closed checkout/audit/LP states.')
