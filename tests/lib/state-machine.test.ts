import { describe, expect, it } from 'vitest'
import { canApprove, canCancel, canReject, canSubmit, isPastCancellationDeadline } from '@/lib/state-machine'
import type { FlightRequestState } from '@/lib/types'

const ALL_STATES: FlightRequestState[] = [
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
  'COMPLETED',
]

// docs/02-state-machine.md: any transition not shown in the diagram is
// invalid and must 409 — including re-triggering a transition from a
// state that looks similar (e.g. re-submitting something already
// UNDER_REVIEW).

describe('canSubmit', () => {
  it('is only legal from DRAFT', () => {
    for (const state of ALL_STATES) {
      expect(canSubmit(state)).toBe(state === 'DRAFT')
    }
  })
})

describe('canApprove', () => {
  it('is only legal from UNDER_REVIEW', () => {
    for (const state of ALL_STATES) {
      expect(canApprove(state)).toBe(state === 'UNDER_REVIEW')
    }
  })
})

describe('canReject', () => {
  it('is only legal from UNDER_REVIEW', () => {
    for (const state of ALL_STATES) {
      expect(canReject(state)).toBe(state === 'UNDER_REVIEW')
    }
  })
})

describe('canCancel', () => {
  it('is legal from DRAFT, UNDER_REVIEW, and APPROVED', () => {
    expect(canCancel('DRAFT')).toBe(true)
    expect(canCancel('UNDER_REVIEW')).toBe(true)
    expect(canCancel('APPROVED')).toBe(true)
  })

  it('is illegal from every terminal state', () => {
    expect(canCancel('REJECTED')).toBe(false)
    expect(canCancel('CANCELLED')).toBe(false)
    expect(canCancel('COMPLETED')).toBe(false)
  })

  // docs/02-state-machine.md's prose lists SUBMITTED alongside DRAFT and
  // UNDER_REVIEW as able to reach CANCELLED, but the same doc says
  // SUBMITTED is transient and "a request should never be observed
  // sitting in SUBMITTED" — submit() writes straight from DRAFT to
  // UNDER_REVIEW/REJECTED in one update, so no persisted row is ever
  // actually in SUBMITTED for a cancel call to reach. This test pins the
  // current (structurally-unreachable-in-practice) behavior rather than
  // silently assuming which reading is "right" — see the conversation
  // this test suite was written in for the flag raised about it.
  it('currently returns false for SUBMITTED, even though the state diagram prose lists it as cancellable', () => {
    expect(canCancel('SUBMITTED')).toBe(false)
  })
})

// docs/06-business-rules.md §5 (TSD-4 §6): an APPROVED request may be
// cancelled up to 2 hours before window_start.
describe('isPastCancellationDeadline', () => {
  const now = new Date('2026-06-01T12:00:00.000Z')

  it('is not past the deadline more than 2 hours out', () => {
    const windowStart = new Date(now.getTime() + 3 * 60 * 60 * 1000)
    expect(isPastCancellationDeadline(windowStart, now)).toBe(false)
  })

  it('is not past the deadline at exactly 2 hours out (boundary is inclusive of "up to")', () => {
    const windowStart = new Date(now.getTime() + 2 * 60 * 60 * 1000)
    expect(isPastCancellationDeadline(windowStart, now)).toBe(false)
  })

  it('is past the deadline one minute inside the 2-hour window', () => {
    const windowStart = new Date(now.getTime() + 2 * 60 * 60 * 1000 - 60 * 1000)
    expect(isPastCancellationDeadline(windowStart, now)).toBe(true)
  })

  it('is past the deadline once window_start has already elapsed', () => {
    const windowStart = new Date(now.getTime() - 60 * 1000)
    expect(isPastCancellationDeadline(windowStart, now)).toBe(true)
  })
})
