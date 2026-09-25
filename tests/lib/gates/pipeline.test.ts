import { describe, expect, it, vi } from 'vitest'
import { evaluateGates } from '@/lib/gates/pipeline'
import { makeAircraft, makeGateContext, makeOperator, makePilot, makeZone } from '../../fixtures'

// The overlap query inside TIME_WINDOW is only reached when PILOT,
// AIRCRAFT, and ZONE all pass — mock it so the "everything passes"
// pipeline test doesn't need a real DB.
vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: vi.fn(() => {
      const builder: Record<string, unknown> = {}
      for (const m of ['select', 'eq', 'in', 'lt', 'gt', 'neq']) builder[m] = vi.fn(() => builder)
      builder.then = (resolve: (v: { count: number; error: null }) => void) => resolve({ count: 0, error: null })
      return builder
    }),
  },
}))

// docs/03-api-contract.md / docs/06-business-rules.md "Evaluation order":
// gates run PILOT -> AIRCRAFT -> ZONE -> TIME_WINDOW, stopping at the
// first failure. failing_gate always names the first gate to fail, never
// every gate that would fail.

describe('evaluateGates — fixed order, stop at first failure', () => {
  it('passes when every gate is clean', async () => {
    const result = await evaluateGates(makeGateContext())
    expect(result.pass).toBe(true)
  })

  it('reports PILOT when both PILOT and AIRCRAFT would fail', async () => {
    const ctx = makeGateContext({
      pilot: makePilot({ rating: 'R_BASIC' }), // fails vs a RESTRICTED zone
      aircraft: makeAircraft({ mtom_grams: 20000 }), // C3, would also fail a C0-only zone
      zone: makeZone({ zone_class: 'RESTRICTED', permitted_bands: ['C0'], required_authorisation_level: 'L1' }),
    })
    const result = await evaluateGates(ctx)
    expect(result.pass).toBe(false)
    if (!result.pass) expect(result.failing_gate).toBe('PILOT')
  })

  it('reports AIRCRAFT (not ZONE) when both AIRCRAFT and ZONE would fail — PILOT passes first', async () => {
    const ctx = makeGateContext({
      aircraft: makeAircraft({ mtom_grams: 20000 }), // C3, not permitted below
      zone: makeZone({ permitted_bands: ['C0'], ceiling_metres: 10 }), // also fails altitude
      operator: makeOperator({ authorisation_level: 'L3' }),
      pilot: makePilot({ rating: 'R_BVLOS' }),
    })
    const result = await evaluateGates(ctx)
    expect(result.pass).toBe(false)
    if (!result.pass) expect(result.failing_gate).toBe('AIRCRAFT')
  })

  it('reports ZONE (not TIME_WINDOW) when both ZONE and TIME_WINDOW would fail', async () => {
    const ctx = makeGateContext({
      zone: makeZone({ active: false }),
      flightRequest: {
        id: 'fr-1',
        // also fails TIME_WINDOW (duration way too short), should never be reached
        window_start: '2026-07-01T12:00:00.000Z',
        window_end: '2026-07-01T12:01:00.000Z',
        requested_altitude_metres: 50,
      },
    })
    const result = await evaluateGates(ctx)
    expect(result.pass).toBe(false)
    if (!result.pass) expect(result.failing_gate).toBe('ZONE')
  })

  it('only reaches TIME_WINDOW, and reports it, when PILOT/AIRCRAFT/ZONE all pass', async () => {
    const ctx = makeGateContext({
      flightRequest: {
        id: 'fr-1',
        window_start: new Date('2026-06-01T13:00:00.000Z').toISOString(), // 1 hour lead — fails §2.1
        window_end: new Date('2026-06-01T13:30:00.000Z').toISOString(),
        requested_altitude_metres: 50,
      },
    })
    const result = await evaluateGates(ctx)
    expect(result.pass).toBe(false)
    if (!result.pass) {
      expect(result.failing_gate).toBe('TIME_WINDOW')
      expect(result.rule_reference).toBe('TSD-4 §2.1')
    }
  })

  it('respects excludeRequestId end to end through the pipeline', async () => {
    const result = await evaluateGates(makeGateContext(), { excludeRequestId: 'self-id' })
    expect(result.pass).toBe(true)
  })
})
