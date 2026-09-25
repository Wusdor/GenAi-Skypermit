'use client'

import type { ReactNode } from 'react'
import { useIdentity } from './identity'

// GET/validate on flight-requests now require either an operator session or
// X-Reviewer-Id (see app/api/v1/flight-requests/*/route.ts) — this gates the
// reviewer pages the same way RequireOperator used to gate operator pages,
// before operator auth replaced that with a real session.
export function RequireReviewer({
  testId,
  children,
}: {
  testId: string
  children: (reviewerId: string) => ReactNode
}) {
  const { reviewerId } = useIdentity()
  if (!reviewerId) {
    return (
      <p className="sp-status-info" data-testid={testId}>
        Enter a Reviewer ID in the header to continue.
      </p>
    )
  }
  return <>{children(reviewerId)}</>
}
