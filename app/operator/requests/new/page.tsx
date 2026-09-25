'use client'

import { useEffect, useState } from 'react'
import { FlightRequestPanel } from '@/components/FlightRequestPanel'
import { apiErrorMessage, api, type AircraftWithBand, type PilotWithCurrency } from '@/lib/client/api'
import { Button, Card, Divider, Field, FlowList, Kicker, SectionHeader, SelectField, SuccessToast } from '@/components/ui'
import type { FlightRequestRow, ZoneRow } from '@/lib/types'

const emptyForm = {
  zone_code: '',
  pilot_id: '',
  aircraft_id: '',
  window_start: '',
  window_end: '',
  requested_altitude_metres: '',
  flight_purpose: '',
}

export default function NewFlightRequestPage() {
  const [zones, setZones] = useState<ZoneRow[]>([])
  const [pilots, setPilots] = useState<PilotWithCurrency[]>([])
  const [aircraft, setAircraft] = useState<AircraftWithBand[]>([])
  const [form, setForm] = useState(emptyForm)
  const [createError, setCreateError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [created, setCreated] = useState<FlightRequestRow | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    api.listZones().then((res) => {
      if (res.ok) setZones(res.data)
    })
    // operator_id is derived server-side from the session — see
    // app/api/v1/pilots/route.ts and app/api/v1/aircraft/route.ts.
    api.listPilots().then((res) => {
      if (res.ok) setPilots(res.data)
    })
    api.listAircraft().then((res) => {
      if (res.ok) setAircraft(res.data)
    })
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setCreateError(null)

    const windowStart = form.window_start ? new Date(form.window_start).toISOString() : ''
    const windowEnd = form.window_end ? new Date(form.window_end).toISOString() : ''

    const res = await api.createFlightRequest({
      pilot_id: form.pilot_id,
      aircraft_id: form.aircraft_id,
      zone_code: form.zone_code,
      window_start: windowStart,
      window_end: windowEnd,
      requested_altitude_metres: Number(form.requested_altitude_metres),
      flight_purpose: form.flight_purpose || undefined,
    })
    setSubmitting(false)
    if (res.ok) {
      setCreated(res.data)
      setSuccessMessage('Flight request created.')
    } else {
      setCreateError(apiErrorMessage(res.error))
    }
  }

  if (created) {
    return (
      <section className="sp-section">
        <SectionHeader kicker="Operator / Request" title="New flight request" />
        <FlightRequestPanel flightRequest={created} onUpdate={setCreated} />
        {successMessage && (
          <SuccessToast
            message={successMessage}
            onDismiss={() => setSuccessMessage(null)}
            testId="flight-request-create-success"
          />
        )}
      </section>
    )
  }

  return (
    <section className="sp-section">
      <SectionHeader
        kicker="Operator / Request"
        title="New flight request"
        subhead="Every zone, pilot and aircraft is listed. Nothing is filtered or greyed out — run the check to see what would pass."
      />

      <div className="sp-grid sp-grid--split">
        <Card style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 26, padding: 28 }}>
          <form data-testid="flight-request-create-form" onSubmit={handleCreate} style={{ display: 'contents' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <Kicker>Request details</Kicker>
            </div>

            {/* docs/04-frontend-spec.md: pickers are not pre-filtered against
                business rules — every zone/pilot/aircraft is offered, even
                combinations that cannot possibly pass the gates. */}
            <div style={{ gridColumn: '1 / -1' }}>
              <SelectField
                label="Zone"
                required
                testId="flight-request-zone-select"
                value={form.zone_code}
                onChange={(e) => setForm((f) => ({ ...f, zone_code: e.target.value }))}
                hint="All zones are listed, including restricted and curfewed ones."
                options={[{ value: '', label: 'Select a zone' }, ...zones.map((z) => ({ value: z.code, label: `${z.code} — ${z.name}` }))]}
              />
            </div>

            <SelectField
              label="Pilot"
              required
              testId="flight-request-pilot-select"
              value={form.pilot_id}
              onChange={(e) => setForm((f) => ({ ...f, pilot_id: e.target.value }))}
              options={[
                { value: '', label: 'Select a pilot' },
                ...pilots.map((p) => ({ value: p.id, label: `${p.full_name} (${p.rating})` })),
              ]}
            />

            <SelectField
              label="Aircraft"
              required
              testId="flight-request-aircraft-select"
              value={form.aircraft_id}
              onChange={(e) => setForm((f) => ({ ...f, aircraft_id: e.target.value }))}
              options={[
                { value: '', label: 'Select an aircraft' },
                ...aircraft.map((a) => ({ value: a.id, label: `${a.manufacturer} ${a.model} (${a.serial_number})` })),
              ]}
            />

            <div className="sp-field-pair" style={{ gridColumn: '1 / -1' }}>
              <Field
                label="Window start"
                type="datetime-local"
                required
                testId="flight-request-window-start-input"
                value={form.window_start}
                onChange={(e) => setForm((f) => ({ ...f, window_start: e.target.value }))}
              />
              <Field
                label="Window end"
                type="datetime-local"
                required
                testId="flight-request-window-end-input"
                value={form.window_end}
                onChange={(e) => setForm((f) => ({ ...f, window_end: e.target.value }))}
              />
            </div>
            <div className="sp-field-pair" style={{ gridColumn: '1 / -1' }}>
              <Field
                label="Altitude (metres)"
                type="number"
                min={1}
                required
                testId="flight-request-altitude-input"
                value={form.requested_altitude_metres}
                onChange={(e) => setForm((f) => ({ ...f, requested_altitude_metres: e.target.value }))}
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <Field
                label="Purpose"
                as="textarea"
                rows={4}
                maxLength={2000}
                testId="flight-request-purpose-textarea"
                value={form.flight_purpose}
                onChange={(e) => setForm((f) => ({ ...f, flight_purpose: e.target.value }))}
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <Divider />
            </div>

            <div className="sp-row" style={{ gridColumn: '1 / -1' }}>
              {createError && (
                <p className="sp-status-error" data-testid="flight-request-create-error">
                  {createError}
                </p>
              )}
              <Button type="submit" testId="flight-request-create-submit-button" disabled={submitting}>
                {submitting ? 'Creating…' : 'Create request'}
              </Button>
            </div>
          </form>
        </Card>

        <Card>
          <Kicker>How the check works</Kicker>
          <h2 className="sp-card-title">Four gates, one pass each</h2>
          <FlowList steps={['Pilot', 'Aircraft', 'Zone', 'Time window']} />
          <p className="sp-body">
            Create the request, then use <span className="sp-meta">Check before submitting</span> to see how it fares
            against the gates without changing its state.
          </p>
        </Card>
      </div>
    </section>
  )
}
