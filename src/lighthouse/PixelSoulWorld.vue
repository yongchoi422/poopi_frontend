<script setup>
import { computed } from 'vue'
import { clusterLights } from './community.mjs'
const props = defineProps({ mode: String, active: Boolean, light: Number, overview: Boolean, souls: Array, launchPhase: String, game: Object })
const sky = computed(() => props.mode === 'down' ? ['#111a3b', '#253754', '#46547c', '#617d95'] : props.mode === 'up' ? ['#262453', '#4a5d98', '#73b4c4', '#b4d7c0'] : ['#292952', '#485b86', '#7aafba', '#bbd7be'])
const stars = Array.from({ length: 120 }, (_, i) => ({ x: 12 + i * 197 % 1170, y: 15 + i * 83 % 445, s: i % 8 === 0 ? 3 : 1 }))
const clouds = [{x:90,y:154,s:1.6},{x:423,y:127,s:1},{x:850,y:167,s:2},{x:1120,y:286,s:1.5},{x:220,y:450,s:1.7},{x:684,y:408,s:1.2}]
const islands = [{x:550,y:318,w:110},{x:250,y:379,w:140},{x:769,y:391,w:143},{x:977,y:245,w:91},{x:55,y:516,w:142}]
const mountains = Array.from({ length: 13 }, (_, i) => ({ x: i * 116 - 100, y: 643 + i % 3 * 23, s: 1.2 + i % 4 * .35 }))
const pines = Array.from({ length: 45 }, (_, i) => ({x: i * 31 - 30, y: 739 + i % 3 * 3, s: .6 + i % 4 * .2}))
const trees = [{x:74,y:739,s:1.2},{x:153,y:731,s:1.6},{x:271,y:752,s:.9},{x:420,y:739,s:1.1},{x:724,y:733,s:1.25},{x:867,y:744,s:1.05},{x:1040,y:717,s:1.65},{x:1134,y:726,s:1.3}]
const ore = Array.from({length:190},(_,i)=>({x:17+i*137%1170,y:808+i*173%1530,s:i%3+2}))
const crystals = Array.from({length:28},(_,i)=>({x:55+i*113%1100,y: i%2 ? 1772 : 1530 + i%5*8,s:.55+i%4*.3}))
const shrooms = Array.from({length:32},(_,i)=>({x:25+i*157%1150,y: i%2 ? 1290 : 1093,s:.55+i%4*.24}))
const vines = Array.from({length:32},(_,i)=>({x:20+i*39,y:939+i%4*12,h:45+i%5*18}))
const embers = Array.from({length:42},(_,i)=>({x:30+i*137%1130,y:1930+i*79%350,d:i%7}))
const residentPlaces = [[185,738],[925,744],[710,730],[568,316],[855,389],[308,377],[113,514],[368,1092],[519,1205],[948,1290],[764,1094],[695,1703],[859,1546],[335,1770],[1075,1760],[750,2120],[292,2200],[931,2215]]
const lights = computed(() => props.overview ? clusterLights(99999).map(p => ({...p, y: 70 + p.y / 768 * 2250})) : [])
</script>

<template>
  <svg class="soul-world-art" viewBox="0 0 1200 2400" shape-rendering="crispEdges" role="img" aria-label="SOULI's pixel cutaway world: floating sky islands, a forest village, glowing roots, crystal caverns and a lava abyss." :class="[{ 'residents-active': active }, `world-weather-${mode}`]">
    <defs>
      <pattern id="sw-soil" width="24" height="24" patternUnits="userSpaceOnUse"><rect width="24" height="24" fill="#514b52"/><path d="M1 1h10v6H1Zm13 10h10v7H13ZM0 19h9v4H0Z" fill="#64565a"/><path d="M3 3h5v2H3Zm12 9h4v2h-4Z" fill="#7e6961"/><path d="M8 12h4v3H8Z" fill="#393e49"/></pattern>
      <pattern id="sw-rock" width="32" height="24" patternUnits="userSpaceOnUse"><rect width="32" height="24" fill="#28374b"/><path d="M2 2h15v8H2Zm17 11h15v9H17ZM0 12h14v10H0Z" fill="#324359"/><path d="M4 3h10v2H4Zm15 10h10v2H19Z" fill="#43506b"/></pattern>
      <pattern id="sw-brick" width="18" height="14" patternUnits="userSpaceOnUse"><rect width="18" height="14" fill="#8a94a0"/><path d="M0 0h18v2H0Zm0 7h18v2H0ZM8 0h2v7H8ZM0 7h2v7H0Z" fill="#656e80"/><path d="M2 2h5v1H2Zm8 7h6v1h-6Z" fill="#b9b9ae"/></pattern>
      <linearGradient id="sw-beam" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#fdf2c4" stop-opacity="0"/><stop offset="1" stop-color="#fdf2c4" stop-opacity=".32"/></linearGradient>
      <linearGradient id="sw-lava-glow" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#fa755b" stop-opacity="0"/><stop offset="1" stop-color="#fa755b" stop-opacity=".32"/></linearGradient>
      <linearGradient id="sw-sky" x1="0" x2="0" y1="0" y2="1"><stop :stop-color="sky[0]"/><stop offset=".35" :stop-color="sky[1]"/><stop offset=".7" :stop-color="sky[2]"/><stop offset="1" :stop-color="sky[3]"/></linearGradient>
      <g id="sw-cloud"><path d="M-46-8h12v-9h17v-8H5v6h20v9h16v8h10v8H-46Z" fill="#cadad7"/><path d="M-41 3H45v7H-41Z" fill="#a9c5cc"/><path d="M-28-10h14v-9H2v6h22v6H-28Z" fill="#e2e8d7"/></g>
      <g id="sw-pine"><path d="M-4-15H4V0H-4Z" fill="#41535d"/><path d="M-8-90H7v12h9v15h9v14h9v15h9v14H-42v-12h9v-16h9v-15h9v-15h7Z" fill="currentColor"/><path d="M-7-79H2v16h8v15h10v16h12v6H2v-11H-8v-17H-15v-9h8Z" fill="#84bdb0" opacity=".12"/></g>
      <g id="sw-tree"><path d="M-9-92H8V0H-11V-41H-18v-16h9ZM7-69h15v-12h8v20H8Z" fill="#614c45"/><path d="M-4-84H2V-7H-4Z" fill="#998063"/><path d="M-39-104h14v-15H7v7h23v10h15v17h9v20H40v10H13v9h-29v-7H-45v-11H-58v-25h9v-9h10Z" fill="#245f55"/><path d="M-34-107h16v-12H6v10h21v13h18v17H31v10H2v7h-27v-7H-47v-17h8v-13h5Z" fill="#3a9971"/><path d="M-20-113H3v11h20v9H6v8h-30v9h-19v-12h8v-13h15Z" fill="#76c68a"/><path d="M-24-101h10v4h-10ZM5-92h8v4H5ZM20-80h8v3h-8Z" fill="#b6d79a"/></g>
      <g id="sw-crystal"><path d="M-7-33L0-45l7 10v30L0 1l-7-7Z" fill="#789bdd"/><path d="M0-43l4 10v28L0-1Z" fill="#c5ffff"/><path d="M-19-20l7-9 8 8v19h-11Z" fill="#817ecd"/><path d="M-12-26v21h4v-15Z" fill="#c7b5f4"/><path d="M8-17l6-10 8 7v16l-14 5Z" fill="#5aa6bd"/><path d="M14-24v21h3v-17Z" fill="#a4f9ec"/></g>
      <g id="sw-shroom"><path d="M-3-15H3V0H-3Z" fill="#bac9bd"/><path d="M-8-28H7v5h8v6h6v7H-21v-8h6v-6h7Z" fill="#9c79c7"/><path d="M-8-27H5v5h8v5H-16v-5h8Z" fill="#d5a5dc"/><path d="M-15-14H15v3H-15Z" fill="#76d5c5"/><path d="M-7-24h4v3h-4ZM4-20h4v3H4Z" fill="#f2d9e9"/></g>
      <g id="sw-torch"><rect x="-2" y="-7" width="4" height="15" fill="#746457"/><path d="M-4-17H4v12H-4Z" fill="#e8a85d"/><path d="M-2-23H2v14H-2Z" fill="#fff3b5"/><rect x="-10" y="-25" width="20" height="22" fill="#ffcf8a" opacity=".12"/></g>
      <g id="sw-house"><path d="M-43-51H43V0H-43Z" fill="#6a5d58"/><path d="M-38-49H38V-3H-38Z" fill="#ad8e70"/><path d="M-40-38H40v4H-40ZM-40-24H40v3H-40ZM-40-10H40v3H-40Z" fill="#88735e"/><path d="M-54-52h8v-9h10v-10h12v-9h48v9h13v10h11v9h7v7H-54Z" fill="#6c718f"/><path d="M-46-55h11v-10h12v-9h45v9h13v10h11v3H-46Z" fill="#959db0"/><path d="M-23-76H20v5H-23ZM-34-65h13v4h-13Z" fill="#bcbfc0"/><rect x="-8" y="-28" width="16" height="28" fill="#514e51"/><rect x="-29" y="-34" width="14" height="17" fill="#554e62"/><rect x="17" y="-34" width="14" height="17" fill="#554e62"/><path d="M-27-32h10v13h-10ZM19-32h10v13H19Z" fill="#efd394"/><path d="M-23-32h2v13h-2ZM23-32h2v13h-2Z" fill="#9d8067"/><rect x="27" y="-87" width="10" height="28" fill="#8b7e7c"/><path d="M-45-3H45v5H-45Z" fill="#c4b58a"/></g>
    </defs>

    <!-- Sky and the distant forest are full layers; everything uses the same pixel grid. -->
    <rect width="1200" height="2400" fill="#151d30"/>
    <rect width="1200" height="830" fill="url(#sw-sky)"/>
    <g class="world-stars"><rect v-for="(s,i) in stars" :key="i" :x="s.x" :y="s.y" :width="s.s" :height="s.s" fill="#ece0cd" :opacity=".4+i%3*.25"/></g>
    <g transform="translate(836 109)"><path d="M-22-29H16v7h13v36H17v12H-20V15H-30v-33h8Z" fill="#d6d2c1"/><path d="M-9-29H16v7h13v36H17v12H2V14H-10V-3h-7v-17h8Z" fill="#ece7cf"/><path d="M5-7h8v8H5ZM-16 6h7v6h-7Z" fill="#bbbfc2"/></g>
    <path d="M142 97L239 68H279L216 94H190L172 103Z" fill="#adddda" opacity=".35"/>
    <use v-for="(c,i) in clouds" :key="`cl${i}`" href="#sw-cloud" :transform="`translate(${c.x} ${c.y}) scale(${c.s})`" opacity=".72"/>
    <g v-for="(island,i) in islands" :key="`island${i}`" :transform="`translate(${island.x} ${island.y})`">
      <path :d="`M0 0H${island.w}V19H${island.w-13}V37H${island.w-30}V56H${island.w-48}V81H43V56H20V34H7V17H0Z`" fill="#655774"/>
      <path :d="`M8 12H${island.w-10}V25H${island.w-35}V44H40V29H20Z`" fill="#857187"/>
      <rect x="-3" y="-6" :width="island.w+6" height="7" fill="#bddbb2"/><rect y="1" :width="island.w" height="6" fill="#658c7e"/>
      <use href="#sw-tree" :x="island.w * .67" transform="scale(.6)"/>
      <path :d="`M${island.w-20} 8v70h-4v32h-4v-67h2V8Z`" fill="#a5ddde" opacity=".7"/>
      <use href="#sw-crystal" :x="island.w-23" y="-6" transform="scale(.65)"/>
    </g>
    <path d="M584 465L484 0H716L616 465Z" fill="url(#sw-beam)" class="world-beacon-beam"/>
    <g opacity=".65"><path v-for="(m,i) in mountains" :key="i" :d="`M${m.x-120*m.s} ${m.y+70}v-36h${35*m.s}v-48h${34*m.s}v-43h${31*m.s}v-39h${20*m.s}v39h${29*m.s}v43h${29*m.s}v48h${43*m.s}v36Z`" :fill="i%2 ? '#5e8598' : '#6f939e'"/></g>
    <use v-for="(p,i) in pines" :key="`pine${i}`" href="#sw-pine" :transform="`translate(${p.x} ${p.y}) scale(${p.s*1.6})`" :color="i%2 ? '#447b7b' : '#518c87'" opacity=".65"/>
    <path d="M0 742H86V730H220V752H319V736H490V746H660V730H790V744H980V711H1100V726H1200V955H0Z" fill="url(#sw-soil)"/>
    <path d="M0 742H86V730H220V752H319V736H490V746H660V730H790V744H980V711H1100V726H1200" fill="none" stroke="#558463" stroke-width="14"/>
    <path d="M0 735H86V723H220V745H319V729H490V739H660V723H790V737H980V704H1100V719H1200" fill="none" stroke="#a0c77c" stroke-width="5"/>
    <path d="M0 771H110v-9h70v23H70v18H0ZM276 773H427v18H386v26H301v-12H276ZM811 785h136v22H908v21H853v-14H811Z" fill="#796451"/>
    <g v-for="(o,i) in ore" :key="`ore${i}`"><rect :x="o.x" :y="o.y" :width="o.s*2" :height="o.s" :fill="i%4 ? '#b0a081' : '#87abaf'" opacity=".22"/></g>
    <use v-for="(t,i) in trees" :key="`tree${i}`" href="#sw-tree" :transform="`translate(${t.x} ${t.y}) scale(${t.s})`"/>
    <use href="#sw-house" x="327" y="735"/><use href="#sw-house" x="843" y="741"/><use href="#sw-house" transform="translate(178 731) scale(.82)"/><use href="#sw-house" transform="translate(1052 716) scale(.85)"/>
    <g transform="translate(430 739)"><rect x="-29" y="-12" width="54" height="12" fill="#4e6950"/><path d="M-23-24h3v22h-3ZM-12-28h3v26h-3ZM0-25h3v23H0ZM12-21h3v19h-3Z" fill="#93bd6d"/><path d="M-26-20h9v6h-9ZM-15-24h9v6h-9ZM-3-21h9v6H-3ZM9-17h9v6H9Z" fill="#bfc887"/></g>
    <!-- A tall home beacon, with warm windows and a usable bridge beneath it. -->
    <g transform="translate(600 741)">
      <path d="M-57-19H57V0H-57Z" fill="#626876"/><path d="M-49-219H48V-19H-49Z" fill="url(#sw-brick)"/><path d="M-49-219H-34V-19H-49Z" fill="#b9b5a2" opacity=".6"/><path d="M34-219H48V-19H34Z" fill="#535e73" opacity=".6"/>
      <path d="M-57-231H58v14H-57ZM-63-242H64v10H-63Z" fill="#9d9bab"/><path d="M-46-282H46v40H-46Z" fill="#514d65"/><path d="M-35-278H35v32H-35Z" fill="#e5b875"/><path d="M-18-275H18v27H-18Z" fill="#fff0b1" class="world-beacon-window"/><path d="M-5-272H5v23H-5Z" fill="#fff8d9"/>
      <path d="M-60-284H60v-8H45v-11H30v-10H15v-14H4v-21H-4v21H-15v14H-30v10H-45v11H-60Z" fill="#6a6590"/><path d="M-42-297H30v5H-42ZM-27-308H18v5H-27ZM-12-318H3v5H-12Z" fill="#b4a6c2"/>
      <g v-for="n in 3" :key="n" :transform="`translate(0 ${-194+n*43})`"><rect x="-10" y="-13" width="20" height="27" fill="#565b70"/><rect x="-6" y="-9" width="12" height="19" fill="#e7c180"/><path d="M-1-9H1v19H-1Z" fill="#9f8f77"/></g>
      <path d="M-13-31H13V0H-13Z" fill="#424656"/><path d="M-9-25H9V0H-9Z" fill="#736858"/><path d="M-63 0H63v7H-63ZM-70 7H70v7H-70Z" fill="#c9bea1"/>
      <path d="M-47-201H-97v8h50ZM47-170h94v8H47Z" fill="#a6a193"/><path d="M-89-194v77h4v-77ZM118-162v39h4v-39Z" fill="#5f6c6d"/>
      <rect x="-103" y="-216" width="8" height="18" fill="#d1b1d7"/><rect x="136" y="-185" width="8" height="19" fill="#b8d3b0"/>
    </g>
    <path d="M486 753H715v10H486Z" fill="#a49470"/><path d="M488 755H713v3H488Z" fill="#dbc996"/>
    <g v-if="launchPhase==='live'" aria-label="Launch example: beacon celebration"><path d="M526 485v-70m148 70v-70" stroke="#bfb69d" stroke-width="3"/><path d="M528 415h27v20h-27ZM676 415h27v20h-27Z" fill="#e5c1e5"/><path d="M566 416h3v6h6v3h-6v6h-3v-6h-6v-3h6ZM632 410h3v6h6v3h-6v6h-3v-6h-6v-3h6Z" fill="#fff2b5"/></g>
    <g v-for="n in 16" :key="`lamp${n}`" :transform="`translate(${484+n*14} 755)`"><rect x="-1" y="-15" width="2" height="16" fill="#6a716c"/><rect x="-3" y="-22" width="6" height="8" :fill="n<16 ? '#efcb86' : light ? '#daffc0' : '#465967'"/><rect v-if="n===16 && light" x="-9" y="-27" width="18" height="20" fill="#dcffc2" opacity=".18"/></g>
    <path d="M969 745h10v150h-6v143h-7v108h-10v-129h5V880h8Z" fill="#93d1c5" opacity=".65" class="world-waterfall"/>

    <!-- Roots: a breathing green cavern with little terraces and hanging gardens. -->
    <path d="M0 939h104v-18h170v27h163v-12h151v20h149v-23h201v16h262v380H0Z" fill="#243940"/>
    <path d="M0 952h135v27h113v-13h146v23h142v-32h167v33h133v-17h220v28h144v58h-145v-14H870v19H690v-27H532v28H398v-19H240v19H93v-19H0Z" fill="#34464a"/>
    <g v-for="(v,i) in vines" :key="`vine${i}`"><path :d="`M${v.x} ${v.y}v${v.h*.5}h8v${v.h*.5}h-5v17`" fill="none" stroke="#6e8262" stroke-width="3"/><path :d="`M${v.x-7} ${v.y+18}h6v4h-6ZM${v.x+9} ${v.y+37}h5v5h-5Z`" fill="#83aa79"/></g>
    <path d="M100 1330v-179h19v-69h21V920h20v174h-9v80h-19v156ZM800 1320v-110h20v-130h-14V919h22v160h12v151h-18v90Z" fill="#665d52"/><path d="M130 1124l-48-39v-76h9v70l45 31ZM828 1154l64-44v-90h10v101l-74 48Z" fill="#7a6f5d"/>
    <path d="M0 1097h233v23H177v23H72v-10H0ZM259 1100h192v22H427v17H284v-11H259ZM692 1101h199v20H861v20H731v-18H692ZM998 1103h202v27h-85v25h-85v-20h-32Z" fill="url(#sw-soil)"/>
    <path d="M0 1092H233M259 1095H451M692 1096H891M998 1098h202" stroke="#7da98a" stroke-width="7"/>
    <path d="M359 1212h388v23H697v27H411v-16h-52Z" fill="url(#sw-soil)"/><path d="M355 1208H748" stroke="#8eb29c" stroke-width="7"/>
    <path d="M0 1298H199v-14h157v27h345v-18h180v12h319v44H0Z" fill="#486066"/><path d="M0 1297H199v-14h157v27h345v-18h180v12h319" fill="none" stroke="#78a395" stroke-width="6"/>
    <use v-for="(m,i) in shrooms" :key="`shroom${i}`" href="#sw-shroom" :transform="`translate(${m.x} ${m.y}) scale(${m.s})`"/>
    <use href="#sw-shroom" transform="translate(550 1205) scale(2.7)"/><use href="#sw-shroom" transform="translate(623 1205) scale(1.7)"/>
    <g fill="#e4ecc0" opacity=".65" class="root-fireflies"><rect v-for="i in 36" :key="i" :x="42+i*137%1100" :y="999+i*59%270" width="2" height="2"/></g>
    <path d="M279 1120v175m10-175v175M279 1140h10m-10 17h10m-10 17h10m-10 17h10m-10 17h10m-10 17h10m-10 17h10m-10 17h10" stroke="#a0917a" stroke-width="3" fill="none"/>
    <use href="#sw-torch" x="408" y="1206"/><use href="#sw-torch" x="716" y="1206"/>

    <!-- Crystal: blue mineral shelves, waterfalls, a mine railway and a luminous heart. -->
    <rect y="1330" width="1200" height="500" fill="#182b43"/>
    <path d="M0 1330h1200v43h-71v46h-100v-26h-96v51h-73v-34H733v-29H596v50H466v-32H344v35H227v-41H100v43H0Z" fill="url(#sw-rock)"/>
    <path d="M62 1335v120h13v54h12v-43h9v-131ZM279 1335v72h13v56h9v-49h9v-79ZM957 1335v104h12v57h10v-71h9v-90Z" fill="#496278"/>
    <path d="M0 1410H114v324H93v54H40v-29H0ZM1090 1410h110v377h-75v-29h-35Z" fill="#2b435a"/>
    <path d="M596 1418l70 86v128l-63 51-68-56v-125Z" fill="#6984c8" opacity=".1"/><path d="M598 1453l35 54v92l-30 38-33-43v-84Z" fill="#608fbd" opacity=".35"/><use href="#sw-crystal" transform="translate(601 1607) scale(3.2)" class="cavern-heart"/>
    <path d="M0 1540h242v20H200v29H103v-19H0ZM741 1551h299v25H996v27H785v-27h-44Z" fill="url(#sw-rock)"/><path d="M0 1538H242M741 1549h299" stroke="#71bac8" stroke-width="4"/>
    <path d="M359 1708h422v15H745v39H420v-25h-61Z" fill="url(#sw-rock)"/><path d="M355 1703H785" stroke="#8eb6be" stroke-width="6"/>
    <path d="M414 1717v65m-9-65h377m-20 0v65" stroke="#8c7f79" stroke-width="4"/><path d="M426 1692h334m-320 0v12m25-12v12m25-12v12m25-12v12m25-12v12m25-12v12m25-12v12m25-12v12m25-12v12m25-12v12m25-12v12m25-12v12" stroke="#9da6b6" stroke-width="2"/>
    <g transform="translate(517 1690)"><path d="M-16-20H15L10-3H-11Z" fill="#7d829a"/><path d="M-12-17H11v3H-12Z" fill="#b9bed0"/><rect x="-10" y="-2" width="5" height="5" fill="#484a63"/><rect x="6" y="-2" width="5" height="5" fill="#484a63"/></g>
    <path d="M178 1393h6v269h-4v100h-9v-107h3v-199h4ZM1012 1380h7v323h-4v61h-10v-76h5v-228h2Z" fill="#71d7e0" opacity=".65" class="world-waterfall"/>
    <path d="M0 1778h1200v52H0Z" fill="#324e67"/><path d="M0 1779h1200v4H0Z" fill="#94d5d7"/><path d="M18 1790h97v2H18ZM327 1804h69v2h-69ZM802 1791h102v2H802Z" fill="#a8e0e1"/>
    <use v-for="(c,i) in crystals" :key="`gem${i}`" href="#sw-crystal" :transform="`translate(${c.x} ${c.y}) scale(${c.s})`"/>
    <use href="#sw-torch" x="399" y="1702"/><use href="#sw-torch" x="750" y="1702"/>

    <!-- Abyss: warm lava below cool obsidian, with a defendable lantern bridge. -->
    <rect y="1830" width="1200" height="570" fill="#2c2036"/>
    <path d="M0 1830h1200v33h-97v27H992v-18H882v40H752v-35H618v44H501v-45H363v31H228v-35H100v43H0Z" fill="#46404e"/>
    <path d="M0 2050h34v-121h40v-35h45v217h19v43h37v-190h38v-28h23v113h25v78h37v-135h44v-29h24v324H0ZM870 2175h28v-200h25v-39h44v158h33v-203h29v-46h49v331h22v-138h30v-37h35v126h35v273H870Z" fill="#482e42"/>
    <path d="M0 2197h251v-35h105v35h65v45H0ZM626 2125h277v27h-43v34H674v-25h-48ZM822 2222h378v67H877v-26h-55Z" fill="#514451"/>
    <path d="M0 2195H251v-35H356v35H421M626 2124H903M822 2220h378" fill="none" stroke="#938080" stroke-width="5"/>
    <path d="M353 2202L626 2133m-273 69v-17l273-69v17" fill="none" stroke="#a68477" stroke-width="5"/><path d="M370 2195v18m19-23v18m19-23v18m19-23v18m19-23v18m19-23v18m19-23v18m19-23v18m19-23v18m19-23v18m19-23v18m19-23v18" stroke="#6f6262" stroke-width="5"/>
    <g transform="translate(590 2032)"><path d="M-24-49H23v10h19v18h12v32H39v17H23v16H-20V27H-39V10H-50v-32h12v-17h14Z" fill="#423247"/><path d="M-23-22h13v11h-13ZM13-22h13v11H13Z" :fill="mode === 'down' ? '#faad92' : '#bd94ad'"/><path d="M-10 6H12v7H-10Z" fill="#a87998"/></g>
    <path d="M0 2040h1200v360H0Z" fill="url(#sw-lava-glow)"/>
    <path d="M0 2280h132v-14h167v19h147v-12h203v18h171v-21h178v15h202v115H0Z" fill="#bc5560"/><path d="M0 2280h132v-14h167v19h147v-12h203v18h171v-21h178v15h202" fill="none" stroke="#f4bc7c" stroke-width="7" class="lava-surface"/>
    <path d="M0 2305h281v8H0ZM336 2319h226v7H336ZM801 2308h311v6H801ZM133 2355h465v8H133ZM756 2371h355v8H756Z" fill="#e17b63"/>
    <g class="abyss-embers"><rect v-for="(e,i) in embers" :key="`ember${i}`" :x="e.x" :y="e.y" width="3" height="4" :style="{animationDelay:`-${e.d}s`}" fill="#fbc691"/></g>
    <use href="#sw-torch" x="285" y="2198"/><use href="#sw-torch" x="690" y="2120"/><use href="#sw-torch" x="880" y="2120"/><use href="#sw-torch" x="971" y="2218"/>
    <g v-if="mode==='down'" fill="#9d829c"><g v-for="i in (active ? Math.min(7,game.enemies.length) : 7)" :key="`shadow${i}`" :transform="`translate(${315+i*78} ${i%2 ? 2220 : 2140})`" class="shadow-fren"><path d="M-7-15H7v4h6v13H7v5H-7V2h-6v-13h6Z"/><path d="M-5-9h3v3h-3ZM3-9h3v3H3Z" fill="#ffdab5"/></g></g>
    <g v-if="mode==='down' && active && game.beams.length" stroke="#ffe4ac" stroke-width="2" opacity=".75" fill="none" aria-hidden="true"><path d="M777 2102L549 2126M897 2200L783 2203" stroke-dasharray="4 4"/></g>

    <g class="world-residents" aria-hidden="true"><g v-for="(p,i) in residentPlaces" :key="`resident${i}`" :transform="`translate(${p[0]} ${p[1]-30})`"><g class="resident-walk" :style="{'--walk-delay':`${-i*2.7}s`,'--walk-time':`${15+i%5*4}s`}"><image :href="souls[i%souls.length].url" x="-18" y="-9" width="36" height="36"/><ellipse cx="0" cy="31" rx="10" ry="2" fill="#172a3444"/></g></g></g>
    <g v-if="overview" aria-hidden="true"><rect v-for="p in lights" :key="`light${p.id}`" :x="p.x" :y="p.y" width="3" height="3" :fill="p.id%3 ? '#ffe8b2' : '#cbd1fa'"/></g>
    <g font-family="monospace" font-size="10" letter-spacing="4" text-anchor="middle" fill="#efe2c9" opacity=".5"><text x="601" y="181">THE ASCENSION</text><text x="600" y="900">AS ABOVE, SO BELOW</text><text x="600" y="1034">THE WHISPERING ROOTS</text><text x="600" y="1450">PROOF OF WONDER</text><text x="600" y="1950">THE FUD BELOW</text></g>
  </svg>
</template>
