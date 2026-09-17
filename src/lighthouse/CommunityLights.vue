<script setup>
import { computed } from 'vue'
import { clusterLights } from './community.mjs'
import { ALTARS } from './engine.mjs'
const props = defineProps({ count: Number, light: Number, slot: Number, soul: Object })
const clusters = computed(() => clusterLights(props.count - props.light))
const home = computed(() => {
  const altar = ALTARS[props.slot ?? 0]
  return { x: 384 + altar.x * 3.84, y: 256 + altar.y * 2.56 }
})
const side = computed(() => home.value.x < 576 ? -1 : 1)
</script>

<template>
  <svg class="community-lights" viewBox="0 0 1152 768" shape-rendering="crispEdges" role="img" :aria-label="`Local visualization of ${count.toLocaleString('en-US')} lights in one world. Other lights are grouped, simulated holders.`">
    <rect width="1152" height="768" fill="#12263d" opacity=".65" />
    <g fill="none" stroke="#e1e5aa" opacity=".25" stroke-width="1">
      <path v-for="group in clusters.filter((_, i) => i % 16 === 0)" :key="group.id" :d="`M${group.x} ${group.y}L572 304`" stroke-dasharray="3 6" />
    </g>
    <g v-for="group in clusters" :key="group.id" :transform="`translate(${group.x} ${group.y})`" aria-hidden="true">
      <title>{{ group.count.toLocaleString('en-US') }} simulated holder lights</title>
      <rect x="-6" y="-6" width="12" height="12" fill="#f8cf87" opacity=".12" />
      <path d="M-2-5H2V-2H5V2H2V5H-2V2H-5V-2H-2Z" :fill="group.id % 3 ? '#fae5a2' : '#c7b2f2'" />
      <rect x="-1" y="-1" width="2" height="2" fill="#fffce8" />
    </g>
    <g transform="translate(572 304)" text-anchor="middle">
      <path d="M-8-20H8V-8H14V6H-14V-8H-8Z" fill="#fff2ab" />
      <rect x="-4" y="-28" width="8" height="9" fill="#fffbd8" />
      <text y="28" font-size="12" fill="#fff5ce" font-weight="900" paint-order="stroke" stroke="#263444" stroke-width="4">ONE BEACON</text>
    </g>
    <g v-if="light && soul" :transform="`translate(${home.x} ${home.y})`">
      <path :d="`M0 0L${side * 44}-45H${side * 97}`" fill="none" stroke="#d9fcb8" stroke-width="2" />
      <rect x="-13" y="-13" width="26" height="26" fill="none" stroke="#d9fcb8" stroke-width="2" />
      <image :href="soul.url" :x="side * 83 - 38" y="-114" width="76" height="76" />
      <rect :x="side * 83 - 38" y="-39" width="76" height="22" fill="#203c3c" stroke="#d9fcb8" />
      <text :x="side * 83" y="-24" text-anchor="middle" font-size="11" font-weight="900" fill="#efffc7">YOU · +1</text>
    </g>
  </svg>
</template>
