'use client'

import { useState } from 'react'
import { GateResultsPanel } from './GateResultsPanel'
import { apiErrorMessage, api, type GateResult } from '@/lib/client/api'
import { Button, Card, Divider, IconWarning, Kicker, KeyValueList, StateBadge, SuccessToast } from '@/components/ui'
import type { FailingGate, FlightRequestRow, FlightRequestState } from '@/lib/types'

function gateFailureFromError(error: {
  failing_gate?: string
  rule_reference?: string
  message?: string
}): GateResult {
  return {
    ok: false,
    failing_gate: error.failing_gate as FailingGate,
    rule_reference: error.rule_reference ?? '',
    message: error.message ?? '',
  }
}

const CANCELLABLE: FlightRequestState[] = ['DRAFT', 'UNDER_REVIEW', 'APPROVED']

// Shared by the request-creation flow (right after a DRAFT is created) and
// the detail page (revisiting a request later) — docs/03-api-contract.md
// endpoint 13 says validate and submit share one gate pipeline; this is the
// UI-side equivalent, one panel for both entry points.
export function FlightRequestPanel({
  flightRequest,
  onUpdate,
}: {
  flightRequest: FlightRequestRow
  onUpdate: (updated: FlightRequestRow) => void
}) {
  const [validateResult, setValidateResult] = useState<GateResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  async function handleValidate() {
    setBusy(true)
    setError(null)
    const res = await api.validateFlightRequest(flightRequest.id)
    setBusy(false)
    if (res.ok) {
      setValidateResult(res.data)
    } else if (res.status === 422) {
      setValidateResult(gateFailureFromError(res.error))
    } else {
      setError(apiErrorMessage(res.error))
    }
  }

  async function handleSubmit() {
    setBusy(true)
    setError(null)
    const res = await api.submitFlightRequest(flightRequest.id)
    setBusy(false)
    if (res.ok) {
      onUpdate(res.data)
      setValidateResult({ ok: true })
      setSuccessMessage('Flight request submitted.')
    } else if (res.status === 422) {
      setValidateResult(gateFailureFromError(res.error))
      // The row itself changed (state -> REJECTED) even though this call
      // reports as a gate failure; re-fetch so the panel reflects it.
      const refreshed = await api.getFlightRequest(flightRequest.id)
      if (refreshed.ok) onUpdate(refreshed.data)
    } else {
      setError(apiErrorMessage(res.error))
    }
  }

  async function handleCancel() {
    setBusy(true)
    setError(null)
    const res = await api.cancelFlightRequest(flightRequest.id)
    setBusy(false)
    if (res.ok) {
      onUpdate(res.data)
      setSuccessMessage('Flight request cancelled.')
    } else {
      setError(apiErrorMessage(res.error))
    }
  }

  return (
    <div data-testid="flight-request-detail" className="sp-grid sp-grid--split-wide">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, minWidth: 0 }}>
        {flightRequest.state === 'REJECTED' && (
          <Card variant="urgent" testId="rejection-callout">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <IconWarning color="var(--sp-urgent)" />
              <span className="sp-kicker" style={{ color: 'var(--sp-urgent)' }}>
                Rejected
              </span>
            </div>
            <p className="sp-body" data-testid="flight-request-detail-rejection-reason">
              {flightRequest.rejection_reason}
            </p>
            {flightRequest.rule_reference && (
              <span className="sp-gate__rule" data-testid="flight-request-detail-rule-reference">
                {flightRequest.rule_reference}
              </span>
            )}
          </Card>
        )}

        {flightRequest.state === 'DRAFT' && (
          <div className="sp-stack">
            <div className="sp-row">
              <Button testId="flight-request-validate-button" onClick={handleValidate} disabled={busy}>
                Check before submitting
              </Button>
              <Button variant="secondary" testId="flight-request-submit-button" onClick={handleSubmit} disabled={busy}>
                Submit
              </Button>
            </div>
            <GateResultsPanel result={validateResult} />
          </div>
        )}

        {error && (
          <p className="sp-status-error" data-testid="flight-request-detail-error">
            {error}
          </p>
        )}
      </div>

      <Card>
        <Kicker>Request</Kicker>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <StateBadge state={flightRequest.state} testId="flight-request-detail-state" />
        </div>
        <KeyValueList
          items={[
            { label: 'Zone', value: <span data-testid="flight-request-detail-zone">{flightRequest.zone_code}</span> },
            {
              label: 'Window',
              value: (
                <span data-testid="flight-request-detail-window">
                  {flightRequest.window_start} – {flightRequest.window_end}
                </span>
              ),
            },
            {
              label: 'Altitude',
              value: <span data-testid="flight-request-detail-altitude">{flightRequest.requested_altitude_metres} m</span>,
            },
            {
              label: 'Purpose',
              value: <span data-testid="flight-request-detail-purpose">{flightRequest.flight_purpose || '—'}</span>,
            },
          ]}
        />

        {CANCELLABLE.includes(flightRequest.state) && (
          <>
            <Divider />
            <Button variant="secondary" testId="flight-request-cancel-button" onClick={handleCancel} disabled={busy}>
              Cancel request
            </Button>
          </>
        )}
      </Card>

      {successMessage && (
        <SuccessToast
          message={successMessage}
          onDismiss={() => setSuccessMessage(null)}
          testId="flight-request-detail-success"
        />
      )}
    </div>
  )
}
