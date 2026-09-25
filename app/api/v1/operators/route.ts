import { badRequest, created } from '@/lib/http'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { isNonEmptyString } from '@/lib/validation'

const MIN_PASSWORD_LENGTH = 8

// Doubles as registration: creates the Supabase Auth user and the linked
// Operator profile in one request, then signs the caller in (sets session
// cookies). This is what "Register an operator" (endpoint 1) grew into once
// operators needed real login — see docs/03-api-contract.md's
// "Authentication & authorisation" section. authorisation_level is no
// longer client-settable: self-registration always starts at L1
// (least privilege); raising it is an out-of-band admin action.
export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return badRequest('Request body must be valid JSON.')
  }

  if (!isNonEmptyString(body.legal_name)) return badRequest('legal_name is required.')
  if (!isNonEmptyString(body.national_id)) return badRequest('national_id is required.')
  if (!isNonEmptyString(body.email) || !body.email.includes('@')) {
    return badRequest('email is required and must be a valid email address.')
  }
  if (!isNonEmptyString(body.password) || body.password.length < MIN_PASSWORD_LENGTH) {
    return badRequest(`password is required and must be at least ${MIN_PASSWORD_LENGTH} characters.`)
  }
  for (const field of ['phone', 'address_line', 'city', 'postal_code'] as const) {
    if (body[field] !== undefined && body[field] !== null && typeof body[field] !== 'string') {
      return badRequest(`${field} must be a string.`)
    }
  }

  const email = body.email
  const password = body.password

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (authError) {
    return badRequest(authError.message)
  }

  const { data: operator, error: operatorError } = await supabaseAdmin
    .from('operators')
    .insert({
      id: authData.user.id,
      legal_name: body.legal_name,
      national_id: body.national_id,
      email,
      phone: body.phone ?? null,
      address_line: body.address_line ?? null,
      city: body.city ?? null,
      postal_code: body.postal_code ?? null,
      authorisation_level: 'L1',
    })
    .select('*')
    .single()

  if (operatorError) {
    // Don't leave an orphaned auth user behind if the profile insert fails.
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
    if (operatorError.code === '23505') {
      return badRequest('An operator with this national_id or email already exists.')
    }
    throw operatorError
  }

  const supabase = await createSupabaseServerClient()
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
  if (signInError) throw signInError

  return created(operator)
}
