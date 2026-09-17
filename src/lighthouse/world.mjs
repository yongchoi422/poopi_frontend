export const WORLD = { width: 1200, height: 2400 }
export const BIOMES = [
  { id: 'sky', name: 'The Ascension', short: 'Sky', mark: '✧', y: 270, end: 480, color: '#dfd0ff', line: 'Bullish on a little higher.', activity: 'Cloud hopping' },
  { id: 'home', name: 'A little place to HODL', short: 'Home', mark: '⌂', y: 658, end: 920, color: '#e6edb2', line: 'Somewhere between the stars and the soil.', activity: 'Keeping the light' },
  { id: 'roots', name: 'The Whispering Roots', short: 'Roots', mark: '♧', y: 1110, end: 1320, color: '#c3ecc6', line: 'Touch grass. Then see what is underneath.', activity: 'Gathering glowshrooms' },
  { id: 'crystal', name: 'Proof of Wonder', short: 'Crystal', mark: '◇', y: 1560, end: 1800, color: '#aeeefa', line: 'Diamond hands. Actual diamonds.', activity: 'Mining memories' },
  { id: 'abyss', name: 'The FUD Below', short: 'Abyss', mark: '♨', y: 2110, end: 2400, color: '#ffc3a5', line: 'Even down here, we keep a little light.', activity: 'Bonking the shadows' },
]
export function biomeAt(y) { return BIOMES.find(b => y < b.end) || BIOMES[4] }
const HOMES = [[516, 742], [790, 739], [370, 735], [466, 1206], [620, 1702], [758, 2118]]
const SKY = [[579, 316], [832, 389], [335, 377], [515, 742], [683, 741], [605, 1702]]
const DEFENSE = [[546, 742], [771, 2118], [478, 1702], [666, 1206], [640, 1702], [923, 2215]]
const SAYINGS = {
  up: ['wen cloud?', 'gm, sky frens', 'up only? tiny steps.', 'touching grass rn', 'found a little hope', 'diamond hands, ser'],
  calm: ['no thoughts. just soul.', 'cozy is a strategy', 'gm from home', 'mushroom department', 'proof of little rocks', 'just keeping watch'],
  down: ['HODL the light', 'FUD? bonk.', 'we are so back', 'emotional support soul', 'diamonds do not panic', 'smol but still here'],
}
export function soulRoutine(index, mode, elapsed = 0) {
  const places = mode === 'up' ? SKY : mode === 'down' ? DEFENSE : HOMES
  const [x, y] = places[index]
  const phase = (Math.max(0, elapsed) + index * 7) % 40
  const stroll = phase < 9 ? phase / 9 * 24 : phase < 20 ? 24 : phase < 32 ? (32-phase) / 12 * 24 : 0
  const resting = phase >= 9 && phase < 20 || phase >= 32
  return { x: x + stroll, y, line: resting && mode === 'calm' ? 'brb. tiny nap.' : SAYINGS[mode][index], biome: biomeAt(y), resting }
}
export function clampCamera(camera, size) {
  const halfX = size.width / (camera.zoom * 4), halfY = size.height / (camera.zoom * 4)
  return { ...camera,
    x: halfX >= WORLD.width / 2 ? WORLD.width / 2 : Math.min(WORLD.width - halfX, Math.max(halfX, camera.x)),
    y: halfY >= WORLD.height / 2 ? WORLD.height / 2 : Math.min(WORLD.height - halfY, Math.max(halfY, camera.y)),
  }
}
