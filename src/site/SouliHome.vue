<script setup>
import { ref } from 'vue'
import HeroFilm from './HeroFilm.vue'
import { publicSouls, TOKEN } from '../lighthouse/soul-art'

const souls = publicSouls()
const coinIcon = import.meta.env.BASE_URL + 'images/fungi/token-logo.png'
const copyStatus = ref('')
const tokenUrl = 'https://basescan.org/token/' + TOKEN
const contractUrl = 'https://basescan.org/address/' + TOKEN
async function copyContract() {
  copyStatus.value = ''
  try { await navigator.clipboard.writeText(TOKEN); copyStatus.value = 'Address copied.' }
  catch { copyStatus.value = 'Select the address to copy it.' }
}
const questions = [
  { title: 'What do I get?', answer: 'SOULI tokens on Base, sent to your wallet. Their seed data creates your original 24 × 24 inscription. You can view, save and share it now. It is part of the token, not a separate NFT.', href: '/whitepaper/#inscriptions', link: 'How inscriptions work' },
  { title: 'Can I choose my character?', answer: 'Choose your token amount. The contract generates the look. The examples are not characters you can reserve. Adding tokens can change your existing soul instead of creating another one.', href: '/whitepaper/#inscriptions', link: 'Levels & changing forms' },
  { title: 'How do I buy?', answer: 'Use MetaMask with ETH on Base. Choose an amount, review the total and confirm in your wallet. Never send ETH directly to a token or sale address.', href: '/buy/', link: 'Buy SOULI' },
  { title: 'Can I play the game now?', answer: 'Not yet, fren. The 3D room and game are in development, with no release date or promised token rewards. Today you can view and share your original inscription.', href: '/whitepaper/#world', link: 'The game plan' }
]
</script>

<template>
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header film-site-header">
    <a class="site-brand" href="./" aria-label="SOULI home"><img :src="coinIcon" alt="" class="site-coin-logo"/><span>SOULI<small>A LITTLE WORLD TO HODL</small></span></a>
    <nav aria-label="Main navigation"><a href="#inscriptions">The souls</a><a href="/buy/">Buy SOULI</a><a href="#receipts">The facts</a><a href="/whitepaper/">Whitepaper</a></nav>
    <a class="pixel-button small-button" href="/soul/">My SOULI <span aria-hidden="true">↗</span></a>
  </header>

  <main id="main" class="simple-home focused-home">
    <section id="world" class="site-hero site-hero-film" aria-labelledby="hero-title">
      <HeroFilm>
        <div class="hero-copy">
          <h1 id="hero-title">GM, fren.<br>Meet SOULI.</h1>
          <p class="hero-value">Tokens in your wallet. <br>A little soul of your own.</p>
          <div class="hero-actions hero-main-actions">
            <a class="pixel-button" href="/buy/">Buy SOULI <span aria-hidden="true">→</span></a>
            <a class="hero-token-button" href="#inscriptions">See the souls <span>No wallet needed</span></a>
          </div>
          <p class="hero-note">Original pixel art now. 3D game still cooking.</p>
        </div>
      </HeroFilm>
    </section>

    <section id="inscriptions" class="site-section soul-discovery" aria-labelledby="souls-title">
      <div class="discovery-copy">
        <p class="site-eyebrow">YOUR TOKEN. YOUR CHARACTER.</p>
        <h2 id="souls-title">Small pixels.<br>Big personality.</h2>
        <div class="discovery-flow" aria-label="SOULI tokens create your original pixel inscription"><img :src="coinIcon" width="58" height="58" alt="SOULI token"><span aria-hidden="true">→</span><img :src="souls[0].url" width="80" height="80" alt="An example original SOULI inscription"></div>
        <p>Your amount shapes its level.<br>The look is a surprise.</p>
        <a class="pixel-button" href="/buy/">See levels & prices <span aria-hidden="true">→</span></a>
        <a class="holder-link" href="/soul/">Already holding? View my SOULI ↗</a>
      </div>
      <div class="discovery-gallery">
        <div class="soul-cards" aria-label="Original inscription examples, not selectable items">
          <article v-for="soul in souls" :key="soul.label" class="soul-card"><div class="soul-portrait"><img :src="soul.url" :alt="soul.label + ', an original inscription example'" loading="lazy"></div><div class="soul-card-copy"><h3>{{ soul.label }}</h3></div></article>
        </div>
        <p class="art-caption">Original on-chain art · Examples, not exact items for sale.</p>
      </div>
    </section>

    <section id="receipts" class="site-section purchase-facts" aria-labelledby="facts-title">
      <div class="section-heading"><div><p class="site-eyebrow">BEFORE YOU BUY</p><h2 id="facts-title">Know what you get.</h2></div><a class="quiet-link" href="/whitepaper/">All the details ↗</a></div>
      <div class="purchase-fact-grid">
        <article><span class="fact-tag">01 · YOURS NOW</span><h3>Tokens. Pixel soul.</h3><p>Delivered to your wallet.<br>View it. Save it. Share it.</p><a href="/soul/">My SOULI ↗</a></article>
        <article><span class="fact-tag">02 · THE PAYMENT</span><h3>ETH on Base.</h3><p>See your total before you sign.<br>No automatic refunds.</p><a href="/buy/">See price & stock ↗</a></article>
        <article><span class="fact-tag">03 · THE PLAN</span><h3>50 / 50.</h3><p>Liquidity / project operations.<br>Team managed. No LP yet.</p><a href="/whitepaper/#funds">Where the ETH goes ↗</a></article>
      </div>
      <div class="facts-footer"><p>Value can fall. Resale is not guaranteed.</p><details class="official-contract"><summary>Official contract & checks</summary><p>SOULI on Base · Compare the full address.</p><code>{{ TOKEN }}</code><div class="receipt-actions"><button class="copy-contract" @click="copyContract">Copy address</button><a :href="contractUrl" target="_blank" rel="noreferrer">Basescan ↗</a><a href="/whitepaper/#funds">Sale receipts ↗</a></div><p class="copy-status" role="status">{{ copyStatus }}</p><p>Token address — do not send payments here. Internal checks completed; no independent audit. The 50:50 use of funds and one-year LP lock are plans, not enforced or active locks.</p><a href="/whitepaper/#technology">Permissions & risks ↗</a></details></div>
    </section>

    <section id="play" class="site-section game-teaser" aria-labelledby="game-title">
      <div class="game-teaser-copy"><p class="game-teaser-status"><span aria-hidden="true"></span>GAME IN DEVELOPMENT</p><h2 id="game-title">Little soul.<br>Big things ahead.</h2><p class="game-teaser-line">Your pixel fren. A new dimension.</p><a class="game-teaser-link" href="/whitepaper/#world">A peek at the plan <span aria-hidden="true">↗</span></a></div>
      <figure class="game-teaser-stage"><div class="game-teaser-portal" aria-hidden="true"></div><div class="game-teaser-shadow" aria-hidden="true"></div><img src="/media/game/souli-character-teaser-v1.png" width="1000" height="1000" alt="An original blue SOULI with pink floating pixels, rendered as a three-dimensional game character" loading="lazy" decoding="async"><figcaption>3D CHARACTER PREVIEW · SAMPLE SOUL</figcaption></figure>
    </section>

    <section id="faq" class="faq-section site-section compact-faq" aria-labelledby="faq-title">
      <div class="section-intro"><p class="site-eyebrow">A LITTLE HELP</p><h2 id="faq-title">Good questions.</h2><a class="quiet-link" href="/whitepaper/">More in the whitepaper ↗</a></div>
      <div class="faq-list"><details v-for="question in questions" :key="question.title"><summary>{{ question.title }}<span aria-hidden="true">+</span></summary><p>{{ question.answer }}</p><a class="faq-source" :href="question.href">{{ question.link }} ↗</a></details></div>
    </section>
    <section class="closing-scene compact-closing" aria-label="Get your SOULI"><div><h2>Meet your little soul.</h2><a class="holder-link" href="/soul/">Already holding? My SOULI ↗</a></div><a class="pixel-button" href="/buy/">Buy SOULI <span aria-hidden="true">→</span></a></section>
  </main>
  <footer class="site-footer"><a class="site-brand" href="./" aria-label="SOULI home"><img :src="coinIcon" alt="" class="site-coin-logo"/><span>SOULI<small>LITTLE SOULS. BIG WORLD.</small></span></a><div><a :href="tokenUrl" target="_blank" rel="noreferrer">Base contract ↗</a><a href="#receipts">The facts</a><a href="/whitepaper/">Whitepaper</a><a href="/testnet/">Testnet</a></div><p>Made for frens.<br>Game: Cooking.</p></footer>
</template>
