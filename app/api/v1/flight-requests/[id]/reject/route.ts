import { fetchFlightRequestById } from '@/lib/flight-requests'
import { badRequest, conflict, notFound, ok } from '@/lib/http'
import { canReject } from '@/lib/state-machine'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { isNonEmptyString, isUuid } from '@/lib/validation'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!isUuid(id)) return badRequest('id must be a valid UUID.')

  const reviewerId = request.headers.get('X-Reviewer-Id')
  if (!reviewerId) return badRequest('X-Reviewer-Id header is required.')

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return badRequest('Request body must be valid JSON.')
  }
  if (!isNonEmptyString(body.note)) return badRequest('note is required when rejecting.')

  const flightRequest = await fetchFlightRequestById(id)
  if (!flightRequest) return notFound('FlightRequest')

  if (!canReject(flightRequest.state)) {
    return conflict(`Cannot reject a flight request in state ${flightRequest.state}.`)
  }

  const { error: reviewActionError } = await supabaseAdmin.from('review_actions').insert({
    flight_request_id: id,
    reviewer_id: reviewerId,
    action: 'REJECT',
    note: body.note,
  })
  if (reviewActionError) throw reviewActionError

  const decidedAt = new Date().toISOString()
  const { data, error } = await supabaseAdmin
    .from('flight_requests')
    .update({
      state: 'REJECTED',
      rejection_reason: body.note,
      failing_gate: null,
      rule_reference: null,
      decided_at: decidedAt,
      decided_by: reviewerId,
    })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error

  return ok(data)
}
