import { LIVE_SALE } from './sale-config.mjs'
import pilot from '../pilot/sale.json' with { type: 'json' }
import pilotV2 from '../pilot-v2/sale.json' with { type: 'json' }
Object.freeze(pilot.terms)
export const PILOT_SALE = Object.freeze(pilot)
Object.freeze(pilotV2.terms.useOfProceeds)
Object.freeze(pilotV2.terms)
export const PILOT_V2_SALE = Object.freeze(pilotV2)

// Only a compiled page chooses a profile. URL/storage/remote manifests cannot
// override production contracts. A DEV override remains local to dev builds.
export function saleProfile(profile = 'commercial', { development = false, override } = {}) {
  if (profile === 'pilot') return PILOT_SALE
  if (profile === 'pilot-v2') return PILOT_V2_SALE
  if (profile !== 'commercial') throw Error('Unknown purchase profile.')
  return development && override ? override : LIVE_SALE
}
