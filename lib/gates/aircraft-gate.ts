import { computeWeightBand } from '../derived'
import { fail, pass, type GateContext, type GateResult } from './types'

// docs/06-business-rules.md §1.2, as corrected by docs/07-clarifications.md
// item 1: ZC-2026.1 §2's literal "fails the zone gate" wording is a
// confirmed corpus error — this check belongs here, not in zone-gate.ts.
// The rule and its citation are unchanged, only the gate assignment moved.
export function evaluateAircraftGate(ctx: GateContext): GateResult {
  const { aircraft, zone } = ctx

  const weightBand = computeWeightBand(aircraft.mtom_grams)
  if (!zone.permitted_bands.includes(weightBand)) {
    return fail(
      'AIRCRAFT',
      'ZC-2026.1 §2',
      `Aircraft weight band ${weightBand} is not permitted in zone ${zone.code}.`
    )
  }

  return pass()
}
