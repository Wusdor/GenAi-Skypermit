import type { FlightRequestState } from './types'

// docs/02-state-machine.md — any transition not represented here is
// invalid and must 409, including re-triggering a transition from a state
// that looks similar (e.g. re-submitting something already UNDER_REVIEW).
const CANCELLABLE_STATES: readonly FlightRequestState[] = ['DRAFT', 'UNDER_REVIEW', 'APPROVED']

export function canSubmit(state: FlightRequestState): boolean {
  return state === 'DRAFT'
}

export function canCancel(state: FlightRequestState): boolean {
  return CANCELLABLE_STATES.includes(state)
}

export function canApprove(state: FlightRequestState): boolean {
  return state === 'UNDER_REVIEW'
}

export function canReject(state: FlightRequestState): boolean {
  return state === 'UNDER_REVIEW'
}

// docs/02-state-machine.md / docs/06-business-rules.md §5 (TSD-4 §6)
export const CANCELLATION_DEADLINE_MS = 2 * 60 * 60 * 1000

export function isPastCancellationDeadline(windowStart: Date, now: Date): boolean {
  return windowStart.getTime() - now.getTime() < CANCELLATION_DEADLINE_MS
}
