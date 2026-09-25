import { getSessionOperator } from '@/lib/auth'
import { evaluateGates } from '@/lib/gates/pipeline'
import { loadRelatedEntities } from '@/lib/gate-context'
import { fetchFlightRequestById } from '@/lib/flight-requests'
import { badRequest, conflict, forbidden, gateFailure, notFound, ok, unauthorized } from '@/lib/http'
import { canSubmit } from '@/lib/state-machine'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { isUuid } from '@/lib/validation'

// docs/02-state-machine.md: DRAFT --submit--> gates run --> UNDER_REVIEW or
// REJECTED. SUBMITTED is transient and must never be observed at rest, so
// this writes straight from DRAFT to the resolved state in one update.
// Operator-only: submitting is an action on the caller's own request, never
// a reviewer action.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!isUuid(id)) return badRequest('id must be a valid UUID.')

  const sessionOperator = await getSessionOperator()
  if (!sessionOperator) return unauthorized('Log in to submit a flight request.')

  const flightRequest = await fetchFlightRequestById(id)
  if (!flightRequest) return notFound('FlightRequest')

  if (flightRequest.operator_id !== sessionOperator.id) {
    return forbidden('Operators may only submit their own flight requests.')
  }

  if (!canSubmit(flightRequest.state)) {
    return conflict(`Cannot submit a flight request in state ${flightRequest.state}.`)
  }

  const related = await loadRelatedEntities({
    operator_id: flightRequest.operator_id,
    pilot_id: flightRequest.pilot_id,
    aircraft_id: flightRequest.aircraft_id,
    zone_code: flightRequest.zone_code,
  })
  if (!related.ok) throw new Error(`FlightRequest ${id} references a missing ${related.missing}.`)

  const { operator, pilot, aircraft, zone } = related.entities
  // PLACEHOLDER — see docs/05-open-questions.md §1: status code/body for a
  // SUSPENDED-operator precondition are undefined. 403 accepted as a
  // stand-in, not a settled answer.
  if (operator.status === 'SUSPENDED') {
    return forbidden('Operator is suspended and cannot submit flight requests.')
  }

  const evaluatedAt = new Date()
  const result = await evaluateGates(
    { operator, pilot, aircraft, zone, flightRequest, evaluatedAt },
    { excludeRequestId: id }
  )

  if (!result.pass) {
    const { error } = await supabaseAdmin
      .from('flight_requests')
      .update({
        state: 'REJECTED',
        failing_gate: result.failing_gate,
        rejection_reason: result.message,
        rule_reference: result.rule_reference,
        submitted_at: evaluatedAt.toISOString(),
        decided_at: evaluatedAt.toISOString(),
        decided_by: null,
      })
      .eq('id', id)
    if (error) throw error
    return gateFailure(result)
  }

  const { data, error } = await supabaseAdmin
    .from('flight_requests')
    .update({
      state: 'UNDER_REVIEW',
      failing_gate: null,
      rejection_reason: null,
      rule_reference: null,
      submitted_at: evaluatedAt.toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error

  return ok(data)
}
