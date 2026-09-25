import type { AircraftRow, FailingGate, OperatorRow, PilotRow, ZoneRow } from '../types'

export interface GateFailure {
  failing_gate: FailingGate
  rule_reference: string
  message: string
}

export type GateResult = { pass: true } | ({ pass: false } & GateFailure)

export function pass(): GateResult {
  return { pass: true }
}

export function fail(failing_gate: FailingGate, rule_reference: string, message: string): GateResult {
  return { pass: false, failing_gate, rule_reference, message }
}

// The subset of FlightRequest fields the gates need. Deliberately a plain
// object (not FlightRequestRow) so `validate`/`submit` can build it from
// either a persisted row or a not-yet-persisted DRAFT payload.
export interface GateFlightRequest {
  id?: string
  window_start: string
  window_end: string
  requested_altitude_metres: number
}

export interface GateContext {
  operator: OperatorRow
  pilot: PilotRow
  aircraft: AircraftRow
  zone: ZoneRow
  flightRequest: GateFlightRequest
  // The instant gate evaluation is happening — stands in for "submission
  // time" for both `submit` and the `validate` dry-run. Also used as the
  // reference point for the aircraft-schedule overlap query.
  evaluatedAt: Date
}
