import { getSessionOperator } from '@/lib/auth'
import { fetchFlightRequestById } from '@/lib/flight-requests'
import { badRequest, conflict, forbidden, notFound, ok, unauthorized } from '@/lib/http'
import { canCancel, isPastCancellationDeadline } from '@/lib/state-machine'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { isUuid } from '@/lib/validation'

// Operator-only: withdrawing is an action on the caller's own request.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!isUuid(id)) return badRequest('id must be a valid UUID.')

  const sessionOperator = await getSessionOperator()
  if (!sessionOperator) return unauthorized('Log in to cancel a flight request.')

  const flightRequest = await fetchFlightRequestById(id)
  if (!flightRequest) return notFound('FlightRequest')

  if (flightRequest.operator_id !== sessionOperator.id) {
    return forbidden('Operators may only cancel their own flight requests.')
  }

  if (!canCancel(flightRequest.state)) {
    return conflict(`Cannot cancel a flight request in state ${flightRequest.state}.`)
  }

  if (flightRequest.state === 'APPROVED') {
    const windowStart = new Date(flightRequest.window_start)
    if (isPastCancellationDeadline(windowStart, new Date())) {
      return conflict('Cannot cancel an approved request less than 2 hours before window_start.')
    }
  }

  const { data, error } = await supabaseAdmin
    .from('flight_requests')
    .update({ state: 'CANCELLED' })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error

  return ok(data)
}
