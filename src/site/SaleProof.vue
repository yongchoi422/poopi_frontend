<script setup>
import proof from './commercial-proof.json'
import opening from './sale-opening.json'
defineProps({ compact: Boolean })
const date = new Date(proof.checkedAt).toLocaleString('en-US',{timeZone:'UTC',dateStyle:'medium',timeStyle:'short'}) + ' UTC'
const explorer = address => 'https://basescan.org/address/' + address
</script>
<template>
  <section class="sale-proof" aria-label="Verified V2 sale facts">
    <div class="proof-top"><strong>V2 on Base</strong><span>On-chain receipts</span></div>
    <p class="proof-price"><b>1 SOULI</b><span>{{proof.unitPriceEth}} ETH <small>+ network fee</small></span></p>
    <p class="proof-summary">1.4M first stock target · 4.2M total cap · Fixed ETH price</p>
    <p class="proof-opening"><b>First stock funded.</b> 1,399,999 SOULI deposited. Sale opened October 4, 2026 at 05:29 UTC. <a :href="'https://basescan.org/tx/'+opening.receipts[2].hash">Opening receipt ↗</a><br><a href="/buy/">Check current availability ↗</a></p>
    <p v-if="!compact" class="proof-summary">Earlier mainnet rehearsal · historical balances below</p>
    <dl v-if="!compact" class="proof-metrics">
      <div><dt>Sold in the mainnet check</dt><dd>{{proof.sold}} SOULI</dd></div>
      <div><dt>Stock in the sale</dt><dd>{{proof.available}} SOULI</dd></div>
      <div><dt>Total purchase ETH</dt><dd>{{proof.purchaseEth}}</dd></div>
      <div><dt>ETH collected by operator</dt><dd>{{proof.collectedEth}}</dd></div>
      <div><dt>ETH held in sale / controller</dt><dd>{{proof.saleEth}} / {{proof.controllerEth}}</dd></div>
      <div><dt>LP and its lock</dt><dd>Not created</dd></div>
    </dl>
    <details class="proof-details">
      <summary>Contracts, price & receipts ↗</summary>
      <p>The first production stock and sale opening are separate from the earlier small rehearsal. An opening receipt records a past action; current stock and pause status can change.</p>
      <ul><li v-for="receipt in opening.receipts" :key="receipt.hash"><a :href="'https://basescan.org/tx/'+receipt.hash">{{ {approve:'Exact stock allowance',deposit:'Deposit 1,399,999 SOULI',start:'Open sale'}[receipt.action] }} ↗</a></li></ul>
      <p>The same deployed V2 completed a real purchase on a phone: 42 SOULI funded, 1 purchased, 41 returned, and the purchase ETH collected. The recorded check ended with the sale paused and empty. See the purchase page for current availability. Collection is not an LP deposit.</p>
      <dl class="proof-addresses"><div><dt>Sale</dt><dd><a :href="explorer(proof.sale)">{{proof.sale}}</a></dd></div><div><dt>Controller</dt><dd><a :href="explorer(proof.controller)">{{proof.controller}}</a></dd></div><div><dt>Original token</dt><dd><a :href="explorer(proof.token)">{{proof.token}}</a></dd></div></dl>
      <p><a :href="'https://repo.sourcify.dev/8453/'+proof.sale">Sale source on Sourcify ↗</a> · <a :href="'https://repo.sourcify.dev/8453/'+proof.controller">Controller source ↗</a><br>Exact creation and runtime matches. Source verification is not a security audit.</p>
      <ul><li v-for="receipt in proof.receipts" :key="receipt.hash"><a :href="'https://basescan.org/tx/'+receipt.hash">{{receipt.label}} ↗</a></li></ul>
      <p>The price is {{proof.terms.unitPriceWei}} wei per whole SOULI. It was fixed using a $15M reference FDV, 210M supply and ETH/USD 2,678.635 on October 3, 2026 at 13:19:46 UTC. The USD equivalent now moves with ETH. FDV is not money raised or a guaranteed market value.</p>
      <p>The first stock target is 1,400,000 including the test purchase. Another 2,800,000 can be stocked in batches, even while selling. The initial target is not a separate contract cap. One wallet may buy all available stock. The test purchase uses 1 of the lifetime 4,200,000 cap; up to {{Number(proof.remainingToFund).toLocaleString('en-US')}} more can be sold. Operators can pause the sale and recover unsold inventory. No protocol refund follows successful delivery.</p>
      <p><b>Any one of three operators can act.</b> This is not multi-signature approval. Each can manage stock and withdraw proceeds to their registered wallet. The 50% LP / 50% operations policy is a manual commitment, not a spending restriction enforced by this contract.</p>
      <ul class="proof-operators"><li v-for="address in proof.operators" :key="address"><a :href="explorer(address)">{{address}}</a></li></ul>
      <p>Game: cooking. Internal checks completed; no independent audit. LP: not created. A one-year LP principal lock is planned; the actual deposit, owner and unlock time must be published before it is described as locked.</p>
    </details>
    <p class="proof-date">Recorded {{date}} · <a :href="'https://basescan.org/block/'+proof.block">Block {{proof.block.toLocaleString('en-US')}} ↗</a><br>A dated snapshot, not a live balance feed.</p>
  </section>
</template>
<style scoped>
.sale-proof{margin:22px 0 0;padding:20px;border:1.5px solid #afc3eb;border-radius:18px;background:#f0f5ff;color:#172450;font:14px/1.6 var(--font-ui,system-ui);min-width:0}.proof-top{display:flex;align-items:center;justify-content:space-between;gap:12px}.proof-top>strong{font-size:19px}.proof-top>span{background:#ffe78d;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:750}.proof-price{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;margin:14px 0 4px!important}.proof-price>span{overflow-wrap:anywhere;font-weight:750}.proof-price small{font-size:11px;font-weight:500;white-space:nowrap}.proof-summary{font-size:12px;margin:0 0 16px!important;color:#455477}.proof-metrics{display:grid;grid-template-columns:1fr 1fr;gap:12px 24px;margin:16px 0}.proof-metrics>div{border-top:1px solid #c8d6ee;padding-top:10px;min-width:0}.proof-metrics dt{font-size:12px;color:#455477}.proof-metrics dd{font-weight:750;margin:3px 0 0;overflow-wrap:anywhere}.proof-details{border-top:1px solid #c8d6ee;padding-top:12px;margin-top:14px}.proof-details summary{cursor:pointer;font-size:13px;font-weight:750}.proof-details p,.proof-details li{font-size:13px;line-height:1.65}.sale-proof a{color:#214ed2;text-underline-offset:3px}.proof-addresses>div{margin:12px 0}.proof-addresses dt{font-weight:750}.proof-addresses dd{margin:0;overflow-wrap:anywhere;font-size:12px}.proof-operators{padding-left:18px;overflow-wrap:anywhere}.proof-date{font-size:11px!important;line-height:1.5!important;margin:15px 0 0!important;color:#526180}.sale-proof a:focus-visible,.sale-proof summary:focus-visible{outline:3px solid #2455ee;outline-offset:3px}@media(max-width:540px){.sale-proof{padding:16px 14px}.proof-metrics{grid-template-columns:1fr}.proof-price{flex-direction:column;gap:2px}}
</style>
