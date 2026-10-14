import assert from 'node:assert/strict'
import {readFile,writeFile} from 'node:fs/promises'
const read=async p=>JSON.parse(await readFile(p,'utf8'))
const log='logs/sale-checks/',dir='tmp/commercial-v2/'
const latest=await read(log+'commercial-v2-latest-state.json')
const purchase=await read(log+'commercial-v2-purchase1-receipt.json')
const pause=await read(log+'commercial-v2-pause-receipt.json'),recover=await read(log+'commercial-v2-recover-receipt.json'),collect=await read(log+'commercial-v2-collect-receipt.json')
for(const receipt of [purchase,pause,recover,collect])assert.equal(receipt.status,'success')
assert.equal(latest.state.paused,true);assert.equal(latest.state.inventory,'0');assert.equal(latest.state.saleEth,'0');assert.equal(latest.state.controllerEth,'0')
const result={status:'V2_SMALL_MAINNET_CYCLE_COMPLETE',checkedAt:latest.checkedAt,sale:latest.sale,controller:latest.controller,buyer:purchase.buyer,purchaseHash:purchase.hash,pauseHash:pause.hash,recoverHash:recover.hash,collectHash:collect.hash,buyerTokenBalance:purchase.tokenBalanceAfter,finalState:latest.state,pendingWalletRequest:false,commercialLaunchEnabled:false,independentExternalAuditComplete:false,lpCreated:false,lpLockCreated:false,notes:['Purchased one original SOULI via phone wallet; delivered and original inscription verified.','Recovered41 SOULI and collected26666033792798wei to A, ETH delta reconciled including fees.','One test token counts against the4.2M lifetime cap; maximum new funding4,199,999 SOULI.','50:50 is a manual allocation, not an on-chain spending restriction.']}
await writeFile(log+'commercial-v2-cycle-complete.json',JSON.stringify(result,null,2)+'\n')
const progress=await read(log+'commercial-v2-progress.json')
await writeFile(log+'commercial-v2-progress.json',JSON.stringify({...progress,phase:'small-mainnet-cycle-complete',awaiting:null,collectHash:collect.hash,next:['Independent external review and final public disclosures','Confirm supply wallets, stock and existing obligations','Finalize LP timing, lock implementation and custody','Prepare reviewed commercial UI/manifest before stock funding and opening']},null,2)+'\n')
const context=await read(dir+'context.json')
context.status=result.status;context.verifiedAt=latest.checkedAt;context.publicTransactionsSent=8;context.verifiedTransactionCount=8
context.stock.walletEthAtPreparation=context.stock.walletEth;delete context.stock.walletEth
context.stock.walletWholeSouli='998';context.stock.remainingBuyerTokens='4199999'
context.latestState=latest.state;context.smallMainnetCycle=result
context.remaining=progress.next=['External independent review and final supply/obligations check','LP timing, lock implementation, beneficiary and fee rights','Operating budget, public disclosures and reviewed commercial checkout release']
context.note='V2 small mainnet cycle completed with user-signed transactions. Sale paused, stock and contract ETH zero. No public commercial launch, LP or lock created.'
await writeFile(dir+'context.json',JSON.stringify(context,null,2)+'\n')
let html=await readFile(dir+'index.html','utf8')
const replacements=[
 ['LOCAL REVIEW · SALE CLOSED','LOCAL REVIEW · SALE PAUSED'],
 ['A clear plan.<br>Before we open.','Mainnet cycle.<br>Verified.'],
 ['Next: a small live check','Mainnet check complete'],
 ['<ol><li>Approve and deposit only 42 SOULI.</li><li>Buy 1 SOULI from a separate wallet.</li><li>Pause, recover stock and collect ETH.</li><li>Prepare stock and finish launch checks.</li></ol>','<ol><li>42 original SOULI funded.</li><li>1 bought with a separate phone wallet.</li><li>Sale paused; 41 SOULI returned to A.</li><li>Purchase ETH collected; contracts empty.</li></ol>'],
 ['V2 deployment is verified. The sale is paused and empty at the recorded check. No LP or lock exists yet.','Real receipts and balance changes verified. A holds 998 SOULI; the buyer holds 2. No LP or lock exists yet.'],
 ['External independent review and the small-stock mainnet cycle.','External independent review and final supply/obligations check.'],
 ['4.2M buyer tokens, plus up to 2.1M separate LP tokens.','4,199,999 remaining buyer tokens, plus up to 2.1M separate LP tokens. The test purchase used one token of the lifetime cap.'],
 ["['Prepared',new Date(c.preparedAt).toLocaleString()]","['Latest verified state',new Date(c.verifiedAt||c.preparedAt).toLocaleString()]"],
 ['Reference ETH price · not a live quote','Fixed ETH sale price'],
 ['Deployed with the fixed terms below. A small-stock check is next; public checkout remains closed.','Deployed and checked with a real purchase, inventory recovery and ETH collection. Sale paused; public commercial checkout remains closed.'],
]
for(const [from,to]of replacements){assert.ok(html.includes(from),`Missing dashboard text: ${from}`);html=html.replace(from,to)}
await writeFile(dir+'index.html',html)
console.log('Saved immutable receipt summary, current handoff and completed-cycle local dashboard. Frozen deployment review/context preserved.')
