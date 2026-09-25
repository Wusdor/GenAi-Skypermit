import { getSessionOperator } from '@/lib/auth'
import { computeWeightBand } from '@/lib/derived'
import { badRequest, created, ok, unauthorized } from '@/lib/http'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { isNonEmptyString, isPositiveInteger } from '@/lib/validation'

// docs/06-business-rules.md §3 (OH-1 §3): not accepted for registration
// under any circumstance above 30,000g. Enforced here, before the aircraft
// row (and therefore any gate) exists.
const MAX_MTOM_GRAMS = 30_000

// Not one of the original 16 in docs/03-api-contract.md — added for the
// same reason as GET /pilots above: no way existed to list aircraft, and
// the frontend needs both a registry list and an operator-scoped picker.
//
// operator_id is no longer a query param (was, before operator auth): this
// always lists the logged-in operator's own aircraft, derived from the
// session — see docs/03-api-contract.md's "Authentication & authorisation".
export async function GET() {
  const operator = await getSessionOperator()
  if (!operator) return unauthorized('Log in to view your aircraft.')

  const { data, error } = await supabaseAdmin
    .from('aircraft')
    .select('*')
    .eq('operator_id', operator.id)
    .order('manufacturer')
  if (error) throw error

  return ok(data.map((aircraft) => ({ ...aircraft, weight_band: computeWeightBand(aircraft.mtom_grams) })))
}

export async function POST(request: Request) {
  const operator = await getSessionOperator()
  if (!operator) return unauthorized('Log in to register an aircraft.')

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return badRequest('Request body must be valid JSON.')
  }

  if (!isNonEmptyString(body.manufacturer)) return badRequest('manufacturer is required.')
  if (!isNonEmptyString(body.model)) return badRequest('model is required.')
  if (!isNonEmptyString(body.serial_number)) return badRequest('serial_number is required.')
  if (!isPositiveInteger(body.mtom_grams)) return badRequest('mtom_grams is required and must be a positive integer.')
  if ((body.mtom_grams as number) > MAX_MTOM_GRAMS) {
    return badRequest(`mtom_grams exceeds the ${MAX_MTOM_GRAMS}g registration ceiling.`)
  }

  const { data, error } = await supabaseAdmin
    .from('aircraft')
    .insert({
      operator_id: operator.id,
      manufacturer: body.manufacturer,
      model: body.model,
      serial_number: body.serial_number,
      mtom_grams: body.mtom_grams,
    })
    .select('*')
    .single()

  if (error) {
    if (error.code === '23505') return badRequest('An aircraft with this serial_number already exists.')
    throw error
  }

  return created(data)
}
