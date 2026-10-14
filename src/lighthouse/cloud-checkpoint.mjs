import { advanceAutomatic } from './sanctuary.mjs'
export const CLOUD_POLL_MS = 5 * 60_000
// Presentation only. Neither this projected state nor the browser clock is sent
// to the server. Real actions always settle against the stored server checkpoint.
export function projectCloudHome(checkpoint, elapsedMs) {
  const home = JSON.parse(JSON.stringify(checkpoint.home))
  const elapsed = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0
  const until = Math.min(checkpoint.serverTime + elapsed, checkpoint.leaseUntil || checkpoint.serverTime)
  if (home.automation) advanceAutomatic(home, Math.max(home.lastAt, until))
  return home
}
export function projectDefense(defense, serverTime) {
  if (!defense) return null
  // Light and the result stay server-confirmed. Only the phase's clock advances.
  const phase = serverTime < defense.startAt + 5 * 60_000 ? 'prepare' : serverTime < defense.endAt ? 'guard' : serverTime < defense.endAt + 10 * 60_000 ? 'recover' : 'rest'
  return { ...defense, phase }
}
