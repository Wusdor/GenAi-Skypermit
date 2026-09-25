import type { AircraftRow, OperatorRow, PilotRow, ZoneRow } from '@/lib/types'
import type { GateContext, GateFlightRequest } from '@/lib/gates/types'

// A baseline scenario that clears all four gates cleanly. Each test
// overrides only the field(s) relevant to the rule under test, so a
// failing assertion points at exactly one changed input.
//
// evaluatedAt anchors "now" for every lead-time/currency/overlap
// calculation in these tests — 2026-06-01T12:00:00Z, comfortably inside
// the window every source document in docs/06-business-rules.md is in
// force for (TSD-4/ZC-2026.1 effective 2026-01-01, A-7 effective
// 2026-02-10, OH-1 v2.0 effective 2026-01-15).
export const EVALUATED_AT = new Date('2026-06-01T12:00:00.000Z')

export function makeOperator(overrides: Partial<OperatorRow> = {}): OperatorRow {
  return {
    id: 'operator-1',
    legal_name: 'Test Operator',
    national_id: 'OP-NID-1',
    email: 'operator@example.com',
    phone: null,
    address_line: null,
    city: null,
    postal_code: null,
    authorisation_level: 'L3',
    registered_on: '2026-01-01',
    status: 'ACTIVE',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

export function makePilot(overrides: Partial<PilotRow> = {}): PilotRow {
  return {
    id: 'pilot-1',
    operator_id: 'operator-1',
    full_name: 'Test Pilot',
    national_id: 'PL-NID-1',
    rating: 'R_BVLOS',
    // Comfortably current as of EVALUATED_AT / a window a week out.
    certified_on: '2026-01-01',
    status: 'ACTIVE',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

export function makeAircraft(overrides: Partial<AircraftRow> = {}): AircraftRow {
  return {
    id: 'aircraft-1',
    operator_id: 'operator-1',
    manufacturer: 'Test Manufacturer',
    model: 'Test Model',
    serial_number: 'SN-1',
    // C0 band (<=900g) — permitted in every zone in the catalogue.
    mtom_grams: 500,
    registered_on: '2026-01-01',
    status: 'ACTIVE',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

// DNI-OPN-1 from docs/06-business-rules.md §4 / supabase/seed.sql: OPEN,
// 120m ceiling, C0-C3, no curfew, L1 — the simplest zone in the catalogue.
export function makeZone(overrides: Partial<ZoneRow> = {}): ZoneRow {
  return {
    code: 'DNI-OPN-1',
    name: 'Dnipro Open 1',
    zone_class: 'OPEN',
    ceiling_metres: 120,
    permitted_bands: ['C0', 'C1', 'C2', 'C3'],
    required_authorisation_level: 'L1',
    curfew_start: null,
    curfew_end: null,
    active: true,
    ...overrides,
  }
}

export function makeFlightRequest(overrides: Partial<GateFlightRequest> = {}): GateFlightRequest {
  const windowStart = new Date(EVALUATED_AT.getTime() + 7 * 24 * 60 * 60 * 1000) // +7 days
  const windowEnd = new Date(windowStart.getTime() + 30 * 60 * 1000) // +30 minutes
  return {
    id: 'flight-request-1',
    window_start: windowStart.toISOString(),
    window_end: windowEnd.toISOString(),
    requested_altitude_metres: 50,
    ...overrides,
  }
}

export function makeGateContext(overrides: Partial<GateContext> = {}): GateContext {
  return {
    operator: makeOperator(),
    pilot: makePilot(),
    aircraft: makeAircraft(),
    zone: makeZone(),
    flightRequest: makeFlightRequest(),
    evaluatedAt: EVALUATED_AT,
    ...overrides,
  }
}
