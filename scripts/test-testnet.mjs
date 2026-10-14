import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
const bundle = JSON.parse(await readFile('src/testnet/contracts.generated.json', 'utf8'))
for (const [path, expected] of Object.entries(bundle.sourceHashes)) assert.equal(createHash('sha256').update(await readFile(path)).digest('hex'), expected, `Recompile and export testnet artifacts after changing ${path}`)
assert.deepEqual(Object.keys(bundle.contracts).sort(), ['SepoliaTestSale', 'SepoliaTestSouli', 'SepoliaThreeWalletController', 'SouliEthSale'])
const { LIVE_SALE } = await import('../src/lighthouse/sale-config.mjs')
assert.equal(LIVE_SALE.enabled, true)
assert.equal(LIVE_SALE.chainId, 8453)
const html = await readFile('testnet/index.html', 'utf8')
assert.match(html, /noindex, nofollow/)
console.log('PASS: testnet artifacts match sources; mainnet configuration remains separate.')
