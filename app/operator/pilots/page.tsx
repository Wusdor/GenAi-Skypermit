'use client'

import { useEffect, useState } from 'react'
import { apiErrorMessage, api, type PilotWithCurrency } from '@/lib/client/api'
import { Button, Card, Field, Kicker, SectionHeader, SelectField, SuccessToast } from '@/components/ui'
import type { PilotRating } from '@/lib/types'

const RATINGS: PilotRating[] = ['R_BASIC', 'R_ADVANCED', 'R_BVLOS']

const emptyForm = { full_name: '', national_id: '', rating: 'R_BASIC' as PilotRating, certified_on: '' }

export default function PilotsPage() {
  // null = not yet loaded, [] = loaded and empty — stands in for a separate
  // loading flag without a setState call that runs before the fetch's
  // first await (see react-hooks/set-state-in-effect).
  const [pilots, setPilots] = useState<PilotWithCurrency[] | null>(null)
  const [listError, setListError] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [createError, setCreateError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  // Bumped after a successful create to trigger a refetch — the effect
  // below fetches inline (rather than via a shared named callback) because
  // react-hooks/set-state-in-effect flags an effect that synchronously
  // invokes a separately defined async function which itself calls setState.
  const [refreshIndex, setRefreshIndex] = useState(0)

  useEffect(() => {
    let cancelled = false
    api.listPilots().then((res) => {
      if (cancelled) return
      if (res.ok) {
        setPilots(res.data)
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
    const res = await api.createPilot(form)
    setSubmitting(false)
    if (res.ok) {
      setForm(emptyForm)
      setRefreshIndex((i) => i + 1)
      setSuccessMessage(`${res.data.full_name} registered.`)
    } else {
      setCreateError(apiErrorMessage(res.error))
    }
  }

  return (
    <section className="sp-section">
      <SectionHeader
        kicker="Operator / Registry"
        title="Pilot registry"
        subhead="A pilot must hold a current certificate and medical to clear the PILOT gate."
      />
      <div className="sp-grid sp-grid--split">
        <Card>
          <Kicker>Registered pilots</Kicker>
          {listError && (
            <p className="sp-status-error" data-testid="pilot-registry-error">
              {listError}
            </p>
          )}
          {pilots === null && !listError && <p className="sp-status-info">Loading…</p>}
          {pilots !== null && !listError && pilots.length === 0 && (
            <p className="sp-status-info" data-testid="pilot-registry-empty">
              No pilots registered yet.
            </p>
          )}
          {pilots !== null && pilots.length > 0 && (
            <div className="sp-table-wrap">
              <table className="sp-table" data-testid="pilot-registry-list">
                <thead>
                  <tr>
                    <th>Full name</th>
                    <th>National ID</th>
                    <th>Rating</th>
                    <th>Certified on</th>
                    <th>Currency</th>
                  </tr>
                </thead>
                <tbody>
                  {pilots.map((pilot) => (
                    <tr key={pilot.id} data-testid={`pilot-registry-row-${pilot.id}`}>
                      <td>{pilot.full_name}</td>
                      <td className="sp-cell-mono">{pilot.national_id}</td>
                      <td className="sp-cell-mono">{pilot.rating}</td>
                      <td className="sp-cell-dim">{pilot.certified_on}</td>
                      <td>
                        <span className="sp-meta" style={{ color: pilot.currency_status === 'CURRENT' ? 'var(--sp-accent)' : 'var(--sp-label)' }}>
                          {pilot.currency_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card variant="emphasis" testId="pilot-create-form">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Kicker>Add pilot</Kicker>
            <h2 className="sp-card-title sp-card-title--accent">Register a pilot</h2>
          </div>
          <form onSubmit={handleCreate} className="sp-stack">
            <Field
              label="Full name"
              required
              testId="pilot-create-full-name-input"
              value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
            />
            <Field
              label="National ID"
              required
              testId="pilot-create-national-id-input"
              value={form.national_id}
              onChange={(e) => setForm((f) => ({ ...f, national_id: e.target.value }))}
            />
            <SelectField
              label="Rating"
              testId="pilot-create-rating-select"
              value={form.rating}
              onChange={(e) => setForm((f) => ({ ...f, rating: e.target.value as PilotRating }))}
              options={RATINGS}
            />
            <Field
              label="Certified on"
              type="date"
              required
              testId="pilot-create-certified-on-input"
              value={form.certified_on}
              onChange={(e) => setForm((f) => ({ ...f, certified_on: e.target.value }))}
            />
            {createError && (
              <p className="sp-status-error" data-testid="pilot-create-error">
                {createError}
              </p>
            )}
            <Button type="submit" testId="pilot-create-submit-button" disabled={submitting}>
              {submitting ? 'Registering…' : 'Register pilot'}
            </Button>
          </form>
        </Card>
      </div>

      {successMessage && (
        <SuccessToast message={successMessage} onDismiss={() => setSuccessMessage(null)} testId="pilot-create-success" />
      )}
    </section>
  )
}
