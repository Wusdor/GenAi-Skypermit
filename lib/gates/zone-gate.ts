import type { OperatorAuthorisationLevel } from '../types'
import { fail, pass, type GateContext, type GateResult } from './types'

// docs/06-business-rules.md §1.3 (OH-1 §4): L1 < L2 < L3
const AUTH_LEVEL_RANK: Record<OperatorAuthorisationLevel, number> = {
  L1: 1,
  L2: 2,
  L3: 3,
}

// Weight-band-vs-zone lives in aircraft-gate.ts, not here — see
// docs/07-clarifications.md item 1. ZC-2026.1 §2's literal "fails the zone
// gate" wording for that rule is a confirmed corpus error; don't move it
// back based on the source text alone.
export function evaluateZoneGate(ctx: GateContext): GateResult {
  const { zone, operator, flightRequest } = ctx

  if (flightRequest.requested_altitude_metres > zone.ceiling_metres) {
    return fail(
      'ZONE',
      'ZC-2026.1 §2',
      `Requested altitude ${flightRequest.requested_altitude_metres}m exceeds the ${zone.ceiling_metres}m ceiling for ${zone.code}.`
    )
  }

  if (AUTH_LEVEL_RANK[operator.authorisation_level] < AUTH_LEVEL_RANK[zone.required_authorisation_level]) {
    return fail(
      'ZONE',
      'OH-1 §4',
      `Operator authorisation level ${operator.authorisation_level} is below the ${zone.required_authorisation_level} required for zone ${zone.code}.`
    )
  }

  if (!zone.active) {
    return fail('ZONE', 'ZC-2026.1 §4', `Zone ${zone.code} is not active.`)
  }

  return pass()
}
