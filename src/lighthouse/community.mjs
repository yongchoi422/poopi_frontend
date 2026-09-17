// A deliberately local illustration, never an ownership or online-user record.
export const WORLD_SCALES = [100, 1000, 100000]
export const LANTERN_GOAL = 16
export function createContributionPreview() {
  return { light: 0, slot: null, lanterns: LANTERN_GOAL - 1 }
}
export function addPreviewLight(state, slot) {
  if (!Number.isInteger(slot) || slot < 0 || slot >= 6) throw new Error('Invalid soul slot')
  if (state.light) return state
  return { light: 1, slot, lanterns: LANTERN_GOAL }
}
// Aggregate counts without materializing one object (or SVG) per holder.
export function clusterLights(count) {
  if (!Number.isSafeInteger(count) || count < 0 || count > 100000) throw new Error('Invalid demo count')
  const size = Math.min(count, 240)
  return Array.from({ length: size }, (_, i) => {
    const angle = i * 2.3999632297
    const radius = 285 + (i % 19) * 12
    return {
      id: i, x: Math.round(576 + Math.cos(angle) * radius),
      y: Math.round(384 + Math.sin(angle) * radius * .67),
      count: Math.floor(count / size) + (i < count % size ? 1 : 0),
    }
  })
}
