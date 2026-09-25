import { getSessionOperator, hasReviewerHeader } from '@/lib/auth'
import { fetchFlightRequestById } from '@/lib/flight-requests'
import { badRequest, forbidden, notFound, ok, unauthorized } from '@/lib/http'
import { isUuid } from '@/lib/validation'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!isUuid(id)) return badRequest('id must be a valid UUID.')

  const isReviewer = hasReviewerHeader(request)
  const sessionOperator = isReviewer ? null : await getSessionOperator()
  if (!isReviewer && !sessionOperator) return unauthorized('Log in or provide X-Reviewer-Id.')

  const flightRequest = await fetchFlightRequestById(id)
  if (!flightRequest) return notFound('FlightRequest')

  if (!isReviewer && flightRequest.operator_id !== sessionOperator!.id) {
    return forbidden('Operators may only view their own flight requests.')
  }

  return ok(flightRequest)
}
