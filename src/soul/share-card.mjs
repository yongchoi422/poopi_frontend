import { assertPixelSvg } from './inscription.mjs'

// Render at the native grid first, then enlarge every pixel by exactly 50.
// No smoothing, frame, logos, cropped background, upload or signature.
export async function makeSoulCard(raw) {
  const source = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(assertPixelSvg(raw))}`
  const art = await new Promise((resolve, reject) => {
    const i = new Image(), timeout = setTimeout(() => reject(Error('The sharing image took too long to load.')), 10000)
    i.onload = () => { clearTimeout(timeout); resolve(i) }
    i.onerror = () => { clearTimeout(timeout); reject(Error('The sharing image could not load.')) }
    i.src = source
  })
  const native = document.createElement('canvas'); native.width = 24; native.height = 24
  const pixels = native.getContext('2d'); if (!pixels) throw Error('Image export is unavailable in this browser.')
  pixels.imageSmoothingEnabled = false; pixels.drawImage(art, 0, 0, 24, 24)
  const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 1200
  const ctx = canvas.getContext('2d'); if (!ctx) throw Error('Image export is unavailable in this browser.')
  ctx.imageSmoothingEnabled = false; ctx.drawImage(native, 0, 0, 1200, 1200)
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(Error('The sharing image could not be created.')), 'image/png'))
}
export function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob), a = document.createElement('a')
  a.href = url; a.download = name; a.hidden = true; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000)
}
