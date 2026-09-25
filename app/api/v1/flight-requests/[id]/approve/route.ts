import { fetchFlightRequestById } from '@/lib/flight-requests'
import { badRequest, conflict, forbidden, notFound, ok } from '@/lib/http'
import { canApprove } from '@/lib/state-machine'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { isUuid } from '@/lib/validation'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!isUuid(id)) return badRequest('id must be a valid UUID.')

  const reviewerId = request.headers.get('X-Reviewer-Id')
  if (!reviewerId) return badRequest('X-Reviewer-Id header is required.')

  let note: string | null = null
  const bodyText = await request.text()
  if (bodyText) {
    let body: Record<string, unknown>
    try {
      body = JSON.parse(bodyText)
    } catch {
      return badRequest('Request body must be valid JSON.')
    }
    if (body.note !== undefined && body.note !== null) {
      if (typeof body.note !== 'string') return badRequest('note must be a string.')
      note = body.note
    }
  }

  const flightRequest = await fetchFlightRequestById(id)
  if (!flightRequest) return notFound('FlightRequest')

  if (!canApprove(flightRequest.state)) {
    return conflict(`Cannot approve a flight request in state ${flightRequest.state}.`)
  }

  const { data: operator, error: operatorError } = await supabaseAdmin
    .from('operators')
    .select('status')
    .eq('id', flightRequest.operator_id)
    .single()
  if (operatorError) throw operatorError
  // PLACEHOLDER — see docs/05-open-questions.md §1: status code/body for a
  // SUSPENDED-operator precondition are undefined. 403 accepted as a
  // stand-in, not a settled answer.
  if (operator.status === 'SUSPENDED') {
    return forbidden('Operator is suspended and its requests cannot be approved.')
  }

  const { error: reviewActionError } = await supabaseAdmin.from('review_actions').insert({
    flight_request_id: id,
    reviewer_id: reviewerId,
    action: 'APPROVE',
    note,
  })
  if (reviewActionError) throw reviewActionError

  const decidedAt = new Date().toISOString()
  const { data, error } = await supabaseAdmin
    .from('flight_requests')
    .update({ state: 'APPROVED', decided_at: decidedAt, decided_by: reviewerId })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error

  return ok(data)
}
