import { describe, expect, it, vi } from 'vitest'
import type { FlightRequestRow, FlightRequestState } from '@/lib/types'

// docs/02-state-machine.md: "Any transition not shown below is invalid
// and must return 409 — including transitions that look harmless, such
// as re-submitting something already UNDER_REVIEW." submit is only legal
// from DRAFT.

function makeFlightRequestRow(state: FlightRequestState): FlightRequestRow {
  return {
    id: 'fr-1',
    operator_id: 'operator-1',
    pilot_id: 'pilot-1',
    aircraft_id: 'aircraft-1',
    zone_code: 'DNI-OPN-1',
    window_start: '2026-07-01T00:00:00.000Z',
    window_end: '2026-07-01T00:30:00.000Z',
    requested_altitude_metres: 50,
    flight_purpose: null,
    state,
    rejection_reason: null,
    failing_gate: null,
    rule_reference: null,
    submitted_at: null,
    decided_at: null,
    decided_by: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  }
}

vi.mock('@/lib/auth', () => ({
  getSessionOperator: vi.fn(async () => ({ id: 'operator-1', status: 'ACTIVE' })),
}))

let stubbedFlightRequest: FlightRequestRow | null = null
vi.mock('@/lib/flight-requests', () => ({
  fetchFlightRequestById: vi.fn(async () => stubbedFlightRequest),
}))

// The route module statically imports the gate pipeline (for the
// pass/fail path), which in turn imports the real Supabase client at
// module load time — stub it out so just importing the route handler
// below doesn't require real env vars. None of the tests here reach the
// gate pipeline (they all short-circuit on the state-machine check).
vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: vi.fn(() => {
      const builder: Record<string, unknown> = {}
      for (const m of ['select', 'eq', 'in', 'lt', 'gt', 'neq', 'update']) builder[m] = vi.fn(() => builder)
      builder.then = (resolve: (v: { count: number; error: null }) => void) => resolve({ count: 0, error: null })
      return builder
    }),
  },
}))

const { POST } = await import('@/app/api/v1/flight-requests/[id]/submit/route')

function callSubmit(id: string) {
  return POST(new Request(`http://localhost/api/v1/flight-requests/${id}/submit`, { method: 'POST' }), {
    params: Promise.resolve({ id }),
  })
}

describe('POST /flight-requests/{id}/submit — illegal state transitions return 409', () => {
  const illegalStates: FlightRequestState[] = ['UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED']

  for (const state of illegalStates) {
    it(`rejects re-submitting a request already in ${state} with 409`, async () => {
      stubbedFlightRequest = makeFlightRequestRow(state)
      const res = await callSubmit('123e4567-e89b-12d3-a456-426614174000')
      expect(res.status).toBe(409)
    })
  }

  it('returns 404 for a nonexistent request rather than a state-machine error', async () => {
    stubbedFlightRequest = null
    const res = await callSubmit('123e4567-e89b-12d3-a456-426614174000')
    expect(res.status).toBe(404)
  })

  it('returns 400 for a malformed id before touching the state machine at all', async () => {
    const res = await callSubmit('not-a-uuid')
    expect(res.status).toBe(400)
  })
})
