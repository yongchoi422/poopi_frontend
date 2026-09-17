<script setup>
import { computed } from 'vue'
import { ALTARS, ROLES, ROUTES } from './engine.mjs'
import { PALETTES } from './palette.mjs'

const props = defineProps({ mode: String, game: Object, souls: Array, selected: Number, paused: Boolean, selectedBuilding: String, launchPhase: String, contribution: Object, lightPulse: Number, helperSoul: Object })
const emit = defineEmits(['select', 'building'])
const buildings = [
  { id: 'lighthouse', name: 'HODL Lighthouse', x: 49, y: 39, width: 18, height: 24 },
  { id: 'home', name: 'Cozy Soul House', x: 18, y: 57, width: 11, height: 15 },
  { id: 'workshop', name: 'Proof of Vibes', x: 82, y: 57, width: 13, height: 16 },
  { id: 'observatory', name: 'Wen Moon Observatory', x: 53, y: 81, width: 12, height: 18 },
]
const colors = computed(() => PALETTES[props.mode])
const routePaths = ROUTES.map(route => route.map((p, i) => `${i ? 'L' : 'M'}${Math.round(p.x * 3.84)} ${Math.round(p.y * 2.56)}`).join(' '))
const tiles = Array.from({ length: 384 }, (_, i) => ({ x: (i % 24) * 16, y: Math.floor(i / 24) * 16, kind: ((i * 71 + 9) % 13) % 3 }))
const grass = Array.from({ length: 190 }, (_, i) => ({ x: (i * 47 + 5) % 382, y: (i * 61 + 7) % 254, light: i % 3 === 0 }))
const trees = [
  ...Array.from({ length: 18 }, (_, i) => ({ x: i * 24 - 13, y: i % 3 * 9 - 7, size: i % 3 === 0 ? 1.2 : 1 })),
  ...Array.from({ length: 11 }, (_, i) => ({ x: i % 2 * 23 - 7, y: 39 + i * 19, size: 1 + i % 2 * .15 })),
  ...Array.from({ length: 13 }, (_, i) => ({ x: 346 + i % 2 * 24, y: 31 + i * 18, size: 1 + i % 3 * .1 })),
  ...Array.from({ length: 12 }, (_, i) => ({ x: 93 + i * 25, y: 239 + i % 2 * 8, size: 1.15 })),
  { x: 57, y: 40, size: .9 }, { x: 309, y: 42, size: 1.1 }, { x: 311, y: 194, size: .8 }, { x: 56, y: 175, size: .9 },
]
const wall = [
  ...Array.from({ length: 10 }, (_, i) => ({ x: 109 + i * 16, y: 56 })),
  ...Array.from({ length: 4 }, (_, i) => ({ x: 77, y: 73 + i * 12 })),
  ...Array.from({ length: 5 }, (_, i) => ({ x: 304, y: 94 + i * 12 })),
  ...Array.from({ length: 5 }, (_, i) => ({ x: 94 + i * 16, y: 188 })),
  ...Array.from({ length: 4 }, (_, i) => ({ x: 225 + i * 16, y: 188 })),
]
const stones = Array.from({ length: 46 }, (_, i) => ({ x: 60 + i * 37 % 268, y: 37 + i * 31 % 173 }))
const flowerBeds = [{ x: 142, y: 57 }, { x: 228, y: 63 }, { x: 89, y: 167 }, { x: 270, y: 166 }]
const working = computed(() => props.game.status === 'running' && !props.paused)
const lightAltar = computed(() => ALTARS[props.contribution?.slot ?? 0])
</script>

<template>
  <div class="pixel-village" :class="{ 'world-working': working }">
    <svg class="world-art" viewBox="0 0 384 256" shape-rendering="crispEdges" role="img" aria-label="Souli pixel village with a lighthouse, walls, houses and six real on-chain SVG souls.">
      <defs>
        <g id="village-tree">
          <path d="M-9 8H10V12H-9Z" fill="#365c4938" />
          <path d="M-3-6H3V10H-3Z" fill="#665744" /><path d="M-1-4H2V8H-1Z" fill="#947453" />
          <path d="M-4-29H4V-25H9V-21H13V-14H16V-6H12V0H5V3H-6V0H-13V-5H-16V-13H-13V-21H-8V-25H-4Z" :fill="colors.leafDark" />
          <path d="M-4-30H4V-26H8V-22H12V-15H14V-8H9V-3H-7V-5H-13V-14H-11V-21H-7V-25H-4Z" :fill="colors.leaf" />
          <path d="M-4-28H3V-24H6V-21H9V-17H-5V-14H-11V-20H-7V-24H-4Z" :fill="colors.leafLight" />
          <path d="M-10-10H-6V-8H-2V-5H-7V-7H-10ZM3-19H7V-17H3Z" :fill="colors.leafLight" />
        </g>
        <g id="village-wall">
          <path d="M-7 1H8V8H-7Z" fill="#42585c44" /><path d="M-7-8H8V5H-7Z" fill="#586c75" />
          <path d="M-7-9H8V0H-7Z" :fill="colors.stone" /><path d="M-7-10H8V-7H-7Z" fill="#bdc6b6" />
          <path d="M-7-14H-3V-9H-7ZM3-14H8V-9H3Z" fill="#a7b5aa" /><path d="M-6-4H0V-3H-6ZM2-7H3V-1H2Z" fill="#617780" />
        </g>
        <g id="village-crystal"><path d="M-4 0L-2-9H1L4-5V2L0 5H-3Z" fill="#6854a3" /><path d="M-2-9H1V1H-2Z" fill="#d8aeec" /><path d="M1-6H3V0H1Z" fill="#a889d2" /><path d="M-4 1H0V3H-4Z" fill="#8d6cbd" /></g>
        <g id="village-lamp"><path d="M-1-9H1V4H-1Z" fill="#665541" /><path d="M-3-15H3V-8H-3Z" fill="#776449" /><path d="M-2-14H2V-10H-2Z" fill="#ffe8a2" /><path d="M-1-16H1V-14H-1Z" fill="#9c8150" /></g>
      </defs>
      <rect width="384" height="256" :fill="colors.grass" />
      <rect v-for="(tile, i) in tiles" :key="`t${i}`" :x="tile.x" :y="tile.y" width="16" height="16" :fill="tile.kind === 0 ? colors.grass : tile.kind === 1 ? colors.grass2 : colors.grass3" opacity=".65" />
      <path d="M0 170H11V185H26V202H43V216H67V231H88V246H104V256H0Z" fill="#c7c99a" />
      <path d="M0 180H7V192H18V210H34V223H60V237H81V249H96V256H0Z" :fill="colors.waterDark" />
      <path d="M0 187H4V199H14V215H29V229H56V244H76V253H0Z" :fill="colors.water" />
      <path d="M4 225H18V227H4ZM24 240H40V242H24ZM4 245H10V247H4ZM38 230H50V232H38Z" fill="#a9dee0" />
      <g opacity=".7"><path v-for="(tuft,i) in grass" :key="`g${i}`" :d="`M${tuft.x} ${tuft.y}h2v-2h1v3h-3Z`" :fill="tuft.light ? colors.grassLight : colors.grass3" /></g>
      <g stroke-linejoin="miter" fill="none"><path v-for="(path,i) in routePaths" :key="`r${i}`" :d="path" stroke="#557a4e" stroke-width="16" /><path v-for="(path,i) in routePaths" :key="`p${i}`" :d="path" :stroke="colors.soil" stroke-width="11" /><path d="M77 140H114L143 160H230L305 146M188 100V164L204 207" :stroke="colors.soil" stroke-width="9" /></g>
      <g opacity=".48"><rect v-for="(stone,i) in stones" :key="`s${i}`" :x="stone.x" :y="stone.y" width="3" height="2" fill="#c6cda0" /></g>
      <g v-for="(bed,i) in flowerBeds" :key="`f${i}`" :transform="`translate(${bed.x} ${bed.y})`"><rect width="20" height="10" fill="#627c4c" /><rect x="1" y="1" width="18" height="8" fill="#4e6d43" /><g v-for="n in 6" :key="n"><rect :x="2 + (n % 3) * 6" :y="2 + Math.floor(n / 3) * 3" width="2" height="2" :fill="i % 2 ? '#ead2b1' : '#cfb3d9'" /></g></g>
      <use v-for="(part,i) in wall" :key="`w${i}`" href="#village-wall" :x="part.x" :y="part.y" />

      <!-- The main building is drawn in whole SVG pixels, on the same grid as the souls. -->
      <g v-if="launchPhase === 'live'" class="launch-sparkles" aria-label="Launch example: illuminated beacon">
        <path d="M178 43H101V39H129V35H179ZM198 43H280V39H247V35H197Z" fill="#fff0b4" opacity=".5" />
        <path d="M129 58h2v4h4v2h-4v4h-2v-4h-4v-2h4ZM246 72h2v4h4v2h-4v4h-2v-4h-4v-2h4Z" fill="#fff3bb" />
        <path d="M151 92V69H153V92ZM224 92V69H226V92Z" fill="#6a6656" />
        <path d="M153 69H168V79H153Z" fill="#d3b2e9" /><path d="M226 69H241V79H226Z" fill="#f8d889" />
      </g>
      <g transform="translate(188 101)">
        <path d="M-31-8H31V16H-31Z" fill="#49665566" /><path d="M-29-12H29V12H-29Z" fill="#777f78" /><path d="M-27-15H27V7H-27Z" fill="#b4baa6" />
        <path d="M-25-14H25V3H-25Z" fill="#d1cfb1" /><path d="M-25 4H25V8H-25Z" fill="#858f88" />
        <path d="M-12-39H13V3H-12Z" fill="#9daaa7" /><path d="M-12-39H-4V3H-12Z" fill="#ced0b7" /><path d="M8-39H13V3H8Z" fill="#6e8790" />
        <path d="M-17-43H18V-36H-17Z" fill="#5f637c" /><path d="M-15-46H16V-40H-15Z" fill="#9c95ae" />
        <path d="M-11-61H12V-47H-11Z" fill="#725b63" /><path d="M-8-60H9V-48H-8Z" fill="#efc776" />
        <path d="M-4-58H5V-49H-4Z" fill="#fff0ab" class="beacon-core" />
        <path d="M-16-64H17V-60H-16ZM-12-68H13V-64H-12ZM-7-72H8V-68H-7ZM-2-76H3V-72H-2Z" fill="#706a90" />
        <path d="M-12-66H8V-64H-12ZM-7-70H3V-68H-7Z" fill="#a1a0bd" />
        <path d="M-3-22H5V-15H-3Z" fill="#526b78" /><path d="M-1-21H3V-16H-1Z" fill="#ffdfa0" />
        <path d="M-5-4H6V5H-5Z" fill="#586369" /><path d="M-3-3H4V5H-3Z" fill="#796856" /><path d="M-8 8H10V11H-8ZM-11 11H13V14H-11Z" fill="#d6d3b6" />
        <path d="M-23-7H-17V-1H-23ZM18-7H23V-1H18Z" fill="#859493" />
        <path d="M-22-6H-19V-2H-22ZM19-6H22V-2H19Z" fill="#f1cd85" />
      </g>

      <g transform="translate(69 145)">
        <rect x="-17" y="-6" width="39" height="17" fill="#3b654344" /><path d="M-16-19H17V6H-16Z" fill="#d3b995" /><path d="M10-18H18V6H10Z" fill="#9a977f" />
        <path d="M-21-21H22V-17H-21ZM-17-26H18V-21H-17ZM-13-31H14V-26H-13ZM-8-36H9V-31H-8Z" fill="#b67574" /><path d="M-17-24H14V-22H-17ZM-13-29H10V-27H-13ZM-8-34H6V-32H-8Z" fill="#dea693" />
        <path d="M-11-12H-4V-5H-11ZM6-12H13V-5H6Z" fill="#6c7e86" /><path d="M-10-11H-5V-6H-10ZM7-11H12V-6H7Z" fill="#f6dba1" /><path d="M-2-8H4V6H-2Z" fill="#706854" />
        <rect x="-18" y="5" width="38" height="3" fill="#adae93" /><use href="#village-lamp" x="-21" y="7" />
      </g>
      <g transform="translate(315 145)">
        <rect x="-23" y="-4" width="44" height="17" fill="#3b654344" /><path d="M-20-24H18V8H-20Z" fill="#a7ad95" /><path d="M10-23H20V8H10Z" fill="#7b9286" />
        <path d="M-24-26H23V-20H-24ZM-19-31H18V-26H-19ZM-13-36H12V-31H-13Z" fill="#697fa0" /><path d="M-19-29H15V-27H-19ZM-13-34H9V-32H-13Z" fill="#9cacbc" />
        <rect x="11" y="-42" width="6" height="15" fill="#b4b1a1" /><rect x="10" y="-43" width="8" height="3" fill="#d2cbbb" />
        <path d="M-15-15H-3V-2H-15Z" fill="#6b655b" /><path d="M-13-13H-5V-4H-13Z" fill="#e6b878" /><path d="M3-11H12V8H3Z" fill="#596d69" />
        <rect x="-28" y="1" width="9" height="9" fill="#b69968" /><path d="M-28 4H-19V6H-28ZM-25 1H-23V10H-25Z" fill="#806f51" />
      </g>
      <g transform="translate(204 207)">
        <path d="M-18-8H20V8H-18Z" fill="#3b654344" /><path d="M-16-20H16V4H-16Z" fill="#aaa6b6" /><path d="M8-20H17V4H8Z" fill="#797f99" />
        <path d="M-20-22H21V-17H-20ZM-16-27H17V-22H-16ZM-11-32H12V-27H-11ZM-5-35H6V-32H-5Z" fill="#8a7faa" /><path d="M-11-30H7V-28H-11Z" fill="#bdb0d2" />
        <path d="M-5-15H5V-5H-5Z" fill="#6a7798" /><path d="M-3-13H3V-7H-3Z" fill="#cbe2d3" /><path d="M-3-3H5V5H-3Z" fill="#665e7c" />
        <path d="M13-31H23V-26H13ZM20-34H26V-26H20Z" fill="#d3bf92" /><path d="M25-35H28V-25H25Z" fill="#727b90" />
      </g>

      <g transform="translate(285 201)"><rect x="-17" y="-8" width="34" height="18" fill="#a18c66" /><rect x="-15" y="-6" width="30" height="14" fill="#786e53" /><g v-for="n in 12" :key="`crop${n}`"><rect :x="-12 + (n % 4) * 7" :y="-6 + Math.floor(n / 4) * 4" width="4" height="2" fill="#adbd7f" /><rect :x="-11 + (n % 4) * 7" :y="-5 + Math.floor(n / 4) * 4" width="2" height="3" fill="#70915d" /></g></g>
      <g transform="translate(94 206)"><path d="M-16-2H16V8H-16Z" fill="#738777" /><use href="#village-crystal" x="-10" y="2" /><use href="#village-crystal" x="1" y="-4" /><use href="#village-crystal" x="11" y="3" /></g>
      <use v-for="(tree,i) in trees" :key="`tree${i}`" href="#village-tree" :transform="`translate(${tree.x} ${tree.y}) scale(${tree.size})`" />
      <use v-for="(p,i) in [{x:151,y:137},{x:255,y:105},{x:118,y:188},{x:273,y:184},{x:84,y:62}]" :key="`lamp${i}`" href="#village-lamp" :x="p.x" :y="p.y" />

      <g v-for="(altar,i) in ALTARS" :key="`a${i}`" :transform="`translate(${Math.round(altar.x * 3.84)} ${Math.round(altar.y * 2.56)})`">
        <path d="M-16-2H16V8H-16Z" fill="#486b5544" /><path d="M-14-4H14V5H-14Z" fill="#778984" /><path d="M-16-7H16V1H-16Z" fill="#bdc3a7" /><path d="M-13-9H13V-3H-13Z" fill="#d1d0b3" /><path d="M-10-7H10V-4H-10Z" :fill="ROLES[game.roles[i]].color" opacity=".65" />
      </g>
      <g v-if="contribution" aria-label="Local demo lantern path">
        <path v-if="contribution.light" d="M143 160H230" stroke="#ffedac" stroke-width="9" opacity=".3" />
        <g v-for="n in 16" :key="`shared-lamp${n}`" :transform="`translate(${141 + (n - 1) * 6} 170)`">
          <rect x="-1" y="-5" width="2" height="6" fill="#5f6454" />
          <rect x="-2" y="-10" width="4" height="5" :fill="n <= contribution.lanterns ? (n === 16 ? '#d4ff9e' : '#ffdfa3') : '#4c6570'" />
        </g>
        <g v-if="contribution.light" :key="lightPulse">
          <path class="contribution-ray" :d="`M${lightAltar.x * 3.84} ${lightAltar.y * 2.56 - 10}L188 47`" fill="none" stroke="#ecffbd" stroke-width="1" stroke-dasharray="3 2" />
          <path class="contribution-arrival" d="M173 32H203V62H173Z" fill="none" stroke="#ffefa2" stroke-width="3" />
          <path d="M220 147h2v4h4v2h-4v4h-2v-4h-4v-2h4Z" fill="#e3ffb1" />
        </g>
      </g>
      <g v-if="working" class="map-effects">
        <path v-for="(pair,i) in game.links" :key="`link${i}`" :d="`M${ALTARS[pair[0]].x * 3.84} ${ALTARS[pair[0]].y * 2.56 - 8}L${ALTARS[pair[1]].x * 3.84} ${ALTARS[pair[1]].y * 2.56 - 8}`" stroke="#ebedb2" stroke-width=".65" stroke-dasharray="2 3" opacity=".7" />
      </g>
      <g v-for="enemy in game.enemies" :key="`e${enemy.id}`" :transform="`translate(${Math.round(enemy.x * 3.84)} ${Math.round(enemy.y * 2.56)}) scale(${enemy.boss ? 1.8 : 1})`">
        <path d="M-4-11H4V-9H7V-3H5V0H-5V-3H-7V-9H-4Z" :fill="enemy.slowed ? '#9080b6' : '#535170'" /><path d="M-3-7H-1V-5H-3ZM2-7H4V-5H2Z" fill="#e8d6db" /><rect x="-6" y="-15" width="12" height="2" fill="#444a56" /><rect x="-6" y="-15" :width="Math.round(12 * enemy.hp / enemy.maxHp)" height="2" fill="#d6b6ce" />
      </g>
      <path v-for="(beam,i) in game.beams" :key="`beam${i}`" :d="`M${ALTARS[beam.from].x * 3.84} ${ALTARS[beam.from].y * 2.56 - 15}L${beam.x * 3.84} ${beam.y * 2.56 - 5}`" :stroke="ROLES[game.roles[beam.from]].color" stroke-width="1" />
      <g v-if="mode === 'up' && working" class="memory-sparks"><g v-for="i in 5" :key="`spark${i}`" :transform="`translate(${74 + i * 43} ${50 + i % 3 * 63})`" :style="{ animationDelay: `${i * -.5}s` }"><path d="M-1-6H1V-1H5V1H1V5H-1V1H-5V-1H-1Z" fill="#fff3b0" /></g></g>
    </svg>
    <button v-for="building in buildings" :key="building.id" class="map-building" :class="{ 'building-selected': selectedBuilding === building.id }" :style="{ left: `${building.x}%`, top: `${building.y}%`, width: `${building.width}%`, height: `${building.height}%` }" :aria-label="`Inspect ${building.name}`" @click="emit('building', building.id)"><span>{{ building.name }}</span></button>
    <button v-for="(altar,i) in ALTARS" :key="`soul${i}`" class="map-soul" :class="{ selected: selected === i && !selectedBuilding }" :style="{ left: `${altar.x}%`, top: `${altar.y}%`, '--soul-delay': `${i * -.4}s` }" :aria-label="`${altar.name}, ${ROLES[game.roles[i]].name}, select soul`" :aria-pressed="selected === i && !selectedBuilding" @click="emit('select', i)">
      <span v-if="selected === i && !selectedBuilding" class="soul-selection">▼</span><img :src="souls[i].url" :alt="souls[i].label" class="soul-sprite" draggable="false" /><span class="soul-role">{{ ROLES[game.roles[i]].mark }}</span>
      <span v-if="contribution?.light && contribution.slot === i" class="personal-light-tag">{{ helperSoul?.url === souls[i].url ? 'YOUR LIGHT' : 'YOUR LANTERN' }} +1 · DEMO</span>
    </button>
  </div>
</template>
