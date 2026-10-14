const base = '/media/souli-moments/v1/'
export const HERO_FILMS = Object.freeze([
  { id: '01', caption: 'gm. fully caffeinated.', description: 'A little SOULI takes an espresso shower.' },
  { id: '06', caption: 'gm to everyone except my alarm.', description: 'A little SOULI meets a very lively toaster.' },
  { id: '16', caption: 'five minute break, fren.', description: 'A little SOULI sinks into a soft sofa.' },
  { id: '21', caption: 'fresh fit. slightly oversized.', description: 'A little SOULI tries on an enormous sock.' },
  { id: '28', caption: 'ready to launch. almost.', description: 'A little SOULI sets off in a paper car.' },
  { id: '37', caption: 'automating my entire personality.', description: 'A little SOULI catches a ride on a robot vacuum.' },
].map(film => Object.freeze({ ...film, video: `${base}episode-${film.id}.mp4`, poster: `${base}episode-${film.id}-poster.jpg` })))

export const HERO_SESSION_KEY = 'souli-hero-film-v1'
export function chooseFilm(exclude, random = Math.random) {
  const choices = HERO_FILMS.filter(film => film.id !== exclude)
  return choices[Math.min(choices.length - 1, Math.max(0, Math.floor(random() * choices.length)))]
}
// Browsers can deny storage access. The banner must still work in memory.
export function createFilmSession(getStorage, random = Math.random) {
  let current
  try { current = HERO_FILMS.find(film => film.id === getStorage()?.getItem(HERO_SESSION_KEY)) } catch {}
  function save(film) {
    current = film
    try { getStorage()?.setItem(HERO_SESSION_KEY, film.id) } catch {}
    return film
  }
  if (!current) save(chooseFilm(null, random))
  return {
    current: () => current,
    next: () => save(chooseFilm(current.id, random)),
    advance: () => save(HERO_FILMS[(HERO_FILMS.findIndex(film => film.id === current.id) + 1) % HERO_FILMS.length]),
  }
}

export function mayAutoplay({ reducedMotion = false, saveData = false, hidden = false } = {}) {
  return !reducedMotion && !saveData && !hidden
}
