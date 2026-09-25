'use client'

import { useEffect, useState } from 'react'
import { apiErrorMessage, api, type AircraftWithBand } from '@/lib/client/api'
import { Button, Card, Field, Kicker, SectionHeader, SuccessToast } from '@/components/ui'

const emptyForm = { manufacturer: '', model: '', serial_number: '', mtom_grams: '' }

export default function AircraftPage() {
  // null = not yet loaded, [] = loaded and empty — see the same comment in
  // app/operator/pilots/page.tsx re: react-hooks/set-state-in-effect.
  const [aircraft, setAircraft] = useState<AircraftWithBand[] | null>(null)
  const [listError, setListError] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [createError, setCreateError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  // See app/operator/pilots/page.tsx re: react-hooks/set-state-in-effect —
  // the effect fetches inline and a refresh is triggered by bumping this.
  const [refreshIndex, setRefreshIndex] = useState(0)

  useEffect(() => {
    let cancelled = false
    api.listAircraft().then((res) => {
      if (cancelled) return
      if (res.ok) {
        setAircraft(res.data)
        setListError(null)
      } else {
        setListError(apiErrorMessage(res.error))
      }
    })
    return () => {
      cancelled = true
    }
  }, [refreshIndex])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setCreateError(null)
    const res = await api.createAircraft({
      manufacturer: form.manufacturer,
      model: form.model,
      serial_number: form.serial_number,
      mtom_grams: Number(form.mtom_grams),
    })
    setSubmitting(false)
    if (res.ok) {
      setForm(emptyForm)
      setRefreshIndex((i) => i + 1)
      setSuccessMessage(`${res.data.manufacturer} ${res.data.model} registered.`)
    } else {
      setCreateError(apiErrorMessage(res.error))
    }
  }

  return (
    <section className="sp-section">
      <SectionHeader
        kicker="Operator / Registry"
        title="Aircraft registry"
        subhead="Registration and maintenance dates drive the AIRCRAFT gate. Nothing here is filtered by zone."
      />
      <div className="sp-grid sp-grid--split">
        <Card>
          <Kicker>Registered aircraft</Kicker>
          {listError && (
            <p className="sp-status-error" data-testid="aircraft-registry-error">
              {listError}
            </p>
          )}
          {aircraft === null && !listError && <p className="sp-status-info">Loading…</p>}
          {aircraft !== null && !listError && aircraft.length === 0 && (
            <p className="sp-status-info" data-testid="aircraft-registry-empty">
              No aircraft registered yet.
            </p>
          )}
          {aircraft !== null && aircraft.length > 0 && (
            <div className="sp-table-wrap">
              <table className="sp-table" data-testid="aircraft-registry-list">
                <thead>
                  <tr>
                    <th>Manufacturer</th>
                    <th>Model</th>
                    <th>Serial number</th>
                    <th>MTOM (g)</th>
                    <th>Weight band</th>
                  </tr>
                </thead>
                <tbody>
                  {aircraft.map((a) => (
                    <tr key={a.id} data-testid={`aircraft-registry-row-${a.id}`}>
                      <td>{a.manufacturer}</td>
                      <td>{a.model}</td>
                      <td className="sp-cell-mono">{a.serial_number}</td>
                      <td className="sp-cell-dim">{a.mtom_grams}</td>
                      <td className="sp-cell-code">{a.weight_band}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card variant="emphasis" testId="aircraft-create-form">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Kicker>Add aircraft</Kicker>
            <h2 className="sp-card-title sp-card-title--accent">Register an aircraft</h2>
          </div>
          <form onSubmit={handleCreate} className="sp-stack">
            <Field
              label="Manufacturer"
              required
              testId="aircraft-create-manufacturer-input"
              value={form.manufacturer}
              onChange={(e) => setForm((f) => ({ ...f, manufacturer: e.target.value }))}
            />
            <Field
              label="Model"
              required
              testId="aircraft-create-model-input"
              value={form.model}
              onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
            />
            <Field
              label="Serial number"
              required
              testId="aircraft-create-serial-number-input"
              value={form.serial_number}
              onChange={(e) => setForm((f) => ({ ...f, serial_number: e.target.value }))}
            />
            <Field
              label="MTOM (grams)"
              type="number"
              min={1}
              required
              testId="aircraft-create-mtom-grams-input"
              value={form.mtom_grams}
              onChange={(e) => setForm((f) => ({ ...f, mtom_grams: e.target.value }))}
            />
            {createError && (
              <p className="sp-status-error" data-testid="aircraft-create-error">
                {createError}
              </p>
            )}
            <Button type="submit" testId="aircraft-create-submit-button" disabled={submitting}>
              {submitting ? 'Registering…' : 'Register aircraft'}
            </Button>
          </form>
        </Card>
      </div>

      {successMessage && (
        <SuccessToast message={successMessage} onDismiss={() => setSuccessMessage(null)} testId="aircraft-create-success" />
      )}
    </section>
  )
}
