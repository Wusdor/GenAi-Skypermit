import { supabaseAdmin } from './supabase-admin'
import type { AircraftRow, OperatorRow, PilotRow, ZoneRow } from './types'

export interface RelatedEntities {
  operator: OperatorRow
  pilot: PilotRow
  aircraft: AircraftRow
  zone: ZoneRow
}

export type MissingEntity = 'operator' | 'pilot' | 'aircraft' | 'zone'

export type RelatedEntitiesResult =
  | { ok: true; entities: RelatedEntities }
  | { ok: false; missing: MissingEntity }

// Loads the four entities a gate pipeline run (or a flight-request create)
// needs, in parallel. Shared so `POST /flight-requests`, `submit`, and
// `validate` all resolve FKs the same way.
export async function loadRelatedEntities(params: {
  operator_id: string
  pilot_id: string
  aircraft_id: string
  zone_code: string
}): Promise<RelatedEntitiesResult> {
  const [operatorRes, pilotRes, aircraftRes, zoneRes] = await Promise.all([
    supabaseAdmin.from('operators').select('*').eq('id', params.operator_id).maybeSingle(),
    supabaseAdmin.from('pilots').select('*').eq('id', params.pilot_id).maybeSingle(),
    supabaseAdmin.from('aircraft').select('*').eq('id', params.aircraft_id).maybeSingle(),
    supabaseAdmin.from('zones').select('*').eq('code', params.zone_code).maybeSingle(),
  ])

  for (const res of [operatorRes, pilotRes, aircraftRes, zoneRes]) {
    if (res.error) throw res.error
  }

  if (!operatorRes.data) return { ok: false, missing: 'operator' }
  if (!pilotRes.data) return { ok: false, missing: 'pilot' }
  if (!aircraftRes.data) return { ok: false, missing: 'aircraft' }
  if (!zoneRes.data) return { ok: false, missing: 'zone' }

  return {
    ok: true,
    entities: {
      operator: operatorRes.data as OperatorRow,
      pilot: pilotRes.data as PilotRow,
      aircraft: aircraftRes.data as AircraftRow,
      zone: zoneRes.data as ZoneRow,
    },
  }
}
