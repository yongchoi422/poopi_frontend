// Only public compiler outputs: no key, RPC credential, or deployment address.
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
const input = JSON.parse(await readFile('contracts/artifacts/contracts.json', 'utf8'))
const sources = ['contracts/src/SouliEthSale.sol', 'contracts/src/SouliThreeWalletController.sol', 'contracts/test/fixtures/ThreeWalletLab.sol', 'contracts/test/fixtures/SepoliaLab.sol', 'contracts/package-lock.json', 'contracts/scripts/compile.mjs']
const sourceHashes = Object.fromEntries(await Promise.all(sources.map(async path => [path, createHash('sha256').update(await readFile(path)).digest('hex')])))
const contracts = Object.fromEntries(['SepoliaTestSouli', 'SepoliaTestSale', 'SouliEthSale', 'SepoliaThreeWalletController'].map(name => {
  if (!input.contracts[name]) throw Error('Compile contracts first: npm.cmd run compile --prefix contracts')
  return [name, input.contracts[name]]
}))
await mkdir('src/testnet', { recursive: true })
await writeFile('src/testnet/contracts.generated.json', JSON.stringify({ compiler: input.compiler, sourceHashes, contracts }) + '\n')
console.log('Exported public test artifacts including three-wallet controller; no deployment performed.')
