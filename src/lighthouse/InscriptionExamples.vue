<script setup>
import { computed, ref, watch } from 'vue'
import snapshot from './inscription-examples.json'
import { artForStage } from './soul-art'
const props = defineProps({ level: { type: Number, required: true }, compact: Boolean })
const groups = snapshot.levels.map(l => ({ ...l, examples: l.examples.map(x => ({ ...x, ...artForStage(x.svg) })) }))
const index = ref(0)
const group = computed(() => groups.find(l => l.displayLevel === props.level) || groups[0])
const current = computed(() => group.value.examples[index.value])
const others = computed(() => group.value.examples.filter((_, i) => i !== index.value))
watch(() => props.level, () => { index.value = 0 })
function another() { index.value = (index.value + 1) % group.value.examples.length }
</script>

<template>
  <section class="inscription-examples" :class="{'examples-compact':compact}" :aria-label="`Level ${level} appearance examples`">
    <div class="inscription-example-art"><img :src="current.url" :alt="`Level ${level}, example ${index + 1}. Not a guaranteed purchase result.`"><span>EXAMPLE ONLY</span></div>
    <div class="inscription-example-copy"><span class="inscription-example-level">LEVEL {{level}} · EXAMPLES</span><strong v-if="compact">Your amount.<br>A surprise soul.</strong><strong v-else>Same level.<br>Different souls.</strong><div v-if="!compact" class="inscription-example-others" aria-hidden="true"><img v-for="example in others" :key="example.extra" :src="example.url" alt=""></div><button type="button" @click="another">{{compact?'Another look ↻':'Show another example ↻'}}</button></div>
    <p class="inscription-example-note">{{compact?'Amount sets a new soul’s level. The look is a surprise.':'You choose the amount. The contract creates the look.'}}</p>
    <span class="visually-hidden" aria-live="polite">Level {{level}}, preview {{index + 1}} of {{group.examples.length}}. Previewing does not change your purchase amount.</span>
  </section>
</template>

<style scoped>
.inscription-examples{display:grid;grid-template-columns:150px minmax(0,1fr);gap:12px 22px;margin:4px 0 22px;align-items:center;color:#172450}
.inscription-example-art{position:relative;display:grid;place-items:center;min-height:166px;align-self:stretch;background:#c9e2ff;border:1px solid #b2cbe9;border-radius:18px;padding:18px 10px 36px}
.inscription-example-art>img{width:108px;height:108px;object-fit:contain;image-rendering:pixelated;filter:drop-shadow(0 6px #29529616)}
.inscription-example-art>span{position:absolute;bottom:12px;font:700 8px/1 var(--font-ui,system-ui);letter-spacing:1.4px;color:#315281}
.inscription-example-level{display:block;font:700 9px/1.6 var(--font-ui,system-ui);letter-spacing:.65px;color:#426087}
.inscription-example-copy>strong{display:block;font:29px/1.08 var(--font-ui,system-ui);margin:7px 0 12px}
.inscription-example-others{display:flex;gap:8px}.inscription-example-others img{width:45px;height:45px;padding:5px;background:#f2edff;border-radius:10px;object-fit:contain;image-rendering:pixelated}
.inscription-example-copy>button{font:650 11px/1.4 var(--font-ui,system-ui);margin:12px 0 0;padding:7px 9px;background:#fff9e3;color:#2455c6;border:1px solid #b9c9e2;border-radius:8px;box-shadow:0 2px #cbd7ed;cursor:pointer}
.inscription-example-copy>button:active{transform:translateY(2px);box-shadow:none}.inscription-example-copy>button:focus-visible{outline:3px solid #2455ee;outline-offset:3px}
.inscription-example-note{grid-column:1/-1;margin:0;font:500 11px/1.6 var(--font-ui,system-ui);color:#536885}
.visually-hidden{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
@media(max-width:540px){.inscription-examples{grid-template-columns:108px minmax(0,1fr);gap:12px 14px}.inscription-example-art{min-height:169px;padding:15px 8px 33px}.inscription-example-art>img{width:85px;height:95px}.inscription-example-copy>strong{font-size:22px}.inscription-example-level{font-size:8px;letter-spacing:.1px}.inscription-example-others{gap:5px}.inscription-example-others img{width:32px;height:32px;padding:3px;border-radius:7px}.inscription-example-copy>button{font-size:10px;padding:7px 6px}.inscription-example-note{font-size:10px}}
@media(max-width:350px){.inscription-examples{grid-template-columns:90px minmax(0,1fr);gap:12px 10px}.inscription-example-art>img{width:72px}.inscription-example-copy>strong{font-size:20px}.inscription-example-others img{width:29px;height:29px}.inscription-example-others{gap:4px}}
</style>

<style scoped>
.examples-compact{grid-template-columns:112px minmax(0,1fr);gap:8px 16px;margin:0 0 16px}
.examples-compact .inscription-example-art{min-height:120px;padding:8px 8px 25px;border-radius:16px}
.examples-compact .inscription-example-art>img{width:86px;height:86px}
.examples-compact .inscription-example-art>span{bottom:9px;font-size:7px}
.examples-compact .inscription-example-copy>strong{font-size:24px;margin:5px 0}
.examples-compact .inscription-example-copy>button{min-height:36px;margin-top:6px}
.examples-compact .inscription-example-note{font-size:11px;line-height:1.5}
@media(max-width:540px){.examples-compact{grid-template-columns:90px minmax(0,1fr);gap:7px 12px;margin-bottom:12px}.examples-compact .inscription-example-art{min-height:102px;padding:5px 5px 22px}.examples-compact .inscription-example-art>img{width:72px;height:72px}.examples-compact .inscription-example-copy>strong{font-size:21px}.examples-compact .inscription-example-level{font-size:9px}.examples-compact .inscription-example-copy>button{font-size:11px;min-height:34px;margin-top:4px}.examples-compact .inscription-example-note{font-size:11px}}
</style>
