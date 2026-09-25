import type { FlightRequestState } from '@/lib/types'

// Aqua outline = active/pending. Aqua fill = approved. Dimmed white =
// everything else, INCLUDING REJECTED — pink is reserved for singular,
// non-repeating flags (see GateCard's `urgent`).
export function stateBadgeVariant(state: FlightRequestState): 'approved' | 'pending' | 'neutral' {
  if (state === 'APPROVED') return 'approved'
  if (state === 'UNDER_REVIEW' || state === 'SUBMITTED') return 'pending'
  return 'neutral'
}

export function StateBadge({ state, testId }: { state: FlightRequestState; testId?: string }) {
  const variant = stateBadgeVariant(state)
  const cls = variant === 'neutral' ? 'sp-badge' : `sp-badge sp-badge--${variant}`
  return (
    <span className={cls} data-testid={testId ?? `state-badge-${state.toLowerCase()}`}>
      {state.replace(/_/g, ' ')}
    </span>
  )
}
