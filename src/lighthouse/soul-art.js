import snapshot from './public-souls.json'

export const TOKEN = snapshot.contract
export const svgUrl = svg => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`

// Separate only the deployed renderer's known background; keep all foreground pixels.
export function artForStage(raw) {
  const document = new DOMParser().parseFromString(raw, 'image/svg+xml')
  const root = document.documentElement
  if (root.localName !== 'svg' || document.querySelector('parsererror')) return { url: '', separated: false }
  const rects = [...root.children]
  const shape = (el, x, y, w, h) => el?.localName === 'rect' && ['x', 'y', 'width', 'height'].every((name, i) => Number(el.getAttribute(name)) === [x, y, w, h][i])
  const groundOne = shape(rects[1], 0, 17, 24, 7)
  const groundTwo = shape(rects[1], 0, 17, 24, 8)
    && shape(rects[2], 0, 17, 24, 1) && shape(rects[3], 0, 18, 24, 1)
    && rects[1].getAttribute('fill') === rects[2].getAttribute('fill')
    && rects[2].getAttribute('fill') === rects[3].getAttribute('fill')
  if (!shape(rects[0], 0, 0, 24, 24) || (!groundOne && !groundTwo)) return { url: svgUrl(raw), separated: false }
  rects.slice(0, groundOne ? 2 : 4).forEach(rect => rect.remove())
  return { url: svgUrl(new XMLSerializer().serializeToString(root)), separated: true }
}

export const publicSouls = () => snapshot.souls.map((soul, index) => ({ ...soul, ...artForStage(soul.svg), block: snapshot.block, label: ['Gm fren', 'Sir HODL', 'Tiny legend', 'Cozy degen', 'Grass toucher', 'Lil moon'][index] || `Soul ${index + 1}`, source: 'public' }))
export const sampleInfo = { block: snapshot.block, fetchedAt: snapshot.fetchedAt }
