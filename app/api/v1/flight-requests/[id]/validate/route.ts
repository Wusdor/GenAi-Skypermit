import { getSessionOperator, hasReviewerHeader } from '@/lib/auth'
import { fetchFlightRequestById } from '@/lib/flight-requests'
import { loadRelatedEntities } from '@/lib/gate-context'
import { evaluateGates } from '@/lib/gates/pipeline'
import { badRequest, forbidden, gateFailure, notFound, ok, unauthorized } from '@/lib/http'
import { isUuid } from '@/lib/validation'

// docs/03-api-contract.md endpoint 13: runs every gate exactly as `submit`
// would, in the same order, and never changes state. Accessible to the
// owning operator (the "check before submitting" flow) or any reviewer
// (the queue detail view's "all four gate results" per
// docs/04-frontend-spec.md) — never anyone else.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!isUuid(id)) return badRequest('id must be a valid UUID.')

  const isReviewer = hasReviewerHeader(request)
  const sessionOperator = isReviewer ? null : await getSessionOperator()
  if (!isReviewer && !sessionOperator) return unauthorized('Log in or provide X-Reviewer-Id.')

  const flightRequest = await fetchFlightRequestById(id)
  if (!flightRequest) return notFound('FlightRequest')

  if (!isReviewer && flightRequest.operator_id !== sessionOperator!.id) {
    return forbidden('Operators may only validate their own flight requests.')
  }

  const related = await loadRelatedEntities({
    operator_id: flightRequest.operator_id,
    pilot_id: flightRequest.pilot_id,
    aircraft_id: flightRequest.aircraft_id,
    zone_code: flightRequest.zone_code,
  })
  if (!related.ok) throw new Error(`FlightRequest ${id} references a missing ${related.missing}.`)

  const { operator, pilot, aircraft, zone } = related.entities
  const result = await evaluateGates(
    { operator, pilot, aircraft, zone, flightRequest, evaluatedAt: new Date() },
    { excludeRequestId: id }
  )

  if (!result.pass) return gateFailure(result)
  return ok({ ok: true })
}
