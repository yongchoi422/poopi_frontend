// Review tooling only: no keys, signer, broadcast, or live-site configuration.
import { Contract, ContractFactory, Interface, getAddress, getCreateAddress, isAddress, ZeroAddress, keccak256 } from 'ethers'
import { prepareDeployment, inspectDeployment, matchesCompiledRuntime, BASE_TOKEN_CODE_HASH, selectSaleArtifact } from './release-tools.mjs'
import { validateAdminConfig } from '../../src/sale-admin/client.mjs'
import { hasSaleEnded } from '../../src/lighthouse/sale-window.mjs'
import {reviewedDeployerAccount,checkDeployerAccount} from './deployer-account.mjs'

function versionArtifacts(input, artifacts) {
  const version=input.version??1
  if(![1,2].includes(version))throw Error('Unsupported sale version')
  const suffix=version===2?'V2':''
  const sale=selectSaleArtifact(artifacts,version),controller=artifacts['SouliThreeWalletController'+suffix]
  if(!sale||!controller)throw Error('Compile the reviewed contract version first')
  return {sale,controller}
}

const address = value => {
  if (!isAddress(value) || getAddress(value) === ZeroAddress) throw Error('A nonzero address is required')
  return getAddress(value)
}
export async function prepareControllerDeployment(input, artifacts, options = {}) {
  const compiled=versionArtifacts(input,artifacts)
  const deployer = address(input.deployer)
  if (typeof input.nonce !== 'string' || !/^(0|[1-9]\d*)$/.test(input.nonce) || BigInt(input.nonce) > BigInt(Number.MAX_SAFE_INTEGER)) throw Error('Deployment nonce must be an exact safe decimal string')
  if (!Array.isArray(input.operators) || input.operators.length !== 3) throw Error('Exactly three operators are required')
  const operators = input.operators.map(address)
  if (new Set(operators).size !== 3) throw Error('Operators must be distinct')
  const controller = getCreateAddress({ from: deployer, nonce: BigInt(input.nonce) })
  const sale = getCreateAddress({ from: controller, nonce: 1 })
  if (operators.some(a => [controller, sale, address(input.token)].includes(a))) throw Error('Operator cannot be a sale or token contract')
  const child = await prepareDeployment({ ...input, owner: controller, treasury: controller }, compiled.sale, options)
  const t = child.terms
  const deployerAccount=reviewedDeployerAccount(input.deployerAccount,t.chainId,options)
  const normalized = { chainId: t.chainId, token: t.token, deployer, nonce: input.nonce, operators,
    unitPriceWei: t.unitPriceWei, saleCap: t.saleCap, walletCap: t.walletCap, startsAt: t.startsAt, endsAt: t.endsAt }
  if(t.version===2)normalized.version=2
  if(deployerAccount)normalized.deployerAccount=deployerAccount
  const args = [t.token, operators, t.unitPriceWei, t.saleCap, t.walletCap, t.startsAt, t.endsAt, child.termsHash]
  const art = compiled.controller
  const tx = await new ContractFactory(art.abi, art.bytecode).getDeployTransaction(...args)
  return { version: 1, kind: 'three-independent-operators', input: normalized, controller, sale,
    owner: controller, operators, terms: t, termsHash: child.termsHash, constructorArgs: args,
    controllerCreationCodeHash: keccak256(art.bytecode), saleCreationCodeHash: child.creationCodeHash,
    transaction: { chainId: t.chainId, from: deployer, nonce: input.nonce, value: '0x0', data: tx.data,...(deployerAccount?{type:2}:{}) },
    note: deployerAccount?'Unsigned direct type-2 CREATE from the reviewed existing MetaMask-delegated EOA. No authorization list or relay. Initially paused; no stock or proceeds moved. One operator is sufficient; no LP restriction or multisig.':'Unsigned EOA CREATE only. Nonce changes require a new review. Initially paused. One operator is sufficient; no LP restriction or multisig. Does not open the website.' }
}
async function validateReview(review, artifacts, options) {
  const rebuilt = await prepareControllerDeployment(review.input, artifacts, options)
  if (JSON.stringify(rebuilt) !== JSON.stringify(review)) throw Error('Review changed or compiled artifacts differ; regenerate and review again')
}
export async function preflightController(provider, review, artifacts, options = {}) {
  await validateReview(review, artifacts, options)
  if (Number((await provider.getNetwork()).chainId) !== review.terms.chainId) throw Error('Wrong deployment chain')
  const block = await provider.getBlock('latest')
  const [latest, pending, destination, tokenCode] = await Promise.all([
    provider.getTransactionCount(review.input.deployer, block.number), provider.getTransactionCount(review.input.deployer, 'pending'),
    provider.getCode(review.controller, block.number),
    provider.getCode(review.terms.token, block.number),
  ])
  if (String(latest) !== review.input.nonce || pending !== latest) throw Error('Nonce changed or another transaction is pending; regenerate review')
  await checkDeployerAccount(provider,review.input.deployer,review.input.deployerAccount,block.number)
  if (destination !== '0x') throw Error('Predicted controller is already deployed')
  if (hasSaleEnded(review.terms.endsAt,block.timestamp)) throw Error('Sale window has expired')
  if (review.terms.chainId === 8453 && keccak256(tokenCode) !== BASE_TOKEN_CODE_HASH) throw Error('Original SOULI code differs from the reviewed snapshot')
  const token = new Contract(review.terms.token, ['function decimals() view returns(uint8)'], provider)
  if (await token.decimals({ blockTag: block.number }) !== 9n) throw Error('Wrong SOULI decimals')
  const gas = await provider.estimateGas({ ...review.transaction, nonce: Number(review.input.nonce) })
  return { block: block.number, controller: review.controller, sale: review.sale, estimatedGas: gas.toString(),
    publicTransactionsSent: 0, note: 'Read-only preflight. Recheck immediately before signing; this is not a fee quote, audit, or launch approval.' }
}
export async function inspectControllerDeployment(provider, review, artifacts, options = {}) {
  await validateReview(review, artifacts, options)
  const compiled=versionArtifacts(review.input,artifacts)
  if (Number((await provider.getNetwork()).chainId) !== review.terms.chainId) throw Error('Wrong verification chain')
  const block = await provider.getBlockNumber(), o = { blockTag: block }
  const code = await provider.getCode(review.controller, block)
  if (!matchesCompiledRuntime(code, compiled.controller)) throw Error('Controller bytecode differs')
  const c = new Contract(review.controller, compiled.controller.abi, provider)
  if (await c.sale(o) !== review.sale || await c.token(o) !== review.terms.token) throw Error('Controller token or child sale differs')
  for (let i = 0; i < 3; i++) if (await c.operators(i, o) !== review.operators[i]) throw Error('Registered operator differs')
  const checked = await inspectDeployment(provider, review.sale, review, compiled.sale, { ...options, blockTag: block })
  const candidateAdminManifest = {
    enabled: true, chainId: review.terms.chainId, controller: review.controller,
    controllerRuntimeCodeHash: keccak256(code), tokenRuntimeCodeHash: keccak256(await provider.getCode(review.terms.token, block)),
    operators: review.operators, sale: checked.candidateManifest,
  }
  validateAdminConfig(candidateAdminManifest, options)
  return { ...checked, controller: review.controller, controllerRuntimeCodeHash: keccak256(code), operators: review.operators,
    candidateAdminManifest,
    websiteEnabled: false, publicTransactionsSent: 0,
    note: 'Read-only verification. Candidate manifest is NOT applied. Independently review terms, permissions, original-token delivery and inventory before launch.' }
}
export function controllerInventoryTransactions(review, operator, wholeSouli, artifacts) {
  operator = address(operator)
  if (!review.operators.includes(operator)) throw Error('Stock sender must be a registered operator')
  if (typeof wholeSouli !== 'string' || !/^[1-9]\d*$/.test(wholeSouli) || BigInt(wholeSouli) > BigInt(review.terms.saleCap)) throw Error('Invalid stock quantity')
  const ci = new Interface(versionArtifacts(review.input,artifacts).controller.abi), ti = new Interface(['function approve(address,uint256) returns(bool)'])
  const common = { from: operator, chainId: review.terms.chainId, value: '0x0' }
  return [
    { ...common, purpose: 'Approve only the stock amount; verify controller first', to: review.terms.token, data: ti.encodeFunctionData('approve', [review.controller, BigInt(wholeSouli) * 1000000000n]) },
    { ...common, purpose: 'Deposit stock; inscription state may change', to: review.controller, data: ci.encodeFunctionData('depositStock', [wholeSouli]) },
    { ...common, purpose: 'Start ONLY after release review; separate final signature', to: review.controller, data: ci.encodeFunctionData('startSale') },
  ]
}
