import { before, after, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { network } from 'hardhat'
import { BrowserProvider, ContractFactory, Contract } from 'ethers'
import { prepareControllerDeployment, preflightController, inspectControllerDeployment, controllerInventoryTransactions } from '../scripts/three-wallet-release-tools.mjs'
let connection, provider, artifacts, signers, input, snap
const options = { allowTest: true }
before(async () => {
  artifacts = JSON.parse(readFileSync(new URL('../artifacts/contracts.json', import.meta.url))).contracts
  connection = await network.create('default'); provider = new BrowserProvider(connection.provider, undefined, { cacheTimeout: -1 })
  signers = await provider.listAccounts()
  const token = await new ContractFactory(artifacts.TestToken.abi, artifacts.TestToken.bytecode, signers[0]).deploy(); await token.waitForDeployment()
  const now = (await provider.getBlock('latest')).timestamp
  input = { chainId: 31337, token: await token.getAddress(), deployer: signers[0].address,
    nonce: String(await provider.getTransactionCount(signers[0].address)), operators: signers.slice(0, 3).map(s => s.address),
    unitPriceWei: '100000000', saleCap: '1000', walletCap: '500', startsAt: String(now - 1), endsAt: String(now + 3600) }
  snap = await provider.send('evm_snapshot', [])
})
beforeEach(async () => { await provider.send('evm_revert', [snap]); snap = await provider.send('evm_snapshot', []) })
after(async () => { provider?.destroy(); await connection?.close() })
test('unsigned plan predicts both addresses and verifies the deployed permissions and stock path', async () => {
  const r = await prepareControllerDeployment(input, artifacts, options)
  assert.equal(r.terms.treasury, r.controller)
  const preflight = await preflightController(provider, r, artifacts, options)
  assert.ok(BigInt(preflight.estimatedGas) > 0n)
  const receipt = await (await signers[0].sendTransaction({ ...r.transaction, nonce: Number(r.input.nonce) })).wait()
  assert.equal(receipt.contractAddress, r.controller)
  const verified = await inspectControllerDeployment(provider, r, artifacts, options)
  assert.equal(verified.paused, true); assert.equal(verified.websiteEnabled, false)
  assert.equal(verified.candidateManifest.address, r.sale)
  const plan = controllerInventoryTransactions(r, input.operators[0], '1000', artifacts)
  for (const { purpose, ...tx } of plan) await (await signers[0].sendTransaction(tx)).wait()
  const sale = new Contract(r.sale, artifacts.SouliEthSale.abi, provider)
  await (await sale.connect(signers[3]).buy(210, input.endsAt, { value: 21000000000n })).wait()
  assert.equal(await sale.purchased(signers[3].address), 210n)
  const control = new Contract(r.controller, artifacts.SouliThreeWalletController.abi, signers[2])
  await (await control.collectProceeds()).wait()
  assert.equal(await provider.getBalance(r.sale), 0n)
})
test('changed nonce, unapproved review edits and different bytecode cannot pass preflight', async () => {
  const r = await prepareControllerDeployment(input, artifacts, options)
  await assert.rejects(preflightController(provider, { ...r, operators: [...r.operators].reverse() }, artifacts, options), /Review changed/)
  await assert.rejects(preflightController(provider, { ...r, transaction: { ...r.transaction, value: '0x1' } }, artifacts, options), /Review changed/)
  const otherArtifacts = { ...artifacts, SouliThreeWalletController: { ...artifacts.SouliThreeWalletController, bytecode: artifacts.SouliThreeWalletController.bytecode + '00' } }
  await assert.rejects(preflightController(provider, r, otherArtifacts, options), /Review changed/)
  await (await signers[0].sendTransaction({ to: signers[1].address, value: 1n })).wait()
  await assert.rejects(preflightController(provider, r, artifacts, options), /Nonce changed/)
})
test('invalid final terms, duplicate operators, wrong network and wrong inventory sender fail closed', async () => {
  await assert.rejects(prepareControllerDeployment(input, artifacts), /explicit test/)
  await assert.rejects(prepareControllerDeployment({ ...input, operators: [input.deployer, input.deployer, signers[2].address] }, artifacts, options), /distinct/)
  await assert.rejects(prepareControllerDeployment({ ...input, unitPriceWei: null }, artifacts, options), /exact decimal/)
  await assert.rejects(prepareControllerDeployment({ ...input, nonce: 1 }, artifacts, options), /exact safe decimal/)
  const r = await prepareControllerDeployment(input, artifacts, options)
  assert.throws(() => controllerInventoryTransactions(r, signers[4].address, '100', artifacts), /registered operator/)
  assert.throws(() => controllerInventoryTransactions(r, input.deployer, '1001', artifacts), /quantity/)
  await assert.rejects(inspectControllerDeployment(provider, r, artifacts, options), /Controller bytecode/)
  const wrongChain = { getNetwork: async () => ({ chainId: 8453n }) }
  await assert.rejects(preflightController(wrongChain, r, artifacts, options), /Wrong deployment chain/)
})
