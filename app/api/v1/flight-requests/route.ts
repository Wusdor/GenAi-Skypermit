import { getSessionOperator, hasReviewerHeader } from '@/lib/auth'
import { loadRelatedEntities } from '@/lib/gate-context'
import { badRequest, created, forbidden, notFound, ok, unauthorized } from '@/lib/http'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { FlightRequestState } from '@/lib/types'
import { isIsoDateTime, isNonEmptyString, isOneOf, isPositiveInteger, isUuid } from '@/lib/validation'

const STATES: FlightRequestState[] = [
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
  'COMPLETED',
]

const MAX_PURPOSE_LENGTH = 2000

// operator_id is no longer accepted in the body: it's derived from the
// session, same reasoning as GET/POST /pilots and /aircraft.
export async function POST(request: Request) {
  const operator = await getSessionOperator()
  if (!operator) return unauthorized('Log in to create a flight request.')

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return badRequest('Request body must be valid JSON.')
  }

  if (!isUuid(body.pilot_id)) return badRequest('pilot_id is required and must be a valid UUID.')
  if (!isUuid(body.aircraft_id)) return badRequest('aircraft_id is required and must be a valid UUID.')
  if (!isNonEmptyString(body.zone_code)) return badRequest('zone_code is required.')
  if (!isIsoDateTime(body.window_start)) return badRequest('window_start is required and must be a valid timestamp.')
  if (!isIsoDateTime(body.window_end)) return badRequest('window_end is required and must be a valid timestamp.')
  if (new Date(body.window_end as string).getTime() <= new Date(body.window_start as string).getTime()) {
    return badRequest('window_end must be after window_start.')
  }
  if (!isPositiveInteger(body.requested_altitude_metres)) {
    return badRequest('requested_altitude_metres is required and must be a positive integer.')
  }
  if (body.flight_purpose !== undefined && body.flight_purpose !== null) {
    if (typeof body.flight_purpose !== 'string' || body.flight_purpose.length > MAX_PURPOSE_LENGTH) {
      return badRequest(`flight_purpose must be a string of at most ${MAX_PURPOSE_LENGTH} characters.`)
    }
  }

  const related = await loadRelatedEntities({
    operator_id: operator.id,
    pilot_id: body.pilot_id as string,
    aircraft_id: body.aircraft_id as string,
    zone_code: body.zone_code as string,
  })
  if (!related.ok) return notFound(capitalise(related.missing))

  const { pilot, aircraft } = related.entities
  // PLACEHOLDER — status code/body for a SUSPENDED-operator precondition are
  // still undefined per docs/05-open-questions.md §1. 403 + ad hoc body was
  // proposed as a reasonable stand-in and accepted for now, but this is not
  // settled — confirm with whoever owns the API contract before relying on
  // 403 elsewhere (e.g. in a frontend error-handling branch).
  if (operator.status === 'SUSPENDED') {
    return forbidden('Operator is suspended and cannot create flight requests.')
  }
  if (pilot.operator_id !== operator.id) return badRequest('pilot_id does not belong to your operator account.')
  if (aircraft.operator_id !== operator.id) return badRequest('aircraft_id does not belong to your operator account.')

  const { data, error } = await supabaseAdmin
    .from('flight_requests')
    .insert({
      operator_id: operator.id,
      pilot_id: body.pilot_id,
      aircraft_id: body.aircraft_id,
      zone_code: body.zone_code,
      window_start: body.window_start,
      window_end: body.window_end,
      requested_altitude_metres: body.requested_altitude_metres,
      flight_purpose: body.flight_purpose ?? null,
    })
    .select('*')
    .single()

  if (error) throw error

  return created(data)
}

// Reviewers (X-Reviewer-Id) see the shared queue across all operators, with
// optional filters. Operators only ever see their own requests — operator_id
// is forced to the session, ignoring any client-supplied value.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const isReviewer = hasReviewerHeader(request)

  let scopedOperatorId: string | null = null
  if (!isReviewer) {
    const operator = await getSessionOperator()
    if (!operator) return unauthorized('Log in or provide X-Reviewer-Id.')
    scopedOperatorId = operator.id
  }

  let query = supabaseAdmin.from('flight_requests').select('*').order('created_at', { ascending: false })

  const state = searchParams.get('state')
  if (state !== null) {
    if (!isOneOf(state, STATES)) return badRequest('state must be a valid FlightRequest state.')
    query = query.eq('state', state)
  }

  if (scopedOperatorId) {
    query = query.eq('operator_id', scopedOperatorId)
  } else {
    const operatorId = searchParams.get('operator_id')
    if (operatorId !== null) {
      if (!isUuid(operatorId)) return badRequest('operator_id must be a valid UUID.')
      query = query.eq('operator_id', operatorId)
    }
  }

  const zoneCode = searchParams.get('zone_code')
  if (zoneCode !== null) query = query.eq('zone_code', zoneCode)

  const from = searchParams.get('from')
  if (from !== null) {
    if (!isIsoDateTime(from)) return badRequest('from must be a valid timestamp.')
    query = query.gte('window_start', from)
  }

  const to = searchParams.get('to')
  if (to !== null) {
    if (!isIsoDateTime(to)) return badRequest('to must be a valid timestamp.')
    query = query.lte('window_start', to)
  }

  const { data, error } = await query
  if (error) throw error

  return ok(data)
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
