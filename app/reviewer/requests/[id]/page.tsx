'use client'

import { use, useEffect, useState } from 'react'
import { GateResultsPanel } from '@/components/GateResultsPanel'
import { RequireReviewer } from '@/components/RequireReviewer'
import { apiErrorMessage, api, type GateResult } from '@/lib/client/api'
import { Button, Card, Divider, Field, Kicker, KeyValueList, SectionHeader, StateBadge, SuccessToast } from '@/components/ui'
import type { FailingGate, FlightRequestRow } from '@/lib/types'

export default function ReviewerRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  return (
    <RequireReviewer testId="reviewer-request-detail-no-reviewer">
      {(reviewerId) => <ReviewerRequestDetailForReviewer id={id} reviewerId={reviewerId} />}
    </RequireReviewer>
  )
}

function ReviewerRequestDetailForReviewer({ id, reviewerId }: { id: string; reviewerId: string }) {
  const [flightRequest, setFlightRequest] = useState<FlightRequestRow | null>(null)
  const [gateResult, setGateResult] = useState<GateResult | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    api.getFlightRequest(id, reviewerId).then((res) => {
      if (res.ok) setFlightRequest(res.data)
      else setError(apiErrorMessage(res.error))
    })
    // docs/04-frontend-spec.md: the reviewer detail view shows all four gate
    // results — this is a dry run, so it's safe to call on load regardless
    // of the request's current state.
    api.validateFlightRequest(id, reviewerId).then((res) => {
      if (res.ok) setGateResult(res.data)
      else if (res.status === 422) {
        setGateResult({
          ok: false,
          failing_gate: res.error.failing_gate as FailingGate,
          rule_reference: res.error.rule_reference ?? '',
          message: res.error.message ?? '',
        })
      }
    })
  }, [id, reviewerId])

  async function handleApprove() {
    setBusy(true)
    setError(null)
    const res = await api.approveFlightRequest(id, reviewerId)
    setBusy(false)
    if (res.ok) {
      setFlightRequest(res.data)
      setSuccessMessage('Flight request approved.')
    } else {
      setError(apiErrorMessage(res.error))
    }
  }

  async function handleReject() {
    if (!note.trim()) {
      setError('A note is required to reject.')
      return
    }
    setBusy(true)
    setError(null)
    const res = await api.rejectFlightRequest(id, reviewerId, note)
    setBusy(false)
    if (res.ok) {
      setFlightRequest(res.data)
      setSuccessMessage('Flight request rejected.')
    } else {
      setError(apiErrorMessage(res.error))
    }
  }

  if (error && !flightRequest) {
    return (
      <p className="sp-status-error" data-testid="reviewer-request-detail-error">
        {error}
      </p>
    )
  }
  if (!flightRequest) return <p className="sp-status-info">Loading…</p>

  const noteFilled = note.trim().length > 0

  return (
    <section className="sp-section" data-testid="reviewer-request-detail">
      <SectionHeader
        kicker={`Reviewer / ${id}`}
        title="Review flight request"
        aside={<StateBadge state={flightRequest.state} testId="reviewer-request-detail-state" />}
      />

      <div className="sp-grid sp-grid--split-wide">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, minWidth: 0 }}>
          <div className="sp-stack">
            <Kicker>Gate results</Kicker>
            <GateResultsPanel result={gateResult} />
          </div>

          <Card>
            <Kicker>Submitted request</Kicker>
            <KeyValueList
              columns={2}
              items={[
                { label: 'Operator', value: <span data-testid="reviewer-request-detail-operator">{flightRequest.operator_id}</span> },
                { label: 'Zone', value: <span data-testid="reviewer-request-detail-zone">{flightRequest.zone_code}</span> },
                {
                  label: 'Window',
                  value: (
                    <span data-testid="reviewer-request-detail-window">
                      {flightRequest.window_start} – {flightRequest.window_end}
                    </span>
                  ),
                },
                {
                  label: 'Altitude',
                  value: <span data-testid="reviewer-request-detail-altitude">{flightRequest.requested_altitude_metres} m</span>,
                },
                {
                  label: 'Purpose',
                  value: <span data-testid="reviewer-request-detail-purpose">{flightRequest.flight_purpose || '—'}</span>,
                },
              ]}
            />
          </Card>
        </div>

        {flightRequest.state === 'UNDER_REVIEW' ? (
          <Card variant="emphasis">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Kicker>Decision</Kicker>
              <h2 className="sp-card-title sp-card-title--accent">Approve or reject</h2>
            </div>

            <Field
              as="textarea"
              label="Reviewer note"
              required
              requiredLabel="required to reject"
              rows={5}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Give the operator the reason and the rule it comes from."
              testId="reviewer-reject-note-textarea"
              hint={noteFilled ? 'Note will be sent to the operator with the decision.' : 'Reject is unavailable until a note is written.'}
              hintTone={noteFilled ? 'default' : 'accent'}
            />

            <Divider />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Button block testId="reviewer-approve-button" onClick={handleApprove} disabled={busy}>
                Approve
              </Button>
              <Button block variant="secondary" testId="reviewer-reject-button" onClick={handleReject} disabled={busy || !noteFilled}>
                Reject
              </Button>
            </div>

            {error && (
              <p className="sp-status-error" data-testid="reviewer-request-detail-error">
                {error}
              </p>
            )}
          </Card>
        ) : (
          error && (
            <p className="sp-status-error" data-testid="reviewer-request-detail-error">
              {error}
            </p>
          )
        )}
      </div>

      {successMessage && (
        <SuccessToast
          message={successMessage}
          onDismiss={() => setSuccessMessage(null)}
          testId="reviewer-request-detail-success"
        />
      )}
    </section>
  )
}
