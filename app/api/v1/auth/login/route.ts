import { badRequest, ok, unauthorized } from '@/lib/http'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { isNonEmptyString } from '@/lib/validation'

// Not one of the original 16 in docs/03-api-contract.md — there was no
// concept of "logging in" before operators got real auth. See that doc's
// "Authentication & authorisation" section.
export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return badRequest('Request body must be valid JSON.')
  }

  if (!isNonEmptyString(body.email)) return badRequest('email is required.')
  if (!isNonEmptyString(body.password)) return badRequest('password is required.')

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.signInWithPassword({ email: body.email, password: body.password })
  if (error) return unauthorized('Invalid email or password.')

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: operator, error: operatorError } = await supabaseAdmin
    .from('operators')
    .select('*')
    .eq('id', user!.id)
    .maybeSingle()
  if (operatorError) throw operatorError
  if (!operator) {
    await supabase.auth.signOut()
    return unauthorized('No operator profile is linked to this account.')
  }

  return ok(operator)
}
