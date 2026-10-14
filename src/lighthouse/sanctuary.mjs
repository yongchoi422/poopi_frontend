export const SANCTUARY_KEY = 'souli-sanctuary-v1'
export const DAY_MS = 60_000
export const OFFLINE_MS = 2 * 60 * 60 * 1000
export const LANTERN_COST = Object.freeze({ supplies: 8, glowstones: 4 })
export const HOME_PROJECTS = Object.freeze([
  Object.freeze({ id: 'lantern', title: 'Light the garden path.', action: 'Light it up', zone: 'village', supplies: 8, glowstones: 4, story: 'Your first lantern is lit. A little more light to come home to.' }),
  Object.freeze({ id: 'bench', title: 'A quiet place to rest.', action: 'Build the nook', zone: 'grove', supplies: 32, glowstones: 16, story: 'A bench beneath the trees. Even little souls need a place to daydream.' }),
  Object.freeze({ id: 'gallery', title: 'Bring the gallery to life.', action: 'Restore it', zone: 'gallery', supplies: 80, glowstones: 40, story: 'The gallery windows glow again. A warm place for the forms you love.' }),
])

export const nextHomeProject = state => HOME_PROJECTS.find(project => !state[project.id]) || null

export function enableAutomation(state, now = Date.now()) {
  advanceSanctuary(state, now)
  state.automation = true
  state.active = true
  state.lastAt = now
  return state
}

export function advanceAutomatic(state, now = Date.now()) {
  const days = advanceSanctuary(state, now)
  if (state.automation) {
    let project = nextHomeProject(state)
    while (project && buildHomeProject(state, project.id)) project = nextHomeProject(state)
  }
  return days
}

export function createSanctuary(now = Date.now()) {
  return { version: 1, active: false, lastAt: now, elapsed: 0, days: 0, memories: 0, supplies: 0, glowstones: 0, lantern: false, bench: false, gallery: false, journal: [] }
}

export function advanceSanctuary(state, now = Date.now()) {
  if (!Number.isFinite(now) || now <= state.lastAt) return 0
  const delta = Math.min(now - state.lastAt, OFFLINE_MS)
  state.lastAt = now
  if (!state.active) return 0
  const elapsed = state.elapsed + delta
  const completed = Math.floor(elapsed / DAY_MS)
  state.elapsed = elapsed % DAY_MS
  if (completed) {
    state.days += completed
    state.memories += completed * 3
    state.supplies += completed * 8
    state.glowstones += completed * 4
    state.journal.unshift({ day: state.days, text: completed === 1 ? 'Your little soul brought home 8 supplies and 4 glowstones.' : `While you were away, your soul finished ${completed} little days.`, kind: 'gather' })
    state.journal = state.journal.slice(0, 12)
  }
  return completed
}

export function toggleSanctuary(state, now = Date.now()) {
  advanceSanctuary(state, now)
  state.active = !state.active
  return state.active
}

export function buildLantern(state) {
  return buildHomeProject(state, 'lantern')
}

export function buildHomeProject(state, id) {
  const project = nextHomeProject(state)
  if (!project || project.id !== id || state.supplies < project.supplies || state.glowstones < project.glowstones) return false
  state.supplies -= project.supplies
  state.glowstones -= project.glowstones
  state[id] = true
  state.journal.unshift({ day: state.days, text: project.story, kind: 'build' })
  state.journal = state.journal.slice(0, 12)
  return true
}

export function restoreSanctuary(raw, now = Date.now()) {
  try {
    const s = JSON.parse(raw)
    if (!s || s.version !== 1 || typeof s.active !== 'boolean' || typeof s.lantern !== 'boolean') return null
    if (['bench','gallery'].some(k => s[k] !== undefined && typeof s[k] !== 'boolean')) return null
    if ((s.bench && !s.lantern) || (s.gallery && !s.bench)) return null
    if (!['days', 'memories', 'supplies', 'glowstones'].every(k => Number.isSafeInteger(s[k]) && s[k] >= 0 && s[k] <= 1e9)) return null
    if (!Number.isFinite(s.lastAt) || s.lastAt < 0 || !Number.isFinite(s.elapsed) || s.elapsed < 0 || s.elapsed >= DAY_MS) return null
    return { ...createSanctuary(now), ...Object.fromEntries(['active','elapsed','days','memories','supplies','glowstones','lantern'].map(k => [k,s[k]])), automation: s.automation === true, bench: s.bench ?? false, gallery: s.gallery ?? false, lastAt: Math.min(now, s.lastAt), journal: Array.isArray(s.journal) ? s.journal.filter(e => e && typeof e.text === 'string' && e.text.length < 200 && Number.isSafeInteger(e.day) && ['gather','build','defense'].includes(e.kind)).slice(0,12) : [] }
  } catch { return null }
}

export function soulKind(soul) {
  if (soul?.source === 'public') return 'Practice soul'
  if (soul?.dynamic === true) return 'Dynamic SOULI'
  if (soul?.dynamic === false) return 'Stable SOULI'
  return 'Original SOULI'
}
