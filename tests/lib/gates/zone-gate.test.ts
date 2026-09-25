import { describe, expect, it } from 'vitest'
import { evaluateZoneGate } from '@/lib/gates/zone-gate'
import { makeFlightRequest, makeGateContext, makeOperator, makeZone } from '../../fixtures'

// docs/06-business-rules.md §1.3: three ZONE conditions — altitude vs
// ceiling (ZC-2026.1 §2), operator authorisation level vs zone's required
// level (OH-1 §4), and zone active flag (ZC-2026.1 §4, citation flagged
// as not fully confirmed in docs/05-open-questions.md §2).

describe('evaluateZoneGate — altitude vs ceiling', () => {
  it('passes at or under the ceiling', () => {
    const ctx = makeGateContext({
      zone: makeZone({ ceiling_metres: 120 }),
      flightRequest: makeFlightRequest({ requested_altitude_metres: 120 }),
    })
    expect(evaluateZoneGate(ctx).pass).toBe(true)
  })

  it('fails one metre over the ceiling, with gate=ZONE and rule_reference ZC-2026.1 §2', () => {
    const ctx = makeGateContext({
      zone: makeZone({ ceiling_metres: 120 }),
      flightRequest: makeFlightRequest({ requested_altitude_metres: 121 }),
    })
    const result = evaluateZoneGate(ctx)
    expect(result.pass).toBe(false)
    if (!result.pass) {
      expect(result.failing_gate).toBe('ZONE')
      expect(result.rule_reference).toBe('ZC-2026.1 §2')
    }
  })
})

describe('evaluateZoneGate — operator authorisation level (OH-1 §4)', () => {
  it('passes when the operator level is exactly the zone-required level', () => {
    const ctx = makeGateContext({
      operator: makeOperator({ authorisation_level: 'L2' }),
      zone: makeZone({ required_authorisation_level: 'L2' }),
    })
    expect(evaluateZoneGate(ctx).pass).toBe(true)
  })

  it('passes when the operator level exceeds the zone-required level', () => {
    const ctx = makeGateContext({
      operator: makeOperator({ authorisation_level: 'L3' }),
      zone: makeZone({ required_authorisation_level: 'L1' }),
    })
    expect(evaluateZoneGate(ctx).pass).toBe(true)
  })

  it('fails when the operator level is below the zone-required level, citing OH-1 §4', () => {
    const ctx = makeGateContext({
      operator: makeOperator({ authorisation_level: 'L1' }),
      zone: makeZone({ required_authorisation_level: 'L2' }),
    })
    const result = evaluateZoneGate(ctx)
    expect(result.pass).toBe(false)
    if (!result.pass) {
      expect(result.failing_gate).toBe('ZONE')
      expect(result.rule_reference).toBe('OH-1 §4')
    }
  })

  it('L1 < L2 < L3 ordering holds across all pairs', () => {
    const levels = ['L1', 'L2', 'L3'] as const
    for (let i = 0; i < levels.length; i++) {
      for (let j = 0; j < levels.length; j++) {
        const ctx = makeGateContext({
          operator: makeOperator({ authorisation_level: levels[i] }),
          zone: makeZone({ required_authorisation_level: levels[j] }),
        })
        expect(evaluateZoneGate(ctx).pass).toBe(i >= j)
      }
    }
  })
})

describe('evaluateZoneGate — zone active flag (ZC-2026.1 §4)', () => {
  it('passes for an active zone', () => {
    expect(evaluateZoneGate(makeGateContext({ zone: makeZone({ active: true }) })).pass).toBe(true)
  })

  it('fails for an inactive zone, citing ZC-2026.1 §4', () => {
    const ctx = makeGateContext({ zone: makeZone({ active: false, code: 'TEST-ZONE' }) })
    const result = evaluateZoneGate(ctx)
    expect(result.pass).toBe(false)
    if (!result.pass) {
      expect(result.failing_gate).toBe('ZONE')
      expect(result.rule_reference).toBe('ZC-2026.1 §4')
      expect(result.message).toContain('TEST-ZONE')
    }
  })
})

describe('evaluateZoneGate — evaluation order within the gate', () => {
  it('reports altitude-over-ceiling before an authorisation-level failure when both conditions fail', () => {
    // docs/06-business-rules.md §1.3 lists altitude, then authorisation
    // level, then active, in that order.
    const ctx = makeGateContext({
      operator: makeOperator({ authorisation_level: 'L1' }),
      zone: makeZone({ ceiling_metres: 50, required_authorisation_level: 'L3' }),
      flightRequest: makeFlightRequest({ requested_altitude_metres: 100 }),
    })
    const result = evaluateZoneGate(ctx)
    expect(result.pass).toBe(false)
    if (!result.pass) expect(result.rule_reference).toBe('ZC-2026.1 §2')
  })
})
