<script setup>
import { computed } from 'vue'
import { PALETTES } from './palette.mjs'
const props = defineProps({ mode: String })
const c = computed(() => PALETTES[props.mode])
const trees = Array.from({ length: 460 }, (_, i) => ({ x: (i * 137 + 19) % 1140, y: (i * 97 + 37) % 770, size: .9 + i % 4 * .18 })).filter(p => {
  const core = p.x > 344 && p.x < 810 && p.y > 205 && p.y < 575
  const lake = p.x > 110 && p.x < 351 && p.y > 70 && p.y < 253
  const river = p.x > 849 && p.x < 963
  const ruins = p.x > 910 && p.y < 263
  return !core && !lake && !river && !ruins
})
const flowers = Array.from({ length: 290 }, (_, i) => ({ x: (i * 113 + 11) % 1148, y: (i * 59 + 7) % 764, pink: i % 3 === 0 }))
const mountains = [{x:10,y:35,s:2},{x:98,y:19,s:1.5},{x:230,y:20,s:2.1},{x:422,y:30,s:1.8},{x:640,y:16,s:2},{x:1040,y:40,s:1.9}]
</script>
<template>
  <svg class="wilds-art" viewBox="0 0 1152 768" shape-rendering="crispEdges" role="img" aria-label="A vast pixel world with GM Grove, Diamond Lake, Moon Ruins, and mushroom forests surrounding Souli village.">
    <defs>
      <pattern id="wild-grass" width="32" height="32" patternUnits="userSpaceOnUse"><rect width="32" height="32" :fill="c.grass" /><path d="M0 0H16V16H0ZM16 16H32V32H16Z" :fill="c.grass2" opacity=".45" /><path d="M6 7H8V5H9V9H6ZM22 25H24V22H25V27H22Z" :fill="c.grassLight" opacity=".6" /></pattern>
      <g id="wild-tree"><path d="M-9 3H13V9H-9Z" fill="#194b3a33" /><path d="M-3-13H4V8H-3Z" fill="#745745" /><path d="M-1-10H2V6H-1Z" fill="#a4794c" /><path d="M-4-34H5V-29H10V-23H15V-12H12V-5H5V-1H-6V-4H-13V-11H-16V-22H-11V-29H-4Z" :fill="c.leafDark" /><path d="M-4-35H4V-30H9V-24H12V-13H9V-7H-6V-9H-13V-21H-9V-28H-4Z" :fill="c.leaf" /><path d="M-4-32H3V-28H7V-23H-4V-18H-10V-24H-7V-28H-4Z" :fill="c.leafLight" /></g>
      <g id="wild-mushroom"><rect x="-2" y="-8" width="4" height="9" fill="#efd7ab" /><path d="M-4-16H5V-13H9V-7H-9V-12H-4Z" fill="#d7778c" /><path d="M-4-15H4V-13H7V-10H-7V-12H-4Z" fill="#f7a18d" /><path d="M-4-13H-1V-11H-4ZM3-11H5V-9H3Z" fill="#f9e7b4" /></g>
      <g id="wild-mountain"><path d="M-34 0V-12H-25V-29H-16V-43H-7V-52H4V-46H13V-32H23V-19H34V0Z" fill="#5f8690" /><path d="M-34 0V-12H-25V-29H-16V-43H-7V-52H2V0Z" fill="#82b1ae" /><path d="M-16-37V-43H-7V-52H4V-46H13V-37H5V-41H-5V-37Z" fill="#c9e4c8" /><path d="M4-22H11V-8H4ZM-22-12H-13V-5H-22Z" fill="#669893" /></g>
      <g id="wild-crystal"><path d="M-5-14L0-24H5L10-13V0L4 6H-5Z" fill="#8a66c8" /><path d="M0-23H4V2H0Z" fill="#e0b4fa" /><path d="M5-15H9V-2H5Z" fill="#b492e9" /><path d="M-5-13H-1V2H-5Z" fill="#7856b5" /></g>
    </defs>
    <rect width="1152" height="768" fill="url(#wild-grass)" />
    <path d="M0 0H1152V33H1080V44H944V28H795V46H642V28H499V43H342V31H199V40H63V29H0Z" :fill="c.leafDark" opacity=".48" />
    <use v-for="(m,i) in mountains" :key="`m${i}`" href="#wild-mountain" :transform="`translate(${m.x} ${m.y}) scale(${m.s})`" />
    <path d="M852 0H910V86H932V166H906V262H930V352H964V440H938V562H967V659H936V768H872V646H898V556H871V460H899V373H865V281H848V185H874V99H852Z" fill="#e5d296" />
    <path d="M861 0H901V94H921V159H895V269H920V358H954V434H928V568H957V653H926V768H881V640H908V550H881V466H909V366H875V275H858V193H884V91H861Z" :fill="c.waterDark" />
    <path d="M871 0H892V98H912V153H885V275H910V364H944V428H918V574H947V647H916V768H891V634H918V544H891V472H919V360H885V269H868V199H894V85H871Z" :fill="c.water" />
    <path d="M135 100H168V80H272V94H313V121H337V191H312V224H274V244H180V227H144V204H118V140H135Z" fill="#e4d59e" />
    <path d="M146 110H177V91H266V105H303V132H326V184H302V213H268V233H187V216H154V193H129V146H146Z" :fill="c.waterDark" />
    <path d="M163 124H188V108H255V120H287V144H309V174H285V201H257V216H198V200H168V182H147V153H163Z" :fill="c.water" />
    <path d="M172 148H211V150H172ZM248 171H285V173H248ZM206 193H239V195H206ZM184 117H196V119H184ZM881 39H891V43H881ZM894 131H910V135H894ZM885 301H906V305H885ZM925 410H943V414H925ZM902 616H918V620H902Z" fill="#b3f0df" />
    <path d="M292 391H112V541H263M726 387H1024V216M577 517V689H790" fill="none" :stroke="c.grass3" stroke-width="14" />
    <path d="M292 391H112V541H263M726 387H1024V216M577 517V689H790" fill="none" :stroke="c.soil" stroke-width="9" />
    <g transform="translate(920 387)"><rect x="-29" y="-12" width="66" height="26" fill="#82634e" /><path d="M-27-10H35V-7H-27ZM-27-4H35V-1H-27ZM-27 2H35V5H-27ZM-27 8H35V11H-27Z" fill="#bb9567" /><path d="M-28-15H37V-12H-28ZM-28 14H37V17H-28Z" fill="#ddbd82" /></g>
    <g opacity=".9"><g v-for="(f,i) in flowers" :key="`f${i}`" :transform="`translate(${f.x} ${f.y})`"><rect width="2" height="4" :fill="c.leafDark" /><rect x="-1" y="-1" width="4" height="2" :fill="f.pink ? '#f1a2cb' : '#f2df92'" /></g></g>
    <use v-for="(tree,i) in trees" :key="`t${i}`" href="#wild-tree" :transform="`translate(${tree.x} ${tree.y}) scale(${tree.size})`" />
    <g transform="translate(1009 178)"><path d="M-68-7H71V30H-68Z" fill="#4d886355" /><path d="M-64-6H67V19H-64Z" fill="#8ea5a5" /><path d="M-59-11H61V11H-59Z" fill="#bec3b3" /><path d="M-57-44H-42V5H-57ZM42-59H57V5H42ZM-21-80H-5V-40H-21Z" fill="#8e98ad" /><path d="M-59-48H-39V-39H-59ZM39-63H59V-55H39ZM-24-83H-2V-75H-24Z" fill="#d1d4bd" /><path d="M-53-38H-48V3H-53ZM46-53H51V3H46ZM-17-73H-12V-42H-17Z" fill="#b7bec7" /><path d="M-12-16H16V7H-12Z" fill="#8c6dac" /><path d="M-8-29H12V-15H-8ZM-4-39H8V-29H-4Z" fill="#ae8fd2" /><path d="M0-36H4V-17H0Z" fill="#e0c7eb" /><path d="M-66 23H70V27H-66ZM-70 29H74V32H-70Z" fill="#d3cfb3" /></g>
    <g transform="translate(174 557)"><path d="M-31-17H-11V6H-31Z" fill="#bc996a" /><path d="M-38-20L-21-50L-4-20Z" fill="#b981bd" /><path d="M-21-46L-7-22H-21Z" fill="#e6afd0" /><path d="M-25-5H-17V6H-25Z" fill="#715c78" /><path d="M26-8H56V3H26Z" fill="#8e684d" /><path d="M35-23H47V-7H35ZM38-32H44V-22H38Z" fill="#f7c867" /><path d="M39-22H43V-10H39Z" fill="#fff0a2" /><rect x="-5" y="15" width="23" height="5" fill="#aa7855" /></g>
    <g transform="translate(707 650)"><path d="M-37-5H46V24H-37Z" fill="#7777a0" /><path d="M-29-12H36V13H-29Z" fill="#999cc1" /><use href="#wild-crystal" x="-19" y="2" /><use href="#wild-crystal" x="6" y="-9" transform="scale(1.4)" /><use href="#wild-crystal" x="30" y="6" /></g>
    <use v-for="i in 29" :key="`mush${i}`" href="#wild-mushroom" :transform="`translate(${65 + i * 31 % 235} ${505 + i * 23 % 170}) scale(${1 + i % 3 * .4})`" />
    <g class="biome-names" text-anchor="middle" fill="#f7f0c5" font-family="monospace" font-size="10" font-weight="700" paint-order="stroke" stroke="#376851" stroke-width="2">
      <text x="242" y="65">DIAMOND LAKE</text><text x="574" y="148">GM GROVE</text><text x="1008" y="112">WEN MOON RUINS</text><text x="175" y="491">COZY DEGEN CAMP</text><text x="699" y="711">THE GEM DIP</text><text x="520" y="662">TOUCH GRASS FIELDS</text>
    </g>
  </svg>
</template>
