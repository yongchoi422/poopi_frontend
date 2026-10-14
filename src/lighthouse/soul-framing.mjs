// Only frame the simple foreground rectangles of a recognized SOULI SVG.
// A tiny original can sit off-center; enlarging its full 24x24 canvas loses it.
export function compactFrame(rects) {
  if (!Array.isArray(rects) || !rects.length) return null
  if (!rects.every(r => ['x','y','width','height'].every(k => Number.isFinite(r[k])) && r.width > 0 && r.height > 0 && r.x >= 0 && r.y >= 0 && r.x+r.width <= 24 && r.y+r.height <= 24)) return null
  const x = Math.min(...rects.map(r=>r.x)), y = Math.min(...rects.map(r=>r.y))
  const w = Math.max(...rects.map(r=>r.x+r.width))-x, h = Math.max(...rects.map(r=>r.y+r.height))-y
  if (Math.max(w,h) > 6) return null
  const size = Math.max(8, Math.ceil(Math.max(w,h) * 2))
  return { viewBox: `${x+w/2-size/2} ${y+h/2-size/2} ${size} ${size}`, width: w, height: h }
}
