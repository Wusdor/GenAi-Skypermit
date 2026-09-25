'use client'

import { use, useEffect, useState } from 'react'
import { FlightRequestPanel } from '@/components/FlightRequestPanel'
import { apiErrorMessage, api } from '@/lib/client/api'
import { SectionHeader } from '@/components/ui'
import type { FlightRequestRow } from '@/lib/types'

export default function FlightRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [flightRequest, setFlightRequest] = useState<FlightRequestRow | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.getFlightRequest(id).then((res) => {
      if (res.ok) setFlightRequest(res.data)
      else setError(apiErrorMessage(res.error))
    })
  }, [id])

  return (
    <section className="sp-section">
      <SectionHeader kicker={`Request / ${id}`} title="Flight request" />
      {error && (
        <p className="sp-status-error" data-testid="flight-request-detail-error">
          {error}
        </p>
      )}
      {!error && !flightRequest && <p className="sp-status-info">Loading…</p>}
      {flightRequest && <FlightRequestPanel flightRequest={flightRequest} onUpdate={setFlightRequest} />}
    </section>
  )
}
