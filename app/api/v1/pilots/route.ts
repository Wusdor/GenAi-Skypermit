import { getSessionOperator } from '@/lib/auth'
import { computePilotCurrencyStatus } from '@/lib/derived'
import { badRequest, created, ok, unauthorized } from '@/lib/http'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { PilotRating } from '@/lib/types'
import { isNonEmptyString, isOneOf, isPlainDate } from '@/lib/validation'

const RATINGS: PilotRating[] = ['R_BASIC', 'R_ADVANCED', 'R_BVLOS']

// Not one of the original 16 in docs/03-api-contract.md — added because the
// contract had no way to list pilots at all, and docs/04-frontend-spec.md
// needs both a pilot registry list and an operator-scoped picker fed the
// same way the zone picker is fed from GET /zones.
//
// operator_id is no longer a query param (was, before operator auth):
// this always lists the logged-in operator's own pilots, derived from the
// session — see docs/03-api-contract.md's "Authentication & authorisation".
export async function GET() {
  const operator = await getSessionOperator()
  if (!operator) return unauthorized('Log in to view your pilots.')

  const { data, error } = await supabaseAdmin
    .from('pilots')
    .select('*')
    .eq('operator_id', operator.id)
    .order('full_name')
  if (error) throw error

  const now = new Date()
  return ok(data.map((pilot) => ({ ...pilot, currency_status: computePilotCurrencyStatus(pilot.certified_on, now) })))
}

export async function POST(request: Request) {
  const operator = await getSessionOperator()
  if (!operator) return unauthorized('Log in to register a pilot.')

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return badRequest('Request body must be valid JSON.')
  }

  if (!isNonEmptyString(body.full_name)) return badRequest('full_name is required.')
  if (!isNonEmptyString(body.national_id)) return badRequest('national_id is required.')
  if (!isOneOf(body.rating, RATINGS)) return badRequest('rating must be one of R_BASIC, R_ADVANCED, R_BVLOS.')
  if (!isPlainDate(body.certified_on)) return badRequest('certified_on is required and must be a YYYY-MM-DD date.')

  const { data, error } = await supabaseAdmin
    .from('pilots')
    .insert({
      operator_id: operator.id,
      full_name: body.full_name,
      national_id: body.national_id,
      rating: body.rating,
      certified_on: body.certified_on,
    })
    .select('*')
    .single()

  if (error) {
    if (error.code === '23505') return badRequest('A pilot with this national_id already exists.')
    throw error
  }

  return created(data)
}
