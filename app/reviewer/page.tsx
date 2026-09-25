'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { RequireReviewer } from '@/components/RequireReviewer'
import { apiErrorMessage, api } from '@/lib/client/api'
import { Card, SectionHeader, SortHeader } from '@/components/ui'
import type { FlightRequestRow } from '@/lib/types'

type SortDirection = 'asc' | 'desc'

export default function ReviewerQueuePage() {
  return (
    <section className="sp-section">
      <SectionHeader kicker="Reviewer / Queue" title="Pending requests" />
      <RequireReviewer testId="reviewer-queue-no-reviewer">
        {(reviewerId) => <ReviewerQueueForReviewer reviewerId={reviewerId} />}
      </RequireReviewer>
    </section>
  )
}

function ReviewerQueueForReviewer({ reviewerId }: { reviewerId: string }) {
  // null = not yet loaded, [] = loaded and empty — see the comment in
  // app/operator/pilots/page.tsx re: react-hooks/set-state-in-effect.
  const [requests, setRequests] = useState<FlightRequestRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  useEffect(() => {
    let cancelled = false
    api.listFlightRequests({ state: 'UNDER_REVIEW' }, reviewerId).then((res) => {
      if (cancelled) return
      if (res.ok) {
        setRequests(res.data)
        setError(null)
      } else {
        setError(apiErrorMessage(res.error))
      }
    })
    return () => {
      cancelled = true
    }
  }, [reviewerId])

  const sorted = [...(requests ?? [])].sort((a, b) => {
    const aTime = a.submitted_at ? new Date(a.submitted_at).getTime() : 0
    const bTime = b.submitted_at ? new Date(b.submitted_at).getTime() : 0
    return sortDirection === 'asc' ? aTime - bTime : bTime - aTime
  })

  return (
    <>
      {error && (
        <p className="sp-status-error" data-testid="reviewer-queue-error">
          {error}
        </p>
      )}
      {requests === null && !error && <p className="sp-status-info">Loading…</p>}
      {requests !== null && !error && sorted.length === 0 && (
        <p className="sp-status-info" data-testid="reviewer-queue-empty">
          No requests awaiting review.
        </p>
      )}
      {sorted.length > 0 && (
        <Card>
          <div className="sp-table-wrap">
            <table className="sp-table" data-testid="reviewer-queue-list">
              <thead>
                <tr>
                  <th>Operator</th>
                  <th>Zone</th>
                  <SortHeader
                    label="Submitted at"
                    direction={sortDirection}
                    onToggle={() => setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))}
                    testId="reviewer-queue-sort-submitted-at"
                  />
                  <th className="sp-table__num">Review</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r) => (
                  <tr key={r.id} data-testid={`reviewer-queue-row-${r.id}`}>
                    <td className="sp-cell-mono">{r.operator_id}</td>
                    <td className="sp-cell-mono">{r.zone_code}</td>
                    <td className="sp-cell-dim">{r.submitted_at}</td>
                    <td className="sp-table__num">
                      <Link href={`/reviewer/requests/${r.id}`} className="sp-linkbtn">
                        Review →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  )
}
