<script setup>
import { computed, ref } from 'vue'
import PixelSoulWorld from '../lighthouse/PixelSoulWorld.vue'
import { publicSouls, svgUrl, TOKEN } from '../lighthouse/soul-art'

const souls = publicSouls()
const selected = ref('home')
const regions = [
  { id:'sky', label:'Sky', view:'100 40 1000 760', title:'Bullish on a little higher.', description:'Floating islands. Cloud hopping. A very small moon mission.', mode:'up' },
  { id:'home', label:'Home', view:'100 170 1000 760', title:'GM. You are home.', description:'A warm beacon, familiar faces, and a place for every little soul.', mode:'calm' },
  { id:'roots', label:'Roots', view:'100 790 1000 760', title:'Touch grass. Then go deeper.', description:'Glowshrooms and quiet gardens under the forest floor.', mode:'calm' },
  { id:'crystal', label:'Crystal', view:'100 1220 1000 760', title:'Diamond hands. Actual diamonds.', description:'A little sparkle. A little mining. No chart required.', mode:'calm' },
  { id:'abyss', label:'Abyss', view:'100 1640 1000 760', title:'Market red. Friendship green.', description:'When the shadows stir, little souls keep the beacon glowing.', mode:'down' },
]
const region = computed(() => regions.find(item => item.id === selected.value))
const traits = ['Certified GM enjoyer','HODL department','Smol but mighty','Professional chiller','Grass touched daily','Moon mission intern']
const questions = [
  { title:'Do I need a wallet to play?', answer:'No. Enter the world and try it with public SOULI artwork. You can connect a wallet or look up a Base address when you want to bring in your own SVG.' },
  { title:'What does connecting my wallet do?', answer:'The world preview reads your public address, SOULI artwork and balances. It does not ask for a signature, spending approval or payment. Looking up an address does not prove ownership.' },
  { title:'Does the game follow the market?', answer:'The preview cycles through UP exploration, CHILL recovery and DOWN defense. Weather is simulated today. There is no live price feed or token reward; memories are game points.' },
  { title:'Is everyone already in the same world?', answer:'This is a playable local prototype. Your progress stays in this browser, with up to two hours of idle catch-up. Other residents and the 100K view are simulations; shared servers are not connected yet.' },
  { title:'Can I buy SOULI here?', answer:'The proposed sale is not live. The launch page explains the fixed-price funding plan and includes an optional simulation. Payment, Uniswap liquidity and refund contracts are not connected.' },
]
</script>

<template>
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header">
    <a class="site-brand" href="./" aria-label="SOULI home"><img :src="souls[0].url" alt=""/><span>SOULI<small>A LITTLE WORLD TO HODL</small></span></a>
    <nav aria-label="Main navigation"><a href="#world">The world</a><a href="#souls">The souls</a><a href="#launch">The launch</a></nav>
    <a class="pixel-button small-button" href="./lighthouse.html">Play now <span>↗</span></a>
  </header>

  <main id="main">
    <section id="world" class="site-hero" aria-labelledby="hero-title">
      <div class="hero-copy"><p class="site-eyebrow"><i></i> ORIGINAL ON-CHAIN SOULS · BASE</p><h1 id="hero-title">Smol souls.<br>Big world.</h1><p class="hero-description">Your little soul has a place to call home.<br>Wander, gather, and keep the lights on.</p><div class="hero-actions"><a class="pixel-button" href="./lighthouse.html">Enter the world <span>→</span></a><a class="quiet-link" href="#souls">Find your little legend ↓</a></div><p class="hero-note">Free to explore. No wallet needed.</p><div class="hero-friends" aria-label="Original SOULI SVG companions"><img v-for="soul in souls.slice(0,4)" :key="soul.label" :src="soul.url" :alt="soul.label"/><span>Less chart watching.<br>More soul searching.</span></div></div>
      <figure class="hero-window">
        <div class="window-bar"><span><i></i> SOULI WORLD</span><small>PLAYABLE PREVIEW</small></div>
        <div class="hero-scene"><PixelSoulWorld :mode="region.mode" :souls="souls" :active="false" :light="0" :overview="false" launch-phase="gathering" :viewBox="region.view" preserveAspectRatio="xMidYMid slice"/><div class="scene-caption" aria-live="polite"><span>EXPLORE / {{ region.label.toUpperCase() }}</span><strong>{{ region.title }}</strong></div><a class="scene-enter" :href="`./lighthouse.html?region=${region.id}`" :aria-label="`Explore ${region.label} in the game`">↗</a></div>
        <figcaption><div class="region-tabs" role="group" aria-label="Preview world layers"><button v-for="item in regions" :key="item.id" :aria-pressed="item.id===selected" @click="selected=item.id">{{ item.label }}</button></div><p>{{ region.description }}</p></figcaption>
      </figure>
    </section>

    <div class="world-ribbon" aria-label="Game highlights"><span>✦ REAL SVG SOULS</span><span>↟ FIVE LITTLE WORLDS</span><span>☾ ONE-CLICK IDLE</span><span>♡ EVERY LIGHT MATTERS</span></div>

    <section class="how-it-works site-section" aria-labelledby="how-title"><div class="section-intro"><p class="site-eyebrow">A SOFTER KIND OF GRIND</p><h2 id="how-title">A little less doing.<br>A little more being.</h2><p>One click, then let your soul do its thing.<br>Even diamond hands deserve a nap.</p></div><ol class="steps"><li><span>01</span><div><h3>Bring a little soul.</h3><p>Choose a practice fren, or look up the original SOULI SVG in your Base wallet.</p></div></li><li><span>02</span><div><h3>Set it free.</h3><p>Hit Start chilling. Your squad explores, gathers memories, rests, and defends.</p></div></li><li><span>03</span><div><h3>Come back to a little life.</h3><p>Collect game memories and see the day's adventures. No frantic clicking required.</p></div></li></ol></section>

    <section id="souls" class="souls-section site-section" aria-labelledby="souls-title"><div class="section-heading"><div><p class="site-eyebrow">24 × 24. FULL OF PERSONALITY.</p><h2 id="souls-title">Meet the little legends.</h2></div><a class="quiet-link" href="./lighthouse.html?panel=souls">Bring my SVG ↗</a></div><p class="section-description">Original SOULI artwork from Base. Same pixels. A whole new place to live.</p><div class="soul-cards"><a v-for="(soul,index) in souls" :key="soul.label" class="soul-card" :href="`./lighthouse.html?soul=${index}`"><div class="soul-portrait"><img :src="svgUrl(soul.svg)" :alt="`${soul.label}, original SOULI SVG`" loading="lazy"/><span>0{{ index+1 }}</span></div><div class="soul-card-copy"><h3>{{ soul.label }}</h3><p>{{ traits[index] }}</p><span>Meet this fren ↗</span></div></a></div><p class="art-caption">Public on-chain samples · artwork previews, not items offered for sale.</p></section>

    <section id="launch" class="launch-section site-section" aria-labelledby="site-launch-title"><div class="launch-site-copy"><p class="site-eyebrow">THE NEXT CHAPTER · NOT LIVE</p><h2 id="site-launch-title">One shared goal.<br>One bright start.</h2><p>The plan is simple: a fixed-price start, funds held in a sale contract, then liquidity when the goal is met.</p><a class="pixel-button" href="./lighthouse.html?panel=launch">Explore the launch plan <span>→</span></a></div><div class="launch-site-plan"><div class="plan-top"><img :src="souls[0].url" alt=""/><span>Build the beacon.<br>Keep it transparent.</span></div><dl><div><dt>Proposed sale valuation</dt><dd>$15M <small>FDV</small></dd></div><div><dt>Proposed sale proceeds</dt><dd>100% <small>to LP</small></dd></div><div><dt>Sale & automatic pool creation</dt><dd class="not-live">Not connected</dd></div></dl><p>Goal, deadline and LP lock terms are not set. The plan still needs contracts for funding, pool creation and refunds.</p></div></section>

    <section id="faq" class="faq-section site-section" aria-labelledby="faq-title"><div class="section-intro"><p class="site-eyebrow">BEFORE YOU WANDER OFF</p><h2 id="faq-title">A few little<br>answers.</h2><img :src="souls[0].url" alt="A curious SOULI" class="faq-soul" loading="lazy"/></div><div class="faq-list"><details v-for="question in questions" :key="question.title"><summary>{{ question.title }}<span aria-hidden="true">+</span></summary><p>{{ question.answer }}</p></details></div></section>

    <section class="closing-scene" aria-label="Enter SOULI World"><div class="closing-friends"><img v-for="soul in souls" :key="soul.label" :src="soul.url" :alt="soul.label" loading="lazy"/></div><h2>GM, fren.<br>Your little world is waiting.</h2><a class="pixel-button" href="./lighthouse.html">Let's go touch grass <span>→</span></a><p>Playable preview · local progress · no purchase required</p></section>
  </main>

  <footer class="site-footer"><a class="site-brand" href="./"><span>SOULI<small>LITTLE SOULS. BIG WORLD.</small></span></a><div><a :href="`https://basescan.org/token/${TOKEN}`" target="_blank" rel="noreferrer">Verify Base contract ↗</a><a href="./lighthouse.html?panel=launch">Launch status</a><a href="#faq">FAQ</a></div><p>A world in the making.<br>Game points are not tokens or financial returns.</p></footer>
</template>
