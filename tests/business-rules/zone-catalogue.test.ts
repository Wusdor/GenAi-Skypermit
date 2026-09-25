import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// Guards against supabase/seed.sql drifting from the zone catalogue table
// in docs/06-business-rules.md §4 (curfews per §1.4's A-7 override). If
// this fails, one of the two has been edited without the other — go
// check which one is now wrong before touching either.

const seedSql = readFileSync(resolve(__dirname, '../../supabase/seed.sql'), 'utf8')

interface ExpectedZone {
  code: string
  zoneClass: string
  ceiling: number
  bands: string[]
  authLevel: string
  curfewStart: string | null
  curfewEnd: string | null
  active: boolean
}

// Transcribed directly from docs/06-business-rules.md §4.
const EXPECTED_ZONES: ExpectedZone[] = [
  { code: 'KBP-CTR-3', zoneClass: 'CONTROLLED', ceiling: 120, bands: ['C0', 'C1', 'C2'], authLevel: 'L2', curfewStart: '23:00', curfewEnd: '05:00', active: true },
  { code: 'ODS-CTR-5', zoneClass: 'CONTROLLED', ceiling: 90, bands: ['C0', 'C1', 'C2'], authLevel: 'L2', curfewStart: '23:00', curfewEnd: '05:00', active: true },
  { code: 'LVV-RST-2', zoneClass: 'RESTRICTED', ceiling: 60, bands: ['C0', 'C1'], authLevel: 'L3', curfewStart: '22:00', curfewEnd: '06:00', active: true },
  { code: 'ZTM-RST-7', zoneClass: 'RESTRICTED', ceiling: 45, bands: ['C0'], authLevel: 'L3', curfewStart: '22:00', curfewEnd: '06:00', active: true },
  { code: 'DNI-OPN-1', zoneClass: 'OPEN', ceiling: 120, bands: ['C0', 'C1', 'C2', 'C3'], authLevel: 'L1', curfewStart: null, curfewEnd: null, active: true },
  { code: 'KHR-OPN-4', zoneClass: 'OPEN', ceiling: 120, bands: ['C0', 'C1', 'C2', 'C3'], authLevel: 'L1', curfewStart: null, curfewEnd: null, active: true },
]

function findZoneTuple(code: string): string {
  // Each zone is one `('CODE', 'Name', 'CLASS', ceiling, array[...], 'LVL', start, end, active)` tuple.
  const re = new RegExp(`\\('${code}'[\\s\\S]*?\\)\\s*,?\\s*\\n`, 'm')
  const match = seedSql.match(re)
  if (!match) throw new Error(`seed.sql has no tuple for zone ${code}`)
  return match[0]
}

describe('supabase/seed.sql matches docs/06-business-rules.md §4', () => {
  it('has exactly the six zones the business rules doc lists, no more, no fewer', () => {
    const codesInSeed = [...seedSql.matchAll(/\('([A-Z0-9-]+)',/g)].map((m) => m[1])
    expect(new Set(codesInSeed)).toEqual(new Set(EXPECTED_ZONES.map((z) => z.code)))
  })

  for (const zone of EXPECTED_ZONES) {
    describe(zone.code, () => {
      const tuple = findZoneTuple(zone.code)

      it('zone_class matches', () => {
        expect(tuple).toMatch(new RegExp(`'${zone.code}',\\s*'[^']+',\\s*'${zone.zoneClass}'`))
      })

      it('ceiling_metres matches', () => {
        expect(tuple).toMatch(new RegExp(`'${zone.zoneClass}',\\s*${zone.ceiling}\\b`))
      })

      it('permitted_bands matches, in order', () => {
        const bandsPattern = zone.bands.map((b) => `'${b}'`).join(',\\s*')
        expect(tuple).toMatch(new RegExp(`array\\[${bandsPattern}\\]`))
      })

      it('required_authorisation_level matches', () => {
        expect(tuple).toMatch(new RegExp(`\\],\\s*'${zone.authLevel}'`))
      })

      it('curfew matches (including the A-7 override for KBP-CTR-3/ODS-CTR-5)', () => {
        if (zone.curfewStart === null) {
          expect(tuple).toMatch(/,\s*null,\s*null,/)
        } else {
          expect(tuple).toMatch(new RegExp(`'${zone.curfewStart}',\\s*'${zone.curfewEnd}'`))
        }
      })

      it('active matches', () => {
        expect(tuple).toMatch(new RegExp(`${zone.active},?\\s*\\)`))
      })
    })
  }

  it('zone_class independently gates pilot rating per §4\'s restated rule — cross-checked against lib/gates/pilot-gate.ts', async () => {
    const { evaluatePilotGate } = await import('@/lib/gates/pilot-gate')
    const { makeGateContext, makePilot, makeZone } = await import('../fixtures')

    // OPEN accepts any rating, CONTROLLED requires R_ADVANCED or R_BVLOS,
    // RESTRICTED requires R_BVLOS.
    const expectations: Record<string, string[]> = {
      OPEN: ['R_BASIC', 'R_ADVANCED', 'R_BVLOS'],
      CONTROLLED: ['R_ADVANCED', 'R_BVLOS'],
      RESTRICTED: ['R_BVLOS'],
    }
    for (const [zoneClass, allowedRatings] of Object.entries(expectations)) {
      for (const rating of ['R_BASIC', 'R_ADVANCED', 'R_BVLOS'] as const) {
        const ctx = makeGateContext({
          pilot: makePilot({ rating }),
          zone: makeZone({ zone_class: zoneClass as 'OPEN' | 'CONTROLLED' | 'RESTRICTED', required_authorisation_level: 'L1' }),
        })
        expect(evaluatePilotGate(ctx).pass).toBe(allowedRatings.includes(rating))
      }
    }
  })
})
