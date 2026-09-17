export const ALTARS = [
  { x: 27, y: 32, name: 'Northwest altar' },
  { x: 73, y: 35, name: 'Northeast altar' },
  { x: 29, y: 50, name: 'West altar' },
  { x: 64, y: 51, name: 'East altar' },
  { x: 35, y: 62, name: 'Southwest altar' },
  { x: 60, y: 64, name: 'Southeast altar' },
]
export const ROLES = {
  warden: { name: 'Guardian', mark: '✦', color: '#ffc77f', description: 'HODL the line. Shoots light at the shadows.', range: 27, damage: 9 },
  guide: { name: 'Explorer', mark: '◇', color: '#97e5d4', description: 'Actually touches grass. Finds memories and slows shadows.', range: 29, damage: 1.5 },
  comforter: { name: 'Healer', mark: '♡', color: '#c7b5fa', description: 'Emotional support soul. Restores the beacon shield.', range: 24, damage: 0.8 },
}
export const ROUTES = [
  [{ x: 7, y: 87 }, ALTARS[4], ALTARS[2], { x: 49, y: 39 }],
  [{ x: 94, y: 18 }, ALTARS[1], ALTARS[3], { x: 49, y: 39 }],
  [{ x: 22, y: 6 }, ALTARS[0], { x: 49, y: 39 }],
]
export const DEFAULT_ROLES = ['guide', 'warden', 'warden', 'comforter', 'warden', 'guide']
export const duration = mode => mode === 'down' ? 45 : 35
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)
export function connections(roles) {
  const pairs = []
  ALTARS.forEach((a, i) => ALTARS.forEach((b, j) => {
    if (j > i && distance(a, b) < 33 && roles[i] !== roles[j]) pairs.push([i, j])
  }))
  return pairs
}
export function createGame(mode = 'down', roles = DEFAULT_ROLES, night = 1) {
  if (!['up', 'calm', 'down'].includes(mode)) throw new Error('Unknown tide')
  if (roles.length !== 6 || roles.some(role => !ROLES[role])) throw new Error('Invalid roles')
  return {
    mode, roles: [...roles], night, status: 'ready', elapsed: 0, shield: 100,
    enemies: [], beams: [], nextSpawn: 0.5, spawned: 0, kills: 0, leaks: 0,
    explore: 0, memories: 0, repairs: 0, links: connections(roles),
    contribution: roles.map(() => ({ damage: 0, slow: 0, healing: 0, exploring: 0 })),
    result: null,
  }
}
export function startGame(game) {
  if (game.status !== 'ready') return false
  game.status = 'running'
  return true
}
function finish(game, success) {
  game.status = 'finished'
  game.enemies = []
  game.beams = []
  game.result = {
    success, mode: game.mode, night: game.night, kills: game.kills,
    shield: Math.round(game.shield), memories: game.memories,
    message: game.mode === 'down'
      ? success ? 'Market red. Beacon still lit. We held the light.' : 'Tactical nap. Everyone is safe; the village will try again.'
      : game.mode === 'up' ? `Touched grass. Found ${game.memories} memories. Bullish on friendship.` : 'Sideways market. Premium nap. The squad is recharged.',
  }
}
function spawn(game) {
  const index = game.spawned++
  const route = ROUTES[index % ROUTES.length]
  const boss = index === 17
  game.enemies.push({ id: index, route: index % 3, segment: 1, x: route[0].x, y: route[0].y, hp: boss ? 130 : 25, maxHp: boss ? 130 : 25, boss, slowed: false })
}
export function stepGame(game, delta) {
  if (game.status !== 'running') return game
  // Bound integration so background-tab delays cannot skip the entire defense.
  const dt = Math.max(0, Math.min(0.1, delta))
  game.elapsed += dt
  game.beams = game.beams.filter(beam => (beam.life -= dt) > 0)
  if (game.mode === 'down') {
    if (game.spawned < 18 && game.elapsed >= game.nextSpawn) {
      spawn(game)
      game.nextSpawn += 1.6
    }
    game.enemies.forEach(enemy => { enemy.slowed = false })
    game.roles.forEach((role, i) => {
      const info = ROLES[role]
      const linked = game.links.some(pair => pair.includes(i))
      const targets = game.enemies.filter(enemy => enemy.hp > 0 && distance(ALTARS[i], enemy) < info.range)
      if (role === 'comforter') {
        const heal = Math.min(100 - game.shield, dt * (linked ? 1.1 : 0.65))
        game.shield += heal
        game.contribution[i].healing += heal
      }
      if (role === 'guide') targets.forEach(enemy => { enemy.slowed = true; game.contribution[i].slow += dt })
      const target = targets.sort((a, b) => distance(a, { x: 49, y: 39 }) - distance(b, { x: 49, y: 39 }))[0]
      if (target) {
        const damage = Math.min(target.hp, dt * info.damage * (linked ? 1.25 : 1))
        target.hp -= damage
        game.contribution[i].damage += damage
        if (!game.beams.some(beam => beam.from === i)) game.beams.push({ from: i, x: target.x, y: target.y, life: 0.18 })
      }
    })
    game.enemies = game.enemies.filter(enemy => {
      if (enemy.hp <= 0) { game.kills++; return false }
      const route = ROUTES[enemy.route]
      const target = route[enemy.segment]
      const dist = distance(enemy, target)
      const speed = (enemy.boss ? 4.2 : 5.8) * (enemy.slowed ? 0.5 : 1)
      if (dist <= dt * speed) {
        enemy.x = target.x; enemy.y = target.y; enemy.segment++
        if (enemy.segment === route.length) {
          game.shield = Math.max(0, game.shield - (enemy.boss ? 30 : 12))
          game.leaks++
          return false
        }
      } else {
        enemy.x += (target.x - enemy.x) / dist * dt * speed
        enemy.y += (target.y - enemy.y) / dist * dt * speed
      }
      return true
    })
    if (game.shield <= 0) finish(game, false)
    else if (game.elapsed >= duration(game.mode) || (game.spawned === 18 && game.enemies.length === 0)) finish(game, true)
  } else if (game.mode === 'up') {
    game.roles.forEach((role, i) => {
      const amount = dt * (role === 'guide' ? 0.65 : 0.24) * (game.links.some(pair => pair.includes(i)) ? 1.2 : 1)
      game.explore += amount
      game.contribution[i].exploring += amount
    })
    game.memories = Math.min(6, Math.floor(game.explore / 16))
    if (game.elapsed >= duration(game.mode)) finish(game, true)
  } else {
    game.repairs = Math.min(6, Math.floor(game.elapsed / 5))
    if (game.elapsed >= duration(game.mode)) finish(game, true)
  }
  return game
}
