'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { apiErrorMessage, api } from '@/lib/client/api'
import { Card, SectionHeader, SelectField, StateBadge } from '@/components/ui'
import type { FlightRequestRow, FlightRequestState } from '@/lib/types'

// SUBMITTED is transient and never observed at rest (docs/02-state-machine.md)
// — omitted from the filter since no request can ever be found in it.
const FILTERABLE_STATES: FlightRequestState[] = [
  'DRAFT',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
  'COMPLETED',
]

export default function MyRequestsPage() {
  // null = not yet loaded, [] = loaded and empty — see the same comment in
  // app/operator/pilots/page.tsx re: react-hooks/set-state-in-effect.
  const [requests, setRequests] = useState<FlightRequestRow[] | null>(null)
  const [stateFilter, setStateFilter] = useState<FlightRequestState | ''>('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    // operator_id is derived server-side from the session — see
    // app/api/v1/flight-requests/route.ts.
    api.listFlightRequests({ state: stateFilter || undefined }).then((res) => {
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
  }, [stateFilter])

  return (
    <section className="sp-section">
      <SectionHeader kicker="Operator / Requests" title="My requests" />
      <div style={{ maxWidth: 320 }}>
        <SelectField
          label="Filter by state"
          testId="flight-request-list-state-filter"
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value as FlightRequestState | '')}
          options={[{ value: '', label: 'All' }, ...FILTERABLE_STATES.map((s) => ({ value: s, label: s }))]}
        />
      </div>

      {error && (
        <p className="sp-status-error" data-testid="flight-request-list-error">
          {error}
        </p>
      )}
      {requests === null && !error && <p className="sp-status-info">Loading…</p>}
      {requests !== null && !error && requests.length === 0 && (
        <p className="sp-status-info" data-testid="flight-request-list-empty">
          No flight requests found.
        </p>
      )}
      {requests !== null && requests.length > 0 && (
        <Card>
          <div className="sp-table-wrap">
            <table className="sp-table" data-testid="flight-request-list">
              <thead>
                <tr>
                  <th>Zone</th>
                  <th>Window start</th>
                  <th>State</th>
                  <th className="sp-table__num">Open</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id} data-testid={`flight-request-list-row-${r.id}`}>
                    <td className="sp-cell-mono">{r.zone_code}</td>
                    <td className="sp-cell-dim">{r.window_start}</td>
                    <td>
                      <StateBadge state={r.state} />
                    </td>
                    <td className="sp-table__num">
                      <Link href={`/operator/requests/${r.id}`} className="sp-linkbtn">
                        Open →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </section>
  )
}
