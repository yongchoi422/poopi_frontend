<script setup>
import { computed, ref, onMounted, onUnmounted, getCurrentInstance } from 'vue'
const props = defineProps({ souls: { type: Array, default: () => [] }, selected: { type: Number, default: 0 }, zone: { type: String, default: 'grove' }, weather: { type: String, default: 'sun' }, motion: { type: Boolean, default: true }, defending: Boolean, townLights: {type:Number,default:0}, light: {type:Number,default:0}, lightTarget: {type:Number,default:8}, garden: Boolean, active: Boolean, lantern: Boolean, bench: Boolean, galleryRestored: Boolean, decorative: Boolean })
const root = ref(null), width = ref(1400), height = ref(700), hidden = ref(false)
const id = `san-${getCurrentInstance().uid}`
const focus = { grove: 435, gallery: 875, village: 1230 }
const view = computed(() => {
  if (props.decorative) return '165 100 1270 630'
  const w = width.value < 600 ? 670 : Math.min(1600, Math.max(1120, width.value / Math.max(1,height.value) * 780))
  return `${Math.max(0, Math.min(1600 - w, (focus[props.zone] || 435) - w / 2))} 0 ${w} 780`
})
const mainSoul = computed(() => props.souls[props.selected] || props.souls[0])
const mainPlacement = computed(() => ({ grove: [342,264,132], gallery: [840,352,112], village: [1154,418,120] })[props.zone] || [342,264,132])
const others = computed(() => props.souls.map((s,i) => ({...s, index:i})).filter(s => s.index !== props.selected).slice(0,4))
const places = [[775,442],[1145,468],[1370,476],[1010,514]]
const trees = [[45,350,1.35],[130,385,1],[610,367,1.3],[1503,355,1.4],[1558,433,.95],[76,600,1.1]]
const flowers = Array.from({length:48},(_,i)=>({x: 130+i*131%1320, y:443+i*67%205,c:i%3===0?'#ffdb83':i%3===1?'#fff5f6':'#dba9db'}))
let observer
function visibility(){ hidden.value = document.hidden }
onMounted(()=>{observer=new ResizeObserver(e=>{width.value=e[0].contentRect.width;height.value=e[0].contentRect.height});observer.observe(root.value);visibility();document.addEventListener('visibilitychange',visibility)})
onUnmounted(()=>{observer?.disconnect();document.removeEventListener('visibilitychange',visibility)})
</script>

<template>
  <div ref="root" class="san-scene" :class="[`weather-${weather}`, { 'is-defending': defending, 'is-working': active, 'motion-paused': !motion || hidden }]">
    <svg :viewBox="view" preserveAspectRatio="xMidYMid slice" role="img" aria-label="A quiet pixel valley: a growing grove, a stone soul gallery, and little homes beside a river." shape-rendering="crispEdges">
      <defs>
        <linearGradient :id="`${id}-sky`" x2="0" y2="1"><stop stop-color="var(--scene-sky-top)"/><stop offset="1" stop-color="var(--scene-sky-bottom)"/></linearGradient>
        <pattern :id="`${id}-grass`" width="80" height="64" patternUnits="userSpaceOnUse"><path d="M12 20h6v3h-6m38 22h8v3h-8m-24 12h3v-5h3v5" fill="#79a88a" opacity=".24"/></pattern>
        <pattern :id="`${id}-roof`" width="22" height="14" patternUnits="userSpaceOnUse"><path d="M0 13h22M11 0v12" stroke="#b789ae" stroke-width="2" opacity=".45"/></pattern>
        <g :id="`${id}-tree`"><path d="M35 50h13v58H35z" fill="#c1a6ad"/><path d="M43 60h5v46h-5zM28 82h13v7H28z" fill="#978996"/><path d="M22 0h34v8h15v12h10v33H70v15H15V58H2V29h10V12h10z" fill="#319779"/><path d="M22 0h34v8h15v12h6v20H60v12H16V40H2V29h10V12h10z" fill="#68cf9b"/><path d="M22 0h34v8h8v10H51v10H19v-8h-7v-8h10z" fill="#a3efad"/><path d="M22 15h12v5H22m28 23h12v5H50M16 45h9v4h-9" fill="#e0f6c8" opacity=".7"/></g>
        <g :id="`${id}-house`"><path d="M5 123h155v12H5z" fill="#577162" opacity=".35"/><path d="M23 60h117v66H23z" fill="#fff8ed"/><path d="M23 111h117v15H23z" fill="#c9b5c0"/><path d="M112 27h17V6h-17z" fill="#c1b3c9"/><path d="M12 50h12V38h13V26h87v12h14v12h14v17H12z" fill="#d775a8"/><path d="M12 50h12V38h13V26h87v12h14v12h14v8H12z" fill="#ffb5d3"/><path d="M12 50h12V38h13V26h87v12h14v12h14v8H12z" :fill="`url(#${id}-roof)`"/><path d="M71 87h25v39H71z" fill="#9185a6"/><path d="M36 80h23v25H36m72-25h20v25h-20" fill="#ffdf83"/><path d="M46 80v25m71-25v25M36 92h23m49 0h20" stroke="#bd99ab" stroke-width="3"/><path d="M68 125h32v7H68m-9 7h51v6H59" fill="#e2cedb"/><path d="M28 116h19v10H28m-6-4h29v-5H22" fill="#94bf9d"/></g>
        <g :id="`${id}-lantern`"><path d="M12 21h5v83h-5zM3 105h24v6H3z" fill="#787c9e"/><path d="M1 7h27v27H1z" fill="#a8aec9"/><path d="M5 11h19v19H5z" :fill="lantern ? '#ffe5a3' : '#cfdaec'"/><path d="M0 5h29v5H0m7-10h15v5H7m6 8v20" stroke="#787c9e" stroke-width="3"/></g>
      </defs>
      <rect width="1600" height="780" :fill="`url(#${id}-sky)`"/>
      <g class="san-clouds" fill="#fffefa" opacity=".65"><path d="M160 128h25v-14h57v14h35v12H160zM910 105h23V90h74v15h39v11H910zM1290 184h26v-13h66v13h32v10h-124z"/><path d="M485 67h31V54h64v13h37v10H485z" opacity=".6"/></g>
      <g v-if="weather==='aurora'" class="san-aurora" fill="none" stroke-width="28" opacity=".34"><path d="M20 125Q340 40 630 150T1550 105" stroke="#b6ffe4"/><path d="M40 161Q330 66 670 185T1570 135" stroke="#bca8fa"/></g>
      <rect x="1192" y="73" width="38" height="38" rx="2" fill="#ffe68b" opacity=".85"/>
      <path d="M0 321l120-90 107 60 153-140 123 112 79-42 141 81 143-107 150 91 128-119 136 99 117-52 103 104v185H0z" fill="#b9c5f4"/>
      <path d="M0 350l140-90 163 118 138-75 164 30 100-70 134 95 202-100 112 108 124-68 122 71 201-62v170H0z" fill="#87b6e2"/>
      <path d="M0 401l141-24 97 28 122-14 151 18 155-37 178 49 165-40 169 37 145-39 155 28 122-23v142H0z" fill="#62bdab"/>
      <path d="M0 444h90v-13h70v8h170v-10h210v-8h150v13h120v-5h110v15h180v-10h170v17h230v-13h100v342H0z" fill="#a1e59b"/>
      <path d="M0 535l164-24 129 24 97-18 138 21 104-13 94 13 151-20 141 24 127-9 167 20 188-3v230H0z" fill="#80cd88"/>
      <rect y="430" width="1600" height="350" :fill="`url(#${id}-grass)`"/>
      <path d="M-20 577h180v18h190v15h270v-15h170v-16h290v21h340v25h200v64h-200v-19h-355v-25H805v21H615v6H328v-26H155v-15H-20z" fill="#349bda"/>
      <path d="M-20 586h180v18h190v15h270v-15h170v-16h290v21h340v25h200v37h-200v-18h-355v-26H805v20H615v7H328v-25H155v-15H-20z" fill="#74d5ef"/>
      <g class="san-water" fill="#edfcff" opacity=".65"><path d="M112 604h45v3h-45m120 29h61v3h-61m156 2h42v3h-42m171-3h39v3h-39m267-25h55v3h-55m199 14h37v3h-37m92 36h73v3h-73m126-13h45v3h-45"/></g>
      <path d="M174 474h260v12h323v-15h200v18h360v14H957v-16H759v16H434v-13H174z" fill="#fff1d3"/>
      <path d="M430 484h28v84h-28m322-88h24v102h-24m477-88h25v87h-25" fill="#e6dbc6"/>
      <g v-for="(tree,i) in trees" :key="i" :transform="`translate(${tree[0]} ${tree[1]-100*tree[2]}) scale(${tree[2]})`"><use :href="`#${id}-tree`"/></g>
      <!-- A low-contrast grove frames the original, unmodified SOULI. -->
      <path d="M257 413h22v-81h-14V218h24v-24h39v-22h116v17h51v26h28v104h-16v104h-24V310h-19V211H334v20h-29v103h-17v79z" fill="#697acf"/>
      <path d="M269 257h-23v-27h17v-33h27v-22h40v-19h102v11h36v15h38v20h22v24h-22v-9h-27v-21h-39v-9h-94v16h-36v19h-23v35z" fill="#a19aea"/>
      <path d="M280 218h-28v-20h27v-21h46v-11h97v11h38v14h-47v-9h-73v17h-42v19z" fill="#d2c4ff"/>
      <path d="M270 343h14v-56h9v-55m184-31v34h13v42h15v64" fill="none" stroke="#b3a6d9" stroke-width="7"/>
      <path d="M346 200v21m55-26v15m-83 25v15m160-18v24" stroke="#e4bbbf" stroke-width="3"/>
      <g fill="#ffe89a"><rect x="340" y="218" width="13" height="17"/><rect x="394" y="207" width="13" height="17"/><rect x="311" y="247" width="13" height="17"/><rect x="471" y="253" width="13" height="17"/></g>
      <path d="M306 415h197v18H306zM324 398h162v17H324zM349 388h115v11H349z" fill="#9bbfae"/>
      <path d="M324 398h162v7H324zM306 415h197v6H306z" fill="#ccebc9"/>
      <path d="M337 381h138v7H337z" fill="#e3f3d8" opacity=".7"/>
      <g v-if="bench" class="san-built-nook" aria-label="Your completed woodland nook" transform="translate(292 478)">
        <path d="M-20 45h150v9H-20" fill="#71906c" opacity=".4"/>
        <path d="M0 0h104v11H0m0 16h104v11H0M-6 30h116v12H-6" fill="#d6bd8e"/>
        <path d="M7-5h7v56H7m76-56h7v56h-7M0 10h104v5H0m-6 24h116v5H-6" fill="#718369"/>
        <path d="M39 4h24v6H39" fill="#a2ad83"/>
        <path d="M119 26h21v22h-21" fill="#bdab88"/><path d="M125 26V8m5 13h10V11m-15 5h-9V7" fill="none" stroke="#68895d" stroke-width="5"/>
        <rect x="121" y="2" width="8" height="9" fill="#eed19a"/>
      </g>
      <g class="san-motes" fill="#f4e7b5"><rect x="306" y="321" width="4" height="4"/><rect x="505" y="361" width="5" height="5"/><rect x="463" y="277" width="4" height="4"/></g>
      <!-- The gallery is a place for real stored originals, not a simulated mint. -->
      <path d="M747 434h250v13H747z" fill="#657e65" opacity=".5"/>
      <path d="M765 317h213v116H765z" fill="#fffbf3"/>
      <path d="M748 310h246v16H748zM760 298h222v12H760zM778 279h190v19H778zM804 259h137v20H804zM828 246h85v13H828z" fill="#7189dc"/>
      <path d="M760 298h222v7H760m44-39h137v7H804m-26 19h190v6H778" fill="#b2b9f2"/>
      <path d="M777 326h15v107h-15m162-107h15v107h-15" fill="#d4cce4"/>
      <path d="M816 339h37v51h-37m33-58h41v100h-41m36-93h37v51h-37" fill="#beb8e0"/>
      <path d="M823 346h23v37h-23m46-4h14v50h-14m-7-95h14v30h-14m20-24h23v37h-23" :fill="galleryRestored?'#f5dda0':'#bbd0b3'"/>
      <g v-if="galleryRestored" class="san-restored-gallery" aria-label="Your restored soul gallery">
        <path d="M793 295h160v9H793m36-43h85v7h-85" fill="#ddd2a7"/>
        <path d="M751 321h15v72h-15m226-72h15v72h-15" fill="#839972"/>
        <path d="M758 317v59m226-59v59" stroke="#b9c78e" stroke-width="4"/>
        <g v-for="x in [741,994]" :key="x" :transform="`translate(${x} 366)`"><path d="M0 0h4v58h-4" fill="#536f5d"/><path d="M-7-5h18v23H-7" fill="#d5c699"/><path d="M-4-1h12v13H-4" fill="#ffe9ab"/></g>
        <path d="M812 435h116v12H812" fill="#d8cb9e"/><path d="M841 437h59v4h-59" fill="#9aa482"/>
      </g>
      <path d="M850 432h51v7h-51m-8 7h68v7h-68" fill="#e0d5b4"/>
      <path d="M785 411h30v16h-30m138-16h30v16h-30" fill="#879c77"/>
      <g fill="#d6c291"><rect x="789" y="408" width="5" height="7"/><rect x="803" y="401" width="5" height="12"/><rect x="930" y="407" width="5" height="8"/><rect x="943" y="402" width="5" height="10"/></g>
      <use :href="`#${id}-house`" transform="translate(1120 310) scale(1.05)"/>
      <use :href="`#${id}-house`" transform="translate(1310 330) scale(.86)"/>
      <path d="M1322 546h133v25h-133z" fill="#71835f"/>
      <path d="M1330 552h117v12h-117z" fill="#92865f"/>
      <g fill="#aec58c"><path d="M1340 546v-12h-5v-5h9v5h6v9h-6v3m23 0v-14h-5v-5h9v8h7v8h-7v3m24 0v-11h-6v-7h10v9h6v7h-6v2m24 0v-14h-5v-4h9v7h6v8h-6v3"/></g>
      <g v-if="garden" aria-label="The completed shared garden"><path d="M1307 517h161v5h-161m0-7v52m161-52v52m-149-52v52m138-52v52" fill="none" stroke="#e4d6ad" stroke-width="5"/><g v-for="i in 6" :key="`garden-${i}`" :transform="`translate(${1327+i*18} 533)`"><path d="M0 0v16m0-7h6v-4m-6 8h-5v-4" fill="none" stroke="#537856" stroke-width="3"/><path d="M-4-5h8v8h-8m-3-5h14v3h-14" :fill="i%2?'#efd590':'#c9a6cb'"/></g></g>
      <g v-for="(flower,i) in flowers" :key="`f-${i}`"><path :d="`M${flower.x} ${flower.y}v7`" stroke="#6e8b65" stroke-width="2"/><rect :x="flower.x-2" :y="flower.y-2" width="5" height="4" :fill="flower.c"/></g>
      <g transform="translate(714 565)"><path d="M0 0h116v13H0zM3 13h10v71H3m91-71h10v71H94" fill="#718775"/><path d="M-6 33h123v50H-6z" fill="#c9c09b"/><path d="M-6 42h123m-123 13h123m-123 13h123m-94-33v48m36-48v48m36-48v48" stroke="#a8a98a" stroke-width="3"/><path d="M-6 30h123v6H-6m0 40h123v6H-6" fill="#e2d5ac"/></g>
      <g transform="translate(1082 398)"><rect v-if="lantern" x="-15" y="-15" width="60" height="70" fill="#ffe3a1" opacity=".16"/><use :href="`#${id}-lantern`"/></g>
      <g v-if="weather==='fog'" class="san-fog" fill="#e1eced" opacity=".35"><path d="M0 365h420v45h440v-25h740v60H0z"/><path d="M0 515h520v-20h500v30h580v40H0z"/></g>
      <g v-if="townLights" aria-label="Lights earned by protecting the town"><g v-for="i in Math.min(townLights,5)" :key="i" :transform="`translate(${480+i*125} 493)`"><path d="M0 0v-38" stroke="#386570" stroke-width="4"/><path d="M-8-49h16v18h-16" fill="#ffe9a8"/><rect x="-18" y="-56" width="36" height="30" fill="#ffe8ac" opacity=".14"/></g></g>
      <g v-for="x in [540,1030,1450]" :key="`beacon-${x}`" :transform="`translate(${x} 459)`" aria-hidden="true">
        <ellipse rx="27" ry="7" fill="#326c70" opacity=".18"/>
        <path d="M-13-16h26V0h-26M-20 0h40v6h-40" fill="#6b9692"/>
        <g class="san-beacon-glow"><circle cy="-38" :r="defending?34:23" fill="#fbe8ac" :opacity="defending ? .12+.2*Math.min(1,light/lightTarget) : .1"/><path d="M0-59l14 21L0-17l-14-21z" fill="#a7f4e5"/><path d="M0-59v42l14-21z" fill="#6dc7d1"/><path d="M-3-47h5v14h-5" fill="#efffff"/></g>
      </g>
      <g v-if="defending" class="san-light-stream" stroke="#fff0ae" fill="#fff0ae" opacity=".8"><path d="M1010 420Q1160 270 1390 430" fill="none" stroke-dasharray="2 34" stroke-width="4"/><rect x="1090" y="360" width="5" height="5"/><rect x="1280" y="340" width="4" height="4"/></g>
      <g v-for="(person,i) in others" :key="person.index" class="san-walker" :style="{'animation-delay':`${i*-4.7}s`}"><image :href="person.url" :x="places[i][0]" :y="places[i][1]-64" width="72" height="72" style="image-rendering:pixelated"/></g>
      <g v-if="mainSoul" :transform="`translate(${mainPlacement[0]} ${mainPlacement[1]})`">
        <g class="san-soul-stroll">
          <ellipse class="san-soul-shadow" :cx="mainPlacement[2]/2" :cy="mainPlacement[2]-.5" :rx="mainSoul.compact?28:42" ry="5" fill="#245663" opacity=".25"/>
          <g class="san-main-soul">
            <rect v-if="mainSoul.compact" :x="mainPlacement[2]/2-32" :y="mainPlacement[2]/2-36" width="64" height="72" rx="12" fill="#4c5680" opacity=".84"/>
            <g class="san-soul-aura" fill="#fff4b9" opacity=".8" aria-hidden="true"><path :d="`M${mainPlacement[2]/2-48} 36h4v9h-4m-3-6h10v3h-10M${mainPlacement[2]/2+42} 74h3v7h-3`"/></g>
            <image :href="mainSoul.url" :width="mainPlacement[2]" :height="mainPlacement[2]" style="image-rendering:pixelated"/>
            <g v-if="mainSoul.compact" class="san-dot-spark" fill="#f4d893"><path :d="`M${mainPlacement[2]/2-43} ${mainPlacement[2]/2-9}h4v4h-4m80 12h3v3h-3`"/></g>
          </g>
          <g v-if="active" class="san-carry-light" :transform="`translate(${mainPlacement[2]-10} ${mainPlacement[2]-35})`" aria-hidden="true"><circle r="17" fill="#fff1ba" opacity=".25"/><path d="M0-11l7 11-7 11-7-11z" fill="#fff4bb"/><path d="M0-11v22l7-11z" fill="#edbb66"/></g>
          <g class="san-curious" :transform="`translate(${mainPlacement[2]-16} 8)`"><path d="M0 0h25v22H10v6H5v-6H0z" fill="#f5edcf"/><path d="M11 5h3v8h-3m0 3h3v3h-3" fill="#708265"/></g>
        </g>
      </g>
      <g fill="#88bd97"><path d="M0 727h200v-14h97v15h116v18h235v-10h110v13h306v-16h130v-12h190v15h216v44H0z"/></g>
      <g fill="#c2e7b1"><path d="M14 706h52v10h36v20H14m284-8h44v8h23v10h-67m795-23h58v12h30v24h-88m304-25h69v-12h54v48h-123"/></g>
      <g v-if="weather==='rain'" class="san-rain" stroke="#e7efff" stroke-width="2" opacity=".35"><path v-for="i in 55" :key="i" :d="`M${i*139%1600} ${i*71%690}l-5 14`"/></g>
    </svg>
  </div>
</template>

<style scoped>
.san-scene.weather-fog{--scene-sky-top:#b2bfdc;--scene-sky-bottom:#ece8f3}
.san-scene.weather-aurora{--scene-sky-top:#bbb6ed;--scene-sky-bottom:#f3e8fa}
.san-soul-aura{animation:soul-aura 7s ease-in-out infinite;transform-origin:center;transform-box:fill-box}
.san-beacon-glow{animation:beacon-glow 5s ease-in-out infinite}
.san-carry-light{opacity:0;animation:carry-light 32s steps(1,end) infinite}
.san-fog{animation:fog-drift 24s ease-in-out infinite alternate}.san-aurora{animation:aurora-drift 12s ease-in-out infinite alternate}
.san-light-stream{animation:light-flow 7s linear infinite}
@keyframes soul-aura{0%,100%{opacity:.25;transform:translateY(2px)}50%{opacity:.9;transform:translateY(-5px)}}
@keyframes beacon-glow{50%{opacity:.6;transform:translateY(-3px)}}
@keyframes carry-light{0%,24%,79%,100%{opacity:0}25%,78%{opacity:1}}
@keyframes fog-drift{to{transform:translateX(55px);opacity:.22}}
@keyframes aurora-drift{to{transform:translateY(15px);opacity:.2}}
@keyframes light-flow{to{stroke-dashoffset:-108}}

.san-scene{position:absolute;inset:0;overflow:hidden;--scene-sky-top:#75c7ff;--scene-sky-bottom:#e6f4ff;background:#a1e59b}
.san-scene svg{width:100%;height:100%;display:block}.san-scene.weather-rain{--scene-sky-top:#89aadb;--scene-sky-bottom:#cedffa}.san-scene.weather-dusk{--scene-sky-top:#a994ed;--scene-sky-bottom:#ffc6dd}
.san-motes{animation:motes 4s steps(3,end) infinite}.san-main-soul{animation:float-soul 4s ease-in-out infinite}.is-working .san-main-soul{animation-duration:3.8s}.san-soul-stroll{animation:stroll 32s ease-in-out infinite}.san-walker{animation:walk-soul 22s ease-in-out infinite}.san-rain{animation:rain 1.5s linear infinite}.san-clouds{animation:clouds 60s linear infinite alternate}.san-water{animation:ripples 9s ease-in-out infinite}.san-curious{opacity:0;animation:curious 24s steps(1,end) infinite}.san-dot-spark{animation:motes 4s ease-in-out infinite}
@keyframes float-soul{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}@keyframes motes{50%{opacity:.25}}@keyframes stroll{0%,12%,100%{transform:translate(0,0)}26%,38%{transform:translate(34px,26px)}59%,73%{transform:translate(90px,62px)}88%{transform:translate(20px,16px)}}@keyframes walk-soul{0%,15%,100%{transform:translateX(0)}38%,54%{transform:translateX(34px)}76%,88%{transform:translateX(-12px)}}@keyframes rain{to{transform:translate(-9px,25px)}}@keyframes clouds{to{transform:translateX(90px)}}@keyframes ripples{50%{transform:translateX(16px);opacity:.3}}@keyframes curious{44%,52%{opacity:1}53%,100%{opacity:0}}
.motion-paused *{animation-play-state:paused!important}
@media(prefers-reduced-motion:reduce){.san-scene *{animation:none!important}}
</style>
