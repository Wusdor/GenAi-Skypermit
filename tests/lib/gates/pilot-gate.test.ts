import { describe, expect, it } from 'vitest'
import { evaluatePilotGate } from '@/lib/gates/pilot-gate'
import { EVALUATED_AT, makeGateContext, makePilot, makeZone } from '../../fixtures'

// docs/06-business-rules.md §1.1 (OH-1 §2.1 / §2.3): PILOT gate has two
// independent conditions — rating covers zone class, and certification
// is current (18 months from certified_on) as of window_start.

describe('evaluatePilotGate — rating vs zone class (OH-1 §2.1)', () => {
  it('R_BASIC covers OPEN only', () => {
    const ctx = makeGateContext({ pilot: makePilot({ rating: 'R_BASIC' }), zone: makeZone({ zone_class: 'OPEN' }) })
    expect(evaluatePilotGate(ctx).pass).toBe(true)
  })

  it('R_BASIC fails against CONTROLLED', () => {
    const ctx = makeGateContext({
      pilot: makePilot({ rating: 'R_BASIC' }),
      zone: makeZone({ zone_class: 'CONTROLLED', required_authorisation_level: 'L1' }),
    })
    const result = evaluatePilotGate(ctx)
    expect(result.pass).toBe(false)
    if (!result.pass) {
      expect(result.failing_gate).toBe('PILOT')
      expect(result.rule_reference).toBe('OH-1 §2.1')
    }
  })

  it('R_BASIC fails against RESTRICTED', () => {
    const ctx = makeGateContext({
      pilot: makePilot({ rating: 'R_BASIC' }),
      zone: makeZone({ zone_class: 'RESTRICTED', required_authorisation_level: 'L1' }),
    })
    expect(evaluatePilotGate(ctx).pass).toBe(false)
  })

  it('R_ADVANCED covers OPEN and CONTROLLED but not RESTRICTED', () => {
    const pilot = makePilot({ rating: 'R_ADVANCED' })
    expect(evaluatePilotGate(makeGateContext({ pilot, zone: makeZone({ zone_class: 'OPEN' }) })).pass).toBe(true)
    expect(
      evaluatePilotGate(
        makeGateContext({ pilot, zone: makeZone({ zone_class: 'CONTROLLED', required_authorisation_level: 'L1' }) })
      ).pass
    ).toBe(true)
    expect(
      evaluatePilotGate(
        makeGateContext({ pilot, zone: makeZone({ zone_class: 'RESTRICTED', required_authorisation_level: 'L1' }) })
      ).pass
    ).toBe(false)
  })

  it('R_BVLOS covers all three zone classes', () => {
    const pilot = makePilot({ rating: 'R_BVLOS' })
    for (const zone_class of ['OPEN', 'CONTROLLED', 'RESTRICTED'] as const) {
      expect(
        evaluatePilotGate(makeGateContext({ pilot, zone: makeZone({ zone_class, required_authorisation_level: 'L1' }) }))
          .pass
      ).toBe(true)
    }
  })
})

describe('evaluatePilotGate — 18-month currency vs window_start (OH-1 §2.3)', () => {
  it('passes when currency has not lapsed by window_start', () => {
    const flightRequest = { id: 'fr-1', window_start: EVALUATED_AT.toISOString(), window_end: EVALUATED_AT.toISOString(), requested_altitude_metres: 50 }
    const ctx = makeGateContext({ pilot: makePilot({ certified_on: '2026-01-01' }), flightRequest })
    expect(evaluatePilotGate(ctx).pass).toBe(true)
  })

  it('fails when currency has lapsed by window_start, even though it may still be current "now"', () => {
    // certified_on 2020-01-01 -> lapsed 2021-07-01, long before this
    // flight's window_start — the check is against window_start, not
    // submission time.
    const windowStart = new Date('2026-06-08T12:00:00.000Z')
    const ctx = makeGateContext({
      pilot: makePilot({ certified_on: '2020-01-01' }),
      flightRequest: {
        id: 'fr-1',
        window_start: windowStart.toISOString(),
        window_end: new Date(windowStart.getTime() + 30 * 60 * 1000).toISOString(),
        requested_altitude_metres: 50,
      },
    })
    const result = evaluatePilotGate(ctx)
    expect(result.pass).toBe(false)
    if (!result.pass) {
      expect(result.failing_gate).toBe('PILOT')
      expect(result.rule_reference).toBe('OH-1 §2.3')
    }
  })

  it('rating check is independent of currency — a lapsed R_BASIC pilot against an OPEN zone still fails on currency, not rating', () => {
    const windowStart = new Date('2026-06-08T12:00:00.000Z')
    const ctx = makeGateContext({
      pilot: makePilot({ rating: 'R_BASIC', certified_on: '2020-01-01' }),
      zone: makeZone({ zone_class: 'OPEN' }),
      flightRequest: {
        id: 'fr-1',
        window_start: windowStart.toISOString(),
        window_end: new Date(windowStart.getTime() + 30 * 60 * 1000).toISOString(),
        requested_altitude_metres: 50,
      },
    })
    const result = evaluatePilotGate(ctx)
    expect(result.pass).toBe(false)
    if (!result.pass) expect(result.rule_reference).toBe('OH-1 §2.3')
  })
})
