<script setup>
import { computed, onUnmounted, ref, shallowRef, watch } from 'vue'
import { svgUrl } from '../lighthouse/soul-art'
import { assertPixelSvg, soulLink, xShareLink } from './inscription.mjs'
import { makeSoulCard, downloadBlob } from './share-card.mjs'
import './soul.css'
const props = defineProps({ soul: { type: Object, required: true } })
const sharing = ref(false), message = ref(''), imageError = ref(''), busy = ref(false), blob = shallowRef(null), imageUrl = ref('')
let generation = 0
const art = computed(() => svgUrl(assertPixelSvg(props.soul.svg)))
const localPreview = import.meta.env.DEV || ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)
const link = computed(() => soulLink(props.soul, localPreview ? location.origin : 'https://souli.net'))
const xLink = computed(() => xShareLink(link.value))
const file = () => new File([blob.value], 'my-souli.png', { type: 'image/png' })
function saveOriginal() { downloadBlob(new Blob([assertPixelSvg(props.soul.svg)], { type: 'image/svg+xml' }), 'my-souli.svg') }
const canShare = computed(() => { try { return !!blob.value && typeof navigator.share === 'function' && !!navigator.canShare?.({ files: [file()] }) } catch { return false } })
watch(() => props.soul, async soul => {
  const id = ++generation; blob.value = null; imageUrl.value = ''; message.value = ''; imageError.value = ''
  try {
    const next = await makeSoulCard(soul.svg)
    const preview = await new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(next) })
    if (id === generation) { blob.value = next; imageUrl.value = preview }
  }
  catch { if (id === generation) imageError.value = 'Image export is unavailable. You can still copy the link.' }
}, { immediate: true })
onUnmounted(() => { generation++ })
async function copyImage() {
  if (!blob.value || busy.value) return
  const id = generation
  busy.value = true; message.value = 'Copying… Allow clipboard access if your browser asks. You can also save the image.'
  try {
    if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') throw Error()
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob.value })])
    if (id === generation) message.value = 'Image copied. Paste it into your post.'
  } catch { if (id === generation) message.value = 'Image copy is unavailable here. Save the image and attach it instead.' }
  finally { busy.value = false }
}
async function copyLink() {
  const id = generation
  message.value = ''
  try { await navigator.clipboard.writeText(link.value); if (id === generation) message.value = 'Link copied.' }
  catch { if (id === generation) message.value = 'Copy the link below.' }
}
async function share() {
  if (!canShare.value || busy.value) return
  const id = generation
  busy.value = true; message.value = ''
  try { await navigator.share({ files: [file()], title: 'My SOULI', text: 'gm fren. Meet my little SOULI.', url: link.value }) }
  catch (e) { if (id === generation && e.name !== 'AbortError') message.value = 'Sharing is unavailable here. Save the image instead.' }
  finally { busy.value = false }
}
</script>
<template>
  <article class="inscription-card">
    <div class="inscription-card-badges"><span>LEVEL {{ soul.level + 1 }}</span><span>{{ soul.source === 'shared' ? 'SHARED FORM' : soul.dynamic ? 'DYNAMIC' : 'STABLE' }}</span></div>
    <div class="inscription-card-stage"><img :src="imageUrl || art" :alt="`Original 24 by 24 SOULI Level ${soul.level + 1} inscription`" width="480" height="480" draggable="false"></div>
    <div class="inscription-card-caption"><span>Original 24 × 24 inscription · Base</span></div>
    <div class="inscription-card-actions"><button type="button" class="soul-btn soul-btn-gold" :aria-expanded="sharing" @click="sharing = !sharing">Share this soul ↗</button><button type="button" class="soul-btn" :disabled="!blob" @click="downloadBlob(blob, 'my-souli.png')">Save image ↓</button></div>
    <div v-if="sharing" class="soul-share-panel">
      <p>Bring a little soul to your feed.</p>
      <div class="soul-share-actions"><button v-if="canShare" type="button" class="soul-btn soul-btn-gold" :disabled="busy" @click="share">Share to apps ↗</button><button type="button" class="soul-btn" :disabled="!blob || busy" @click="copyImage">Copy image</button><a class="soul-btn" :href="xLink" target="_blank" rel="noopener noreferrer">Post on X ↗</a><button type="button" class="soul-btn" @click="copyLink">Copy link</button></div>
      <p class="soul-fine">X opens a draft with text and a link. Paste your copied image, or attach the saved one.</p>
      <input class="soul-share-url" aria-label="Inscription share link" :value="link" readonly @focus="$event.target.select()">
      <p class="soul-fine">A shared appearance, not proof of who owns it now. Save the image to keep this moment.</p>
      <details v-if="imageUrl" class="soul-image-preview"><summary>Image details</summary><p class="soul-fine">1200 × 1200 PNG. The original 24 × 24 image, enlarged without cropping or decoration.</p><img :src="imageUrl" alt="Original SOULI sharing image" width="1200" height="1200"><button type="button" class="soul-text-button" @click="saveOriginal">Save original SVG ↓</button></details>
    </div>
    <p v-if="message" class="soul-notice" role="status">{{ message }}</p><p v-if="imageError" class="soul-notice" role="status">{{ imageError }}</p>
  </article>
</template>
