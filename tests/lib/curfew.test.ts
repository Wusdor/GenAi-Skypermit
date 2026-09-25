import { describe, expect, it } from 'vitest'
import { violatesCurfew, ZONE_TIMEZONE } from '@/lib/curfew'

// docs/06-business-rules.md §1.4 (TSD-4 §4): curfew is evaluated
// minute-by-minute across the whole window, zone-local time; curfews
// crossing midnight are one continuous period. ZONE_TIMEZONE is
// Europe/Kyiv, currently UTC+3 in June (no DST in the modern Ukrainian
// calendar) — window instants below are chosen a safe distance from that
// offset boundary so the test isn't fragile to it.

describe('violatesCurfew — §1.4 curfew evaluation', () => {
  it('is false when the zone has no curfew (null/null)', () => {
    // 23:00-05:00 Kyiv local on this date would violate a real curfew;
    // with no curfew configured, nothing can fail.
    expect(
      violatesCurfew(new Date('2026-06-01T23:00:00Z'), new Date('2026-06-01T23:30:00Z'), null, null)
    ).toBe(false)
  })

  it('is false for a window entirely outside a non-midnight-crossing curfew', () => {
    // 12:00-12:30 Kyiv local (09:00-09:30 UTC in June, UTC+3), curfew 22:00-06:00.
    expect(violatesCurfew(new Date('2026-06-01T09:00:00Z'), new Date('2026-06-01T09:30:00Z'), '22:00', '06:00')).toBe(
      false
    )
  })

  it('is true for a window entirely inside a midnight-crossing curfew (A-7: 23:00-05:00)', () => {
    // 01:00-01:30 Kyiv local (June UTC+3) = 22:00-22:30 UTC the prior day.
    expect(
      violatesCurfew(new Date('2026-06-01T22:00:00Z'), new Date('2026-06-01T22:30:00Z'), '23:00', '05:00')
    ).toBe(true)
  })

  it('is true when only the middle of the window clips the curfew, not just an endpoint', () => {
    // Window runs 21:00->23:30 Kyiv local, curfew 23:00-05:00: starts and
    // is mostly before curfew, but its last 30 minutes fall inside it.
    expect(
      violatesCurfew(new Date('2026-06-01T18:00:00Z'), new Date('2026-06-01T20:30:00Z'), '23:00', '05:00')
    ).toBe(true)
  })

  it('is false for a window ending one minute before curfew start', () => {
    // Window 22:00->22:59 Kyiv local, curfew starts at 23:00.
    expect(
      violatesCurfew(new Date('2026-06-01T19:00:00Z'), new Date('2026-06-01T19:59:00Z'), '23:00', '05:00')
    ).toBe(false)
  })

  it('is true for a window ending exactly at curfew start — the window\'s own end instant is evaluated too, not just the minutes strictly before it', () => {
    // Window 22:00->23:00 Kyiv local, curfew starts at 23:00: the curfew
    // check treats "the whole window" as inclusive of window_end itself,
    // symmetrically with how curfew start is inclusive (>= curfewStartMin).
    expect(
      violatesCurfew(new Date('2026-06-01T19:00:00Z'), new Date('2026-06-01T20:00:00Z'), '23:00', '05:00')
    ).toBe(true)
  })

  it('is true for a window that starts exactly at curfew start', () => {
    // Window starts 23:00 Kyiv local == curfew start (20:00 UTC).
    expect(
      violatesCurfew(new Date('2026-06-01T20:00:00Z'), new Date('2026-06-01T20:15:00Z'), '23:00', '05:00')
    ).toBe(true)
  })

  it('is false for a window that starts exactly at curfew end (curfew end is exclusive)', () => {
    // Window starts 05:00 Kyiv local == curfew end (02:00 UTC), runs 30 min past.
    expect(
      violatesCurfew(new Date('2026-06-01T02:00:00Z'), new Date('2026-06-01T02:30:00Z'), '23:00', '05:00')
    ).toBe(false)
  })

  it('uses the given zone-local timezone, defaulting to Europe/Kyiv', () => {
    expect(ZONE_TIMEZONE).toBe('Europe/Kyiv')
  })
})
