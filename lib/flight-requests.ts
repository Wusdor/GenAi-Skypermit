import { supabaseAdmin } from './supabase-admin'
import type { FlightRequestRow } from './types'

export async function fetchFlightRequestById(id: string): Promise<FlightRequestRow | null> {
  const { data, error } = await supabaseAdmin.from('flight_requests').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data as FlightRequestRow | null
}
