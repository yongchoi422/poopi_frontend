<script setup>
defineProps({ state: { type: Object, required: true } })
</script>

<template>
  <aside v-if="state.busy" class="relay-status" role="status" aria-live="polite">
    <strong>Approve in MetaMask. Come back here.</strong>
    <p>This browser keeps your SOULI session.</p>
    <a v-if="state.link" :href="state.link">Open MetaMask to approve ↗</a>
    <small v-if="state.link">App didn’t open? Tap the link above. Keep this tab open.</small>
  </aside>
</template>

<style scoped>
.relay-status{margin:16px 0;padding:18px 22px;border:2px solid #1749ce;border-radius:18px;background:#fff5ca;color:#143976;font:500 15px/1.5 var(--font-ui,system-ui);overflow-wrap:anywhere}
.relay-status strong{display:block;font-size:17px}.relay-status p{margin:4px 0 12px;color:inherit}.relay-status a{display:inline-block;padding:10px 16px;background:#1749ce;color:#fff;border:2px solid #143976;border-radius:12px;box-shadow:0 3px 0 #143976;text-decoration:none;font-weight:750}.relay-status a:active{transform:translateY(2px);box-shadow:0 1px 0 #143976}.relay-status small{display:block;margin-top:12px}
</style>
