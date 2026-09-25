import { computePilotCurrencyStatus } from '../derived'
import type { PilotRating, ZoneClass } from '../types'
import { fail, pass, type GateContext, type GateResult } from './types'

// docs/06-business-rules.md §1.1 (OH-1 §2.1)
const RATING_COVERS_ZONE_CLASS: Record<PilotRating, ZoneClass[]> = {
  R_BASIC: ['OPEN'],
  R_ADVANCED: ['OPEN', 'CONTROLLED'],
  R_BVLOS: ['OPEN', 'CONTROLLED', 'RESTRICTED'],
}

export function evaluatePilotGate(ctx: GateContext): GateResult {
  const { pilot, zone, flightRequest } = ctx

  if (!RATING_COVERS_ZONE_CLASS[pilot.rating].includes(zone.zone_class)) {
    return fail(
      'PILOT',
      'OH-1 §2.1',
      `Pilot rating ${pilot.rating} does not cover ${zone.zone_class} zones.`
    )
  }

  const windowStart = new Date(flightRequest.window_start)
  const currency = computePilotCurrencyStatus(pilot.certified_on, windowStart)
  if (currency === 'LAPSED') {
    return fail(
      'PILOT',
      'OH-1 §2.3',
      'Pilot certification will not be current at the requested flight window (18-month currency lapsed).'
    )
  }

  return pass()
}
