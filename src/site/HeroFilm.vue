<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { createFilmSession, mayAutoplay } from './hero-films.mjs'

const session = createFilmSession(() => window.sessionStorage)
const film = ref(session.current())
const video = ref(null)
const state = ref('poster')
const hasFrame = ref(false)
const reducedMotion = ref(false)
const saveData = ref(false)
let mediaQuery, connection, request = 0, disposed = false, wantsPlay = false
const notice = computed(() => state.value === 'error' ? 'This moment couldn’t load. Try again or meet another soul.' : '')
const autoplayAllowed = () => mayAutoplay({ reducedMotion: reducedMotion.value, saveData: saveData.value, hidden: document.hidden })

function isCurrent(event) { return event.target === video.value && !disposed }
function syncPreferences() {
  reducedMotion.value = Boolean(mediaQuery?.matches)
  saveData.value = Boolean(connection?.saveData)
  if (reducedMotion.value || saveData.value) pause()
}
function pause() {
  request++
  wantsPlay = false
  video.value?.pause()
  if (state.value === 'playing' || state.value === 'loading') state.value = hasFrame.value ? 'paused' : 'poster'
}
async function play(automatic = false) {
  if (automatic && !autoplayAllowed()) return
  const el = video.value, version = ++request
  if (!el || disposed) return
  wantsPlay = true
  state.value = 'loading'
  el.muted = true
  // No source is attached until playback is allowed or explicitly requested.
  if (!el.getAttribute('src') || el.error) {
    el.src = film.value.video
    el.load()
  }
  if (el.ended) el.currentTime = 0
  try {
    await el.play()
    if (version !== request || el !== video.value || disposed) return
    hasFrame.value = true
    state.value = 'playing'
  } catch (error) {
    if (version !== request || el !== video.value || disposed) return
    wantsPlay = false
    state.value = error?.name === 'NotAllowedError' || error?.name === 'AbortError' ? 'poster' : 'error'
    hasFrame.value = false
  }
}
async function another(inOrder = false) {
  pause()
  const old = video.value
  old?.removeAttribute('src')
  old?.load() // Abort the old resource before replacing the single video element.
  film.value = inOrder ? session.advance() : session.next()
  state.value = 'poster'
  hasFrame.value = false
  const version = request
  await nextTick()
  if (version === request && !disposed) play(true)
}
function onPlaying(event) {
  if (!isCurrent(event)) return
  if (!wantsPlay) { event.target.pause(); return }
  hasFrame.value = true
  state.value = 'playing'
}
function onPause(event) {
  if (isCurrent(event) && !event.target.ended && state.value === 'playing') state.value = 'paused'
}
function onEnded(event) {
  if (!isCurrent(event)) return
  wantsPlay = false
  hasFrame.value = true
  state.value = 'ended'
  // Advance only after a real ended event: all six play before the cycle repeats.
  if (autoplayAllowed()) another(true)
}
function onError(event) {
  if (isCurrent(event) && event.target.getAttribute('src')) { wantsPlay = false; hasFrame.value = false; state.value = 'error' }
}
function onVisibility() {
  if (document.hidden) pause()
  else if (autoplayAllowed()) {
    if (state.value === 'ended') another(true)
    else if (state.value === 'paused' || state.value === 'poster') play(true)
  }
}
onMounted(() => {
  mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  connection = navigator.connection
  syncPreferences()
  mediaQuery.addEventListener?.('change', syncPreferences)
  connection?.addEventListener?.('change', syncPreferences)
  document.addEventListener('visibilitychange', onVisibility)
  play(true)
})
onBeforeUnmount(() => {
  disposed = true
  pause()
  video.value?.removeAttribute('src')
  video.value?.load()
  mediaQuery?.removeEventListener?.('change', syncPreferences)
  connection?.removeEventListener?.('change', syncPreferences)
  document.removeEventListener('visibilitychange', onVisibility)
})
</script>

<template>
  <div class="hero-film" :data-film="film.id" :data-playback="state">
    <figure class="film-stage" aria-label="Little SOULI moments">
      <div class="film-screen">
        <video :key="film.id" ref="video" width="1280" height="720" :poster="film.poster"
          :aria-label="film.description" :aria-hidden="!hasFrame" aria-describedby="film-caption" muted playsinline preload="none"
          @playing="onPlaying" @pause="onPause" @ended="onEnded" @error="onError" />
        <img v-if="!hasFrame" class="film-poster" :src="film.poster" :alt="film.description" width="1280" height="720" fetchpriority="high" />
        <button v-if="state !== 'playing' && state !== 'loading'" class="film-play" type="button" @click="play(false)" :aria-label="state === 'error' ? 'Retry this SOULI moment' : 'Play this SOULI moment'">
          <span aria-hidden="true">▶</span> {{ state === 'error' ? 'Try again' : 'Play moment' }}
        </button>
      </div>
      <slot />
      <figcaption>
        <div class="film-story"><span class="film-kicker">SOULI MOMENTS <span>· ANIMATED SHORT</span></span><p id="film-caption">{{ film.caption }}</p></div>
        <div class="film-controls"><button class="film-next" type="button" @click="another(false)">Meet another soul <span aria-hidden="true">↻</span></button></div>
        <span class="film-status" role="status">{{ notice }}</span>
      </figcaption>
    </figure>
  </div>
</template>

<style scoped>
.hero-film{position:relative;margin:0;min-width:0;width:100%;background:var(--souli-blue-deep);overflow:hidden}
/* Size the frame itself, not a stretched viewport with a letterboxed video.
   Copy, controls and navigation share the same real 16:9 stage. */
.film-stage{position:relative;width:min(100%,177.777778svh);margin:0 auto}
.film-screen{position:relative;width:100%;aspect-ratio:16/9;background:#1d2942;isolation:isolate;overflow:hidden}
.film-screen::after{content:'';position:absolute;inset:0;pointer-events:none;background:linear-gradient(180deg,#09152a80,transparent 24%),radial-gradient(ellipse at bottom left,#09152ad9,#09152a4d 36%,transparent 68%)}
.film-screen video,.film-poster{position:absolute;inset:0;display:block;width:100%;height:100%;object-fit:contain;image-rendering:auto}
.film-poster{pointer-events:none}.film-play{position:absolute;z-index:2;left:50%;top:50%;transform:translate(-50%,-50%);display:flex;align-items:center;gap:10px;white-space:nowrap;border:1px solid var(--souli-ink);border-radius:12px;padding:13px 18px;background:var(--souli-paper);color:var(--souli-ink);box-shadow:0 4px var(--souli-ink);font:17px var(--font-ui,system-ui);min-height:48px}
.film-play:hover{background:var(--souli-yellow)}.film-play:active{transform:translate(-50%,calc(-50% + 3px));box-shadow:0 1px var(--souli-ink)}
figcaption{position:absolute;z-index:2;right:var(--hero-inset,4.5%);bottom:var(--hero-inset,clamp(32px,5vw,72px));display:flex;flex-direction:column;align-items:flex-end;gap:12px;max-width:280px}.film-story{min-width:0}
.film-kicker{display:block;font:10px/1.5 var(--font-ui,system-ui);letter-spacing:.7px;color:#fffefa;text-shadow:0 1px 4px #09152a}.film-kicker>span{font:8px var(--font-ui,system-ui);letter-spacing:.4px}
.film-story p{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
.film-controls{display:flex;align-items:center;gap:8px}
.film-next{display:flex;align-items:center;justify-content:center;gap:14px;min-height:46px;padding:11px 15px;border:1px solid #ffffff80;border-radius:10px;background:var(--souli-blue);color:white;box-shadow:0 4px var(--souli-blue-deep);font:17px/1.25 var(--font-ui,system-ui);transition:transform .12s,box-shadow .12s}
.film-next:hover{background:#1948d7;transform:translateY(-1px);box-shadow:0 5px var(--souli-blue-deep)}.film-next:active{transform:translateY(3px);box-shadow:0 1px var(--souli-blue-deep)}
.film-status{display:none;font:11px/1.5 var(--font-ui,system-ui);color:#fffefa;background:#152347e6;border-radius:8px;padding:8px 12px}.film-status:not(:empty){display:block}
@media(max-width:900px),(max-height:520px){.hero-film{background:var(--souli-blue)}.film-stage{width:100%}.film-screen::after{display:none}figcaption{position:static;max-width:none;align-items:center;flex-direction:row;justify-content:space-between;flex-wrap:wrap;gap:14px;padding:0 5% 30px}.film-kicker{text-shadow:none}.film-next{font-size:15px;min-height:44px}.film-status{width:100%}}
@media(min-width:901px) and (max-height:520px){.film-stage{width:min(100%,calc((100svh - 78px)*16/9))}figcaption{padding-inline:24px}}
@media(max-width:480px){figcaption{padding:0 20px 26px;gap:12px}.film-kicker{font-size:8px;letter-spacing:.3px}.film-kicker>span{display:block;font-size:7px}.film-next{font-size:14px;padding:10px 11px;gap:8px}}
@media(prefers-reduced-motion:reduce){.film-next{transition:none}}
</style>
