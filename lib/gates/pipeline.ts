import { evaluateAircraftGate } from './aircraft-gate'
import { evaluatePilotGate } from './pilot-gate'
import { evaluateTimeWindowGate } from './time-window-gate'
import { pass, type GateContext, type GateResult } from './types'
import { evaluateZoneGate } from './zone-gate'

// Shared by both `submit` and `validate` per docs/03-api-contract.md — do
// not duplicate this logic in either route. Fixed order, stops at first
// failure: PILOT → AIRCRAFT → ZONE → TIME_WINDOW.
export async function evaluateGates(
  ctx: GateContext,
  options?: { excludeRequestId?: string }
): Promise<GateResult> {
  const pilotResult = evaluatePilotGate(ctx)
  if (!pilotResult.pass) return pilotResult

  const aircraftResult = evaluateAircraftGate(ctx)
  if (!aircraftResult.pass) return aircraftResult

  const zoneResult = evaluateZoneGate(ctx)
  if (!zoneResult.pass) return zoneResult

  const timeWindowResult = await evaluateTimeWindowGate(ctx, options?.excludeRequestId)
  if (!timeWindowResult.pass) return timeWindowResult

  return pass()
}
