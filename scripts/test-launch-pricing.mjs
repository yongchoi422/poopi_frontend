import assert from 'node:assert/strict'
import { planLaunchPrice } from '../src/lighthouse/launch-pricing.mjs'
for (const rate of ['1', '2500', '2673.95', '3000', '4000', '0.00000001', '12345678.12345678']) {
  const p = planLaunchPrice(rate), [a,b=''] = rate.split('.'), scale = 10n ** BigInt(b.length), price = BigInt(a+b)
  const n = 15000000n * 10n ** 18n * scale, d = 210000000n * price, wei = BigInt(p.unitPriceWei)
  assert.ok(wei * d >= n && (wei-1n) * d < n, 'Ceiling is exact to one wei, without floating-point drift')
  assert.equal(BigInt(p.maximumPurchaseWei), 700000n * wei)
  assert.equal(BigInt(p.saleTokens) + BigInt(p.separateLpTokens), 1400000n)
  assert.equal(p.guaranteesFixedUsdPrice, false)
}
assert.equal(planLaunchPrice('2500').unitPriceWei, '28571428571429')
assert.equal(planLaunchPrice('2500').maximumPurchaseWei, '20000000000000300000')
for (const input of ['0','-1','NaN','Infinity','1e3','2,500','2500x',' 2500','1.123456789',null,2500]) assert.throws(()=>planLaunchPrice(input))
console.log('PASS: exact FDV/ETH conversion, bounded one-wei rounding, separated sale/LP stock and invalid rate rejection.')
